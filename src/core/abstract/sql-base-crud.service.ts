// Drizzle imports
import {
	and,
	asc,
	desc,
	eq,
	gt,
	gte,
	ilike,
	inArray,
	isNotNull,
	isNull,
	like,
	lt,
	lte,
	ne,
	sql,
} from "drizzle-orm";
import {
	BulkOperationException,
	EntityNotFoundException,
} from "../../exceptions/crud.exceptions";
import {
	ICrudService,
	PaginationOptions,
} from "../interfaces/crud-service.interface";
import {
	SqlCrudConfig,
	SqlOperationOptions,
} from "../interfaces/sql-crud-config.interface";

export abstract class SqlBaseCrudService<
	T extends Record<string, any>,
	CreateDto,
	UpdateDto,
	FilterDto,
> implements ICrudService<T, CreateDto, UpdateDto, FilterDto>
{
	protected readonly defaultConfig: SqlCrudConfig = {
		dialect: "postgresql",
		db: null,
		table: null,
		primaryKey: "id",
		primaryKeyType: "serial",
		softDelete: { enabled: true, column: "deleted_at" },
		timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
		pagination: { defaultLimit: 20, maxLimit: 100 },
		sql: {
			caseSensitive: false,
			useReturning: true,
			jsonSupport: true,
			enableFullTextSearch: false,
		},
	};
	protected buildWhereConditionsFromPartial(where: Partial<T>): any[] {
		if (!where) return [];

		const conditions: any[] = [];

		for (const [key, value] of Object.entries(where)) {
			if (value === undefined || value === null) continue;

			const column = this.config.table[key];
			if (!column) continue;

			// For Partial<T>, we only support simple equality checks
			conditions.push(eq(column, value));
		}

		return conditions;
	}
	constructor(protected readonly config: SqlCrudConfig) {
		this.config = { ...this.defaultConfig, ...config };
		this.validateConfiguration();
	}

	private validateConfiguration(): void {
		if (!this.config.db) throw new Error("Database instance is required");
		if (!this.config.table) throw new Error("Table configuration is required");

		if (this.config.dialect === "mysql" && this.config.sql?.useReturning) {
			console.warn(
				"MySQL does not support RETURNING clause, disabling useReturning",
			);
			this.config.sql.useReturning = false;
		}
	}

	// Abstract methods
	protected abstract validateCreate(data: CreateDto): Promise<void>;
	protected abstract validateUpdate(id: any, data: UpdateDto): Promise<void>;
	protected abstract mapCreateDtoToEntity(data: CreateDto): Record<string, any>;
	protected abstract mapUpdateDtoToEntity(data: UpdateDto): Record<string, any>;

	// Optional hooks
	protected async beforeCreate(data: CreateDto): Promise<CreateDto> {
		return data;
	}
	protected async afterCreate(entity: T): Promise<void> {}
	protected async beforeUpdate(id: any, data: UpdateDto): Promise<UpdateDto> {
		return data;
	}
	protected async afterUpdate(entity: T): Promise<void> {}
	protected async beforeDelete(id: any): Promise<void> {}
	protected async afterDelete(id: any): Promise<void> {}
	protected async beforeSoftDelete(id: any): Promise<void> {}
	protected async afterSoftDelete(id: any): Promise<void> {}
	protected async beforeRestore(id: any): Promise<void> {}
	protected async afterRestore(entity: T): Promise<void> {}

	// Single Operations
	async find(id: any, options?: SqlOperationOptions): Promise<T | null> {
		const { transaction, relations = [], select = [] } = options || {};
		const db = transaction || this.config.db;

		let query = db.select().from(this.config.table);
		const conditions = [eq(this.config.table[this.config.primaryKey], id)];

		if (this.config.softDelete?.enabled) {
			conditions.push(isNull(this.config.table[this.config.softDelete.column]));
		}

		query = query.where(and(...conditions));

		if (select.length > 0) {
			const fields = select.reduce((acc, field) => {
				acc[field] = this.config.table[field];
				return acc;
			}, {} as any);
			query = query.fields(fields);
		}

		if (relations.length > 0) {
			query = this.applyRelations(query, relations);
		}

		query = query.limit(1);
		const result = await query;
		return result[0] || null;
	}

	async findOne(
		where: Partial<T>,
		options?: SqlOperationOptions,
	): Promise<T | null> {
		const { transaction, relations = [], select = [] } = options || {};
		const db = transaction || this.config.db;
		let query = db.select().from(this.config.table);

		// Build WHERE conditions from Partial<T>
		const conditions = this.buildWhereConditionsFromPartial(where);

		if (this.config.softDelete?.enabled) {
			conditions.push(isNull(this.config.table[this.config.softDelete.column]));
		}

		query = query.where(and(...conditions));

		if (select.length > 0) {
			const fields = select.reduce((acc, field) => {
				acc[field] = this.config.table[field];
				return acc;
			}, {} as any);
			query = query.fields(fields);
		}

		if (relations.length > 0) {
			query = this.applyRelations(query, relations);
		}

		query = query.limit(1);
		const result = await query;
		return result[0] || null;
	}

	async findAll(
		filters?: FilterDto,
		pagination?: PaginationOptions,
		options?: SqlOperationOptions,
	): Promise<{ data: T[]; total: number; page: number; limit: number }> {
		const { transaction, relations = [], select = [] } = options || {};
		const {
			page = 1,
			limit = this.config.pagination!.defaultLimit!,
			sortBy,
			sortOrder = "desc",
		} = pagination || {};

		const safeLimit = Math.min(limit, this.config.pagination!.maxLimit!);
		const offset = (page - 1) * safeLimit;
		const db = transaction || this.config.db;

		let dataQuery = db.select().from(this.config.table);
		const conditions = this.buildWhereConditions(filters);

		if (this.config.softDelete?.enabled) {
			conditions.push(isNull(this.config.table[this.config.softDelete.column]));
		}

		if (conditions.length > 0) {
			dataQuery = dataQuery.where(and(...conditions));
		}

		if (sortBy && this.config.table[sortBy]) {
			dataQuery = dataQuery.orderBy(
				sortOrder === "desc"
					? desc(this.config.table[sortBy])
					: asc(this.config.table[sortBy]),
			);
		}

		dataQuery = dataQuery.limit(safeLimit).offset(offset);

		if (relations.length > 0) {
			dataQuery = this.applyRelations(dataQuery, relations);
		}

		if (select.length > 0) {
			const fields = select.reduce((acc, field) => {
				acc[field] = this.config.table[field];
				return acc;
			}, {} as any);
			dataQuery = dataQuery.fields(fields);
		}

		let countQuery = db
			.select({ count: sql<number>`count(*)` })
			.from(this.config.table);
		if (conditions.length > 0) {
			countQuery = countQuery.where(and(...conditions));
		}

		const [data, totalResult] = await Promise.all([dataQuery, countQuery]);
		const total = parseInt(totalResult[0]?.count?.toString() || "0");

		return { data, total, page, limit: safeLimit };
	}

	async create(data: CreateDto, options?: SqlOperationOptions): Promise<T> {
		const { transaction, hooks = {} } = options || {};
		await this.validateCreate(data);
		const processedData = hooks.skipBefore
			? data
			: await this.beforeCreate(data);
		const entityData = this.mapCreateDtoToEntity(processedData);

		const now = new Date();
		if (this.config.timestamps?.createdAt)
			entityData[this.config.timestamps.createdAt] = now;
		if (this.config.timestamps?.updatedAt)
			entityData[this.config.timestamps.updatedAt] = now;

		const db = transaction || this.config.db;
		let insertQuery = db.insert(this.config.table).values(entityData);

		if (this.config.sql?.useReturning) {
			insertQuery = insertQuery.returning();
			const result = await insertQuery;
			const createdEntity = result[0];
			if (!hooks.skipAfter) await this.afterCreate(createdEntity);
			return createdEntity;
		} else {
			const result = await insertQuery;
			const lastInsertId = result[0].insertId;
			const createdEntity = await this.find(lastInsertId, options);
			if (!createdEntity) throw new Error("Failed to create entity");
			if (!hooks.skipAfter) await this.afterCreate(createdEntity);
			return createdEntity;
		}
	}

	async update(
		id: any,
		data: UpdateDto,
		options?: SqlOperationOptions,
	): Promise<T> {
		const { transaction, hooks = {} } = options || {};
		const existing = await this.find(id, options);
		if (!existing) throw new EntityNotFoundException(this.getEntityName(), id);

		await this.validateUpdate(id, data);
		const processedData = hooks.skipBefore
			? data
			: await this.beforeUpdate(id, data);
		const entityData = this.mapUpdateDtoToEntity(processedData);

		if (this.config.timestamps?.updatedAt) {
			entityData[this.config.timestamps.updatedAt] = new Date();
		}

		const db = transaction || this.config.db;
		let updateQuery = db
			.update(this.config.table)
			.set(entityData)
			.where(eq(this.config.table[this.config.primaryKey], id));

		if (this.config.sql?.useReturning) {
			updateQuery = updateQuery.returning();
			const result = await updateQuery;
			const updatedEntity = result[0];
			if (!hooks.skipAfter) await this.afterUpdate(updatedEntity);
			return updatedEntity;
		} else {
			await updateQuery;
			const updatedEntity = await this.find(id, options);
			if (!updatedEntity) throw new Error("Failed to update entity");
			if (!hooks.skipAfter) await this.afterUpdate(updatedEntity);
			return updatedEntity;
		}
	}

	async softDelete(id: any, options?: SqlOperationOptions): Promise<boolean> {
		if (!this.config.softDelete?.enabled) {
			throw new Error("Soft delete is not enabled for this entity");
		}

		const { transaction, hooks = {} } = options || {};
		const existing = await this.find(id, options);
		if (!existing) throw new EntityNotFoundException(this.getEntityName(), id);

		if (!hooks.skipBefore) await this.beforeSoftDelete(id);

		const db = transaction || this.config.db;
		const updateData = {
			[this.config.softDelete.column]: new Date(),
			...(this.config.timestamps?.updatedAt && {
				[this.config.timestamps.updatedAt]: new Date(),
			}),
		};

		let updateQuery = db
			.update(this.config.table)
			.set(updateData)
			.where(eq(this.config.table[this.config.primaryKey], id));

		if (this.config.sql?.useReturning) updateQuery = updateQuery.returning();
		const result = await updateQuery;
		const success = Array.isArray(result)
			? result.length > 0
			: result[0].affectedRows > 0;

		if (success && !hooks.skipAfter) await this.afterSoftDelete(id);
		return success;
	}

	async restore(id: any, options?: SqlOperationOptions): Promise<T> {
		if (!this.config.softDelete?.enabled) {
			throw new Error("Soft delete is not enabled for this entity");
		}

		const { transaction, hooks = {} } = options || {};
		if (!hooks.skipBefore) await this.beforeRestore(id);

		const db = transaction || this.config.db;
		const updateData = {
			[this.config.softDelete!.column]: null,
			...(this.config.timestamps?.updatedAt && {
				[this.config.timestamps.updatedAt]: new Date(),
			}),
		};

		let updateQuery = db
			.update(this.config.table)
			.set(updateData)
			.where(eq(this.config.table[this.config.primaryKey], id));

		if (this.config.sql?.useReturning) {
			updateQuery = updateQuery.returning();
			const result = await updateQuery;
			if (result.length === 0)
				throw new EntityNotFoundException(this.getEntityName(), id);
			const restoredEntity = result[0];
			if (!hooks.skipAfter) await this.afterRestore(restoredEntity);
			return restoredEntity;
		} else {
			await updateQuery;
			const restoredEntity = await this.find(id, options);
			if (!restoredEntity)
				throw new EntityNotFoundException(this.getEntityName(), id);
			if (!hooks.skipAfter) await this.afterRestore(restoredEntity);
			return restoredEntity;
		}
	}

	async delete(id: any, options?: SqlOperationOptions): Promise<boolean> {
		const { transaction, hooks = {} } = options || {};
		const existing = await this.find(id, options);
		if (!existing) throw new EntityNotFoundException(this.getEntityName(), id);

		if (!hooks.skipBefore) await this.beforeDelete(id);

		const db = transaction || this.config.db;
		const deleteQuery = db
			.delete(this.config.table)
			.where(eq(this.config.table[this.config.primaryKey], id));

		const result = await deleteQuery;
		const success = Array.isArray(result)
			? result.length > 0
			: result[0].affectedRows > 0;

		if (success && !hooks.skipAfter) await this.afterDelete(id);
		return success;
	}

	// Bulk Operations
	async massCreate(
		data: CreateDto[],
		options?: SqlOperationOptions,
	): Promise<T[]> {
		return this.executeSqlTransaction(async (tx) => {
			const results: T[] = [];
			const errors: Array<{ index: number; error: Error }> = [];

			for (let i = 0; i < data.length; i++) {
				try {
					const result = await this.create(data[i], {
						...options,
						transaction: tx,
					});
					results.push(result);
				} catch (error) {
					errors.push({ index: i, error: error as Error });
				}
			}

			if (errors.length > 0)
				throw new BulkOperationException("Mass create errors", errors);
			return results;
		}, options?.transaction);
	}

	async massUpdate(
		ids: any[],
		data: UpdateDto,
		options?: SqlOperationOptions,
	): Promise<T[]> {
		return this.executeSqlTransaction(async (tx) => {
			const results: T[] = [];
			const errors: Array<{ id: any; error: Error }> = [];

			for (const id of ids) {
				try {
					const result = await this.update(id, data, {
						...options,
						transaction: tx,
					});
					results.push(result);
				} catch (error) {
					errors.push({ id, error: error as Error });
				}
			}

			if (errors.length > 0)
				throw new BulkOperationException("Mass update errors", errors);
			return results;
		}, options?.transaction);
	}

	async massSoftDelete(
		ids: any[],
		options?: SqlOperationOptions,
	): Promise<boolean> {
		if (!this.config.softDelete?.enabled)
			throw new Error("Soft delete not enabled");
		return this.executeSqlTransaction(async (tx) => {
			const errors: Array<{ id: any; error: Error }> = [];
			for (const id of ids) {
				try {
					await this.softDelete(id, { ...options, transaction: tx });
				} catch (error) {
					errors.push({ id, error: error as Error });
				}
			}
			if (errors.length > 0)
				throw new BulkOperationException("Mass soft delete errors", errors);
			return true;
		}, options?.transaction);
	}

	async massRestore(ids: any[], options?: SqlOperationOptions): Promise<T[]> {
		if (!this.config.softDelete?.enabled)
			throw new Error("Soft delete not enabled");
		return this.executeSqlTransaction(async (tx) => {
			const results: T[] = [];
			const errors: Array<{ id: any; error: Error }> = [];
			for (const id of ids) {
				try {
					const result = await this.restore(id, {
						...options,
						transaction: tx,
					});
					results.push(result);
				} catch (error) {
					errors.push({ id, error: error as Error });
				}
			}
			if (errors.length > 0)
				throw new BulkOperationException("Mass restore errors", errors);
			return results;
		}, options?.transaction);
	}

	async massDelete(
		ids: any[],
		options?: SqlOperationOptions,
	): Promise<boolean> {
		return this.executeSqlTransaction(async (tx) => {
			const errors: Array<{ id: any; error: Error }> = [];
			for (const id of ids) {
				try {
					await this.delete(id, { ...options, transaction: tx });
				} catch (error) {
					errors.push({ id, error: error as Error });
				}
			}
			if (errors.length > 0)
				throw new BulkOperationException("Mass delete errors", errors);
			return true;
		}, options?.transaction);
	}

	// Utility Methods
	async exists(id: any, options?: SqlOperationOptions): Promise<boolean> {
		const entity = await this.find(id, {
			...options,
			select: [this.config.primaryKey],
		});
		return !!entity;
	}

	async count(
		filters?: FilterDto,
		options?: SqlOperationOptions,
	): Promise<number> {
		const { transaction } = options || {};
		const db = transaction || this.config.db;
		let query = db
			.select({ count: sql<number>`count(*)` })
			.from(this.config.table);
		const conditions = this.buildWhereConditions(filters);

		if (this.config.softDelete?.enabled) {
			conditions.push(isNull(this.config.table[this.config.softDelete.column]));
		}

		if (conditions.length > 0) query = query.where(and(...conditions));
		const result = await query;
		return parseInt(result[0]?.count?.toString() || "0");
	}

	// Protected Helper Methods
	protected buildWhereConditions(filters?: any): any[] {
		if (!filters) return [];
		const conditions: any[] = [];

		for (const [key, value] of Object.entries(filters)) {
			if (value === undefined || value === null) continue;
			const column = this.config.table[key];
			if (!column) continue;

			if (Array.isArray(value)) {
				conditions.push(inArray(column, value));
			} else if (
				typeof value === "string" &&
				this.config.sql?.caseSensitive === false
			) {
				conditions.push(ilike(column, `%${value}%`));
			} else if (typeof value === "object" && value !== null) {
				this.applyComplexFilter(conditions, column, value);
			} else {
				conditions.push(eq(column, value));
			}
		}
		return conditions;
	}

	protected applyComplexFilter(
		conditions: any[],
		column: any,
		filterObj: any,
	): void {
		for (const [op, value] of Object.entries(filterObj)) {
			switch (op) {
				case "gt":
					conditions.push(gt(column, value));
					break;
				case "gte":
					conditions.push(gte(column, value));
					break;
				case "lt":
					conditions.push(lt(column, value));
					break;
				case "lte":
					conditions.push(lte(column, value));
					break;
				case "neq":
					conditions.push(ne(column, value));
					break;
				case "like":
					conditions.push(like(column, `%${value}%`));
					break;
				case "ilike":
					conditions.push(ilike(column, `%${value}%`));
					break;
				case "in":
					conditions.push(inArray(column, value as any[]));
					break;
				case "isNull":
					conditions.push(isNull(column));
					break;
				case "isNotNull":
					conditions.push(isNotNull(column));
					break;
			}
		}
	}

	protected applyRelations(query: any, relations: string[]): any {
		// Placeholder for Drizzle relation implementation
		return query;
	}

	protected async executeSqlTransaction<R>(
		operation: (tx: any) => Promise<R>,
		existingTransaction?: any,
	): Promise<R> {
		if (existingTransaction) return operation(existingTransaction);
		return this.config.db.transaction(operation);
	}

	protected getEntityName(): string {
		return this.config.table.constructor.name || "Entity";
	}

	// SQL-Specific Enhancements
	async fullTextSearch(
		searchTerm: string,
		searchColumns: string[],
		pagination?: PaginationOptions,
		options?: SqlOperationOptions,
	): Promise<{ data: T[]; total: number }> {
		if (this.config.dialect !== "postgresql") {
			throw new Error("Full-text search only supported in PostgreSQL");
		}

		const { transaction } = options || {};
		const db = transaction || this.config.db;
		const tsVectorColumns = searchColumns
			.map((col) => sql`to_tsvector('english', ${this.config.table[col]})`)
			.join(" || ");
		const tsQuery = sql`plainto_tsquery('english', ${searchTerm})`;

		let query = db
			.select()
			.from(this.config.table)
			.where(sql`${sql.raw(tsVectorColumns)} @@ ${tsQuery}`)
			.orderBy(sql`ts_rank(${sql.raw(tsVectorColumns)}, ${tsQuery}) DESC`);

		if (pagination) {
			const { page = 1, limit = this.config.pagination!.defaultLimit! } =
				pagination;
			const safeLimit = Math.min(limit, this.config.pagination!.maxLimit!);
			const offset = (page - 1) * safeLimit;
			query = query.limit(safeLimit).offset(offset);
		}

		const data = await query;
		const countQuery = db
			.select({ count: sql<number>`count(*)` })
			.from(this.config.table)
			.where(sql`${sql.raw(tsVectorColumns)} @@ ${tsQuery}`);
		const totalResult = await countQuery;
		const total = parseInt(totalResult[0]?.count?.toString() || "0");

		return { data, total };
	}
}
