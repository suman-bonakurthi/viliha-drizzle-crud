// Drizzle imports
import {
	and,
	asc,
	desc,
	eq,
	getTableColumns,
	getTableName,
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
	// Builds a Drizzle partial-select field map from a list of column names.
	// Returns undefined when no selection is requested (select all columns).
	protected buildSelectFields(
		select: string[],
	): Record<string, any> | undefined {
		if (!select || select.length === 0) return undefined;
		const fields: Record<string, any> = {};
		for (const field of select) {
			const column = this.config.table[field];
			if (column) fields[field] = column;
		}
		return Object.keys(fields).length > 0 ? fields : undefined;
	}

	// Normalizes the various driver result shapes (postgres-js, node-postgres,
	// mysql2) into a simple "did this mutation affect any rows" boolean.
	protected wasAffected(result: any): boolean {
		if (result == null) return false;
		if (Array.isArray(result)) {
			// postgres-js exposes affected count on `.count`; otherwise use rows.
			if (typeof (result as any).count === "number")
				return (result as any).count > 0;
			// mysql2 returns [ResultSetHeader, ...]
			if (result[0] && typeof result[0].affectedRows === "number")
				return result[0].affectedRows > 0;
			return result.length > 0;
		}
		if (typeof result.rowCount === "number") return result.rowCount > 0; // node-postgres
		if (typeof result.rowsAffected === "number") return result.rowsAffected > 0;
		if (typeof result.affectedRows === "number") return result.affectedRows > 0;
		return false;
	}

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

	// Overridable hooks for validation and DTO -> entity mapping. Defaults are
	// no-op / pass-through so a concrete service only needs to declare its
	// table; override these when an entity needs custom behaviour.
	protected async validateCreate(_data: CreateDto): Promise<void> {}
	protected async validateUpdate(_id: any, _data: UpdateDto): Promise<void> {}
	protected mapCreateDtoToEntity(data: CreateDto): Record<string, any> {
		return { ...(data as Record<string, any>) };
	}
	protected mapUpdateDtoToEntity(data: UpdateDto): Record<string, any> {
		return { ...(data as Record<string, any>) };
	}

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

	// ---- Relation helpers (many-to-one / belongs-to) ----

	// Keep only the requested relation names that are actually configured.
	protected eagerRelations(relations: string[]): string[] {
		const configured = this.config.relations || {};
		return (relations || []).filter((name) => !!configured[name]);
	}

	// Build the SELECT projection: base columns (optionally narrowed by
	// `select`) plus a nested object of columns for each eager relation.
	protected buildSelection(
		select: string[],
		eager: string[],
	): Record<string, any> {
		const allColumns = getTableColumns(this.config.table);
		let base: Record<string, any>;
		if (select && select.length > 0) {
			base = {};
			for (const field of select) {
				if (allColumns[field]) base[field] = allColumns[field];
			}
		} else {
			base = { ...allColumns };
		}
		const configured = this.config.relations || {};
		for (const name of eager) {
			const rel = configured[name];
			if (rel) base[name] = getTableColumns(rel.table);
		}
		return base;
	}

	// Start a SELECT with the right projection. An explicit projection is needed
	// whenever a JOIN is applied (eager load OR relation filter) — otherwise a
	// plain `select()` + join makes Drizzle nest rows per table
	// ({ table: {...}, joined: {...} }). When there are no joins this matches the
	// original all-columns / partial-select behaviour.
	protected startSelect(
		db: any,
		select: string[],
		eager: string[],
		hasJoins = false,
	): any {
		if (eager.length > 0 || hasJoins) {
			return db
				.select(this.buildSelection(select, eager))
				.from(this.config.table);
		}
		const fields = this.buildSelectFields(select);
		return fields
			? db.select(fields).from(this.config.table)
			: db.select().from(this.config.table);
	}

	// LEFT JOIN each named relation onto the query.
	protected applyJoins(query: any, relationNames: string[]): any {
		const configured = this.config.relations || {};
		let q = query;
		for (const name of relationNames) {
			const rel = configured[name];
			if (!rel) continue;
			q = q.leftJoin(
				rel.table,
				eq(
					this.config.table[rel.localKey],
					rel.table[rel.references ?? "id"],
				),
			);
		}
		return q;
	}

	// A LEFT JOIN with no match yields a relation object full of nulls; collapse
	// those to a single `null` so callers get a clean shape.
	protected normalizeRelations(rows: any[], eager: string[]): any[] {
		if (!eager.length || !Array.isArray(rows)) return rows;
		return rows.map((row) => {
			if (!row || typeof row !== "object") return row;
			const out = { ...row };
			for (const name of eager) {
				const related = out[name];
				if (
					related &&
					typeof related === "object" &&
					Object.values(related).every((v) => v === null)
				) {
					out[name] = null;
				}
			}
			return out;
		});
	}

	// Single Operations
	async find(id: any, options?: SqlOperationOptions): Promise<T | null> {
		const { transaction, relations = [], select = [] } = options || {};
		const db = transaction || this.config.db;
		const eager = this.eagerRelations(relations);

		const conditions = [eq(this.config.table[this.config.primaryKey], id)];
		if (this.config.softDelete?.enabled) {
			conditions.push(isNull(this.config.table[this.config.softDelete.column]));
		}

		let query = this.startSelect(db, select, eager);
		query = this.applyJoins(query, eager)
			.where(and(...conditions))
			.limit(1);

		const result = await query;
		return this.normalizeRelations(result, eager)[0] || null;
	}

	async findOne(
		where: Partial<T>,
		options?: SqlOperationOptions,
	): Promise<T | null> {
		const { transaction, relations = [], select = [] } = options || {};
		const db = transaction || this.config.db;
		const eager = this.eagerRelations(relations);

		const conditions = this.buildWhereConditionsFromPartial(where);
		if (this.config.softDelete?.enabled) {
			conditions.push(isNull(this.config.table[this.config.softDelete.column]));
		}

		let query = this.startSelect(db, select, eager);
		query = this.applyJoins(query, eager)
			.where(and(...conditions))
			.limit(1);

		const result = await query;
		return this.normalizeRelations(result, eager)[0] || null;
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
		const eager = this.eagerRelations(relations);

		const { conditions, relations: filterRelations } =
			this.buildFilterConditions(filters);
		if (this.config.softDelete?.enabled) {
			conditions.push(isNull(this.config.table[this.config.softDelete.column]));
		}

		// Join everything needed for eager-loading and for relation filters.
		const joinRelations = Array.from(
			new Set([...eager, ...filterRelations]),
		);

		let dataQuery = this.startSelect(
			db,
			select,
			eager,
			joinRelations.length > 0,
		);
		dataQuery = this.applyJoins(dataQuery, joinRelations);
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

		let countQuery = db
			.select({ count: sql<number>`count(*)` })
			.from(this.config.table);
		// Count only needs the relations used for filtering, not eager loads.
		countQuery = this.applyJoins(countQuery, filterRelations);
		if (conditions.length > 0) {
			countQuery = countQuery.where(and(...conditions));
		}

		const [data, totalResult] = await Promise.all([dataQuery, countQuery]);
		const total = parseInt(totalResult[0]?.count?.toString() || "0");

		return {
			data: this.normalizeRelations(data, eager),
			total,
			page,
			limit: safeLimit,
		};
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
			// Without RETURNING (e.g. MySQL): prefer a client-supplied primary key
			// (required for uuid / non-auto-increment keys), otherwise fall back
			// to the driver's auto-increment insertId.
			const lastInsertId =
				entityData[this.config.primaryKey] ?? result?.[0]?.insertId;
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
		const success = this.wasAffected(result);

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
		const success = this.wasAffected(result);

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
		const { conditions, relations: filterRelations } =
			this.buildFilterConditions(filters);

		if (this.config.softDelete?.enabled) {
			conditions.push(isNull(this.config.table[this.config.softDelete.column]));
		}

		query = this.applyJoins(query, filterRelations);
		if (conditions.length > 0) query = query.where(and(...conditions));
		const result = await query;
		return parseInt(result[0]?.count?.toString() || "0");
	}

	// Protected Helper Methods

	// Build a single column condition from a filter value:
	//   array            -> IN (...)
	//   string           -> case-insensitive exact match (when sql.caseSensitive
	//                        is false) or eq
	//   { op: value, ... } -> comparison/pattern operators (see applyComplexFilter)
	//   scalar           -> eq
	protected pushColumnCondition(
		conditions: any[],
		column: any,
		value: any,
	): void {
		if (Array.isArray(value)) {
			conditions.push(inArray(column, value));
		} else if (
			typeof value === "string" &&
			this.config.sql?.caseSensitive === false
		) {
			// Case-insensitive *exact* match. Use the `{ like: ... }` /
			// `{ ilike: ... }` operators explicitly for pattern matching.
			conditions.push(ilike(column, value));
		} else if (typeof value === "object" && value !== null) {
			this.applyComplexFilter(conditions, column, value);
		} else {
			conditions.push(eq(column, value));
		}
	}

	// Build WHERE conditions from a filter object. A key matching a configured
	// relation, with an object value, filters by the related table's columns
	// (e.g. { state: { name: 'X', country_id: 1 } }) and the relation name is
	// returned so the caller can JOIN it. Returns both the conditions and the
	// set of relations that must be joined.
	protected buildFilterConditions(filters?: any): {
		conditions: any[];
		relations: string[];
	} {
		const conditions: any[] = [];
		const relations: string[] = [];
		if (!filters) return { conditions, relations };

		const relConfig = this.config.relations || {};

		for (const [key, value] of Object.entries(filters)) {
			if (value === undefined || value === null) continue;

			const relation = relConfig[key];
			if (relation && typeof value === "object" && !Array.isArray(value)) {
				let used = false;
				for (const [col, colValue] of Object.entries(value)) {
					if (colValue === undefined || colValue === null) continue;
					const relColumn = relation.table[col];
					if (!relColumn) continue;
					this.pushColumnCondition(conditions, relColumn, colValue);
					used = true;
				}
				if (used) relations.push(key);
				continue;
			}

			const column = this.config.table[key];
			if (!column) continue;
			this.pushColumnCondition(conditions, column, value);
		}

		return { conditions, relations };
	}

	protected buildWhereConditions(filters?: any): any[] {
		return this.buildFilterConditions(filters).conditions;
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
					// Caller supplies the pattern (e.g. 'John%'); do not re-wrap.
					conditions.push(like(column, value as string));
					break;
				case "ilike":
					conditions.push(ilike(column, value as string));
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

	protected async executeSqlTransaction<R>(
		operation: (tx: any) => Promise<R>,
		existingTransaction?: any,
	): Promise<R> {
		if (existingTransaction) return operation(existingTransaction);
		return this.config.db.transaction(operation);
	}

	protected getEntityName(): string {
		// Resolve the real table name from the Drizzle table metadata. Falls back
		// to "Entity" for plain-object tables (e.g. in tests) where the Drizzle
		// metadata symbols are absent.
		try {
			return getTableName(this.config.table) || "Entity";
		} catch {
			return "Entity";
		}
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
		// Combine the per-column tsvectors into a single SQL expression. Using
		// sql.join keeps the column references as bound SQL chunks instead of
		// stringifying them (which Array#join + sql.raw did, producing invalid
		// SQL and an injection vector).
		const tsVector = sql.join(
			searchColumns.map(
				(col) => sql`to_tsvector('english', ${this.config.table[col]})`,
			),
			sql` || `,
		);
		const tsQuery = sql`plainto_tsquery('english', ${searchTerm})`;

		let query = db
			.select()
			.from(this.config.table)
			.where(sql`${tsVector} @@ ${tsQuery}`)
			.orderBy(sql`ts_rank(${tsVector}, ${tsQuery}) DESC`);

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
			.where(sql`${tsVector} @@ ${tsQuery}`);
		const totalResult = await countQuery;
		const total = parseInt(totalResult[0]?.count?.toString() || "0");

		return { data, total };
	}
}
