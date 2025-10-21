"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlBaseCrudService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const crud_exceptions_1 = require("../../exceptions/crud.exceptions");
class SqlBaseCrudService {
    config;
    defaultConfig = {
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
    buildWhereConditionsFromPartial(where) {
        if (!where)
            return [];
        const conditions = [];
        for (const [key, value] of Object.entries(where)) {
            if (value === undefined || value === null)
                continue;
            const column = this.config.table[key];
            if (!column)
                continue;
            conditions.push((0, drizzle_orm_1.eq)(column, value));
        }
        return conditions;
    }
    constructor(config) {
        this.config = config;
        this.config = { ...this.defaultConfig, ...config };
        this.validateConfiguration();
    }
    validateConfiguration() {
        if (!this.config.db)
            throw new Error("Database instance is required");
        if (!this.config.table)
            throw new Error("Table configuration is required");
        if (this.config.dialect === "mysql" && this.config.sql?.useReturning) {
            console.warn("MySQL does not support RETURNING clause, disabling useReturning");
            this.config.sql.useReturning = false;
        }
    }
    async beforeCreate(data) {
        return data;
    }
    async afterCreate(entity) { }
    async beforeUpdate(id, data) {
        return data;
    }
    async afterUpdate(entity) { }
    async beforeDelete(id) { }
    async afterDelete(id) { }
    async beforeSoftDelete(id) { }
    async afterSoftDelete(id) { }
    async beforeRestore(id) { }
    async afterRestore(entity) { }
    async find(id, options) {
        const { transaction, relations = [], select = [] } = options || {};
        const db = transaction || this.config.db;
        let query = db.select().from(this.config.table);
        const conditions = [(0, drizzle_orm_1.eq)(this.config.table[this.config.primaryKey], id)];
        if (this.config.softDelete?.enabled) {
            conditions.push((0, drizzle_orm_1.isNull)(this.config.table[this.config.softDelete.column]));
        }
        query = query.where((0, drizzle_orm_1.and)(...conditions));
        if (select.length > 0) {
            const fields = select.reduce((acc, field) => {
                acc[field] = this.config.table[field];
                return acc;
            }, {});
            query = query.fields(fields);
        }
        if (relations.length > 0) {
            query = this.applyRelations(query, relations);
        }
        query = query.limit(1);
        const result = await query;
        return result[0] || null;
    }
    async findOne(where, options) {
        const { transaction, relations = [], select = [] } = options || {};
        const db = transaction || this.config.db;
        let query = db.select().from(this.config.table);
        const conditions = this.buildWhereConditionsFromPartial(where);
        if (this.config.softDelete?.enabled) {
            conditions.push((0, drizzle_orm_1.isNull)(this.config.table[this.config.softDelete.column]));
        }
        query = query.where((0, drizzle_orm_1.and)(...conditions));
        if (select.length > 0) {
            const fields = select.reduce((acc, field) => {
                acc[field] = this.config.table[field];
                return acc;
            }, {});
            query = query.fields(fields);
        }
        if (relations.length > 0) {
            query = this.applyRelations(query, relations);
        }
        query = query.limit(1);
        const result = await query;
        return result[0] || null;
    }
    async findAll(filters, pagination, options) {
        const { transaction, relations = [], select = [] } = options || {};
        const { page = 1, limit = this.config.pagination.defaultLimit, sortBy, sortOrder = "desc", } = pagination || {};
        const safeLimit = Math.min(limit, this.config.pagination.maxLimit);
        const offset = (page - 1) * safeLimit;
        const db = transaction || this.config.db;
        let dataQuery = db.select().from(this.config.table);
        const conditions = this.buildWhereConditions(filters);
        if (this.config.softDelete?.enabled) {
            conditions.push((0, drizzle_orm_1.isNull)(this.config.table[this.config.softDelete.column]));
        }
        if (conditions.length > 0) {
            dataQuery = dataQuery.where((0, drizzle_orm_1.and)(...conditions));
        }
        if (sortBy && this.config.table[sortBy]) {
            dataQuery = dataQuery.orderBy(sortOrder === "desc"
                ? (0, drizzle_orm_1.desc)(this.config.table[sortBy])
                : (0, drizzle_orm_1.asc)(this.config.table[sortBy]));
        }
        dataQuery = dataQuery.limit(safeLimit).offset(offset);
        if (relations.length > 0) {
            dataQuery = this.applyRelations(dataQuery, relations);
        }
        if (select.length > 0) {
            const fields = select.reduce((acc, field) => {
                acc[field] = this.config.table[field];
                return acc;
            }, {});
            dataQuery = dataQuery.fields(fields);
        }
        let countQuery = db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(this.config.table);
        if (conditions.length > 0) {
            countQuery = countQuery.where((0, drizzle_orm_1.and)(...conditions));
        }
        const [data, totalResult] = await Promise.all([dataQuery, countQuery]);
        const total = parseInt(totalResult[0]?.count?.toString() || "0");
        return { data, total, page, limit: safeLimit };
    }
    async create(data, options) {
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
            if (!hooks.skipAfter)
                await this.afterCreate(createdEntity);
            return createdEntity;
        }
        else {
            const result = await insertQuery;
            const lastInsertId = result[0].insertId;
            const createdEntity = await this.find(lastInsertId, options);
            if (!createdEntity)
                throw new Error("Failed to create entity");
            if (!hooks.skipAfter)
                await this.afterCreate(createdEntity);
            return createdEntity;
        }
    }
    async update(id, data, options) {
        const { transaction, hooks = {} } = options || {};
        const existing = await this.find(id, options);
        if (!existing)
            throw new crud_exceptions_1.EntityNotFoundException(this.getEntityName(), id);
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
            .where((0, drizzle_orm_1.eq)(this.config.table[this.config.primaryKey], id));
        if (this.config.sql?.useReturning) {
            updateQuery = updateQuery.returning();
            const result = await updateQuery;
            const updatedEntity = result[0];
            if (!hooks.skipAfter)
                await this.afterUpdate(updatedEntity);
            return updatedEntity;
        }
        else {
            await updateQuery;
            const updatedEntity = await this.find(id, options);
            if (!updatedEntity)
                throw new Error("Failed to update entity");
            if (!hooks.skipAfter)
                await this.afterUpdate(updatedEntity);
            return updatedEntity;
        }
    }
    async softDelete(id, options) {
        if (!this.config.softDelete?.enabled) {
            throw new Error("Soft delete is not enabled for this entity");
        }
        const { transaction, hooks = {} } = options || {};
        const existing = await this.find(id, options);
        if (!existing)
            throw new crud_exceptions_1.EntityNotFoundException(this.getEntityName(), id);
        if (!hooks.skipBefore)
            await this.beforeSoftDelete(id);
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
            .where((0, drizzle_orm_1.eq)(this.config.table[this.config.primaryKey], id));
        if (this.config.sql?.useReturning)
            updateQuery = updateQuery.returning();
        const result = await updateQuery;
        const success = Array.isArray(result)
            ? result.length > 0
            : result[0].affectedRows > 0;
        if (success && !hooks.skipAfter)
            await this.afterSoftDelete(id);
        return success;
    }
    async restore(id, options) {
        if (!this.config.softDelete?.enabled) {
            throw new Error("Soft delete is not enabled for this entity");
        }
        const { transaction, hooks = {} } = options || {};
        if (!hooks.skipBefore)
            await this.beforeRestore(id);
        const db = transaction || this.config.db;
        const updateData = {
            [this.config.softDelete.column]: null,
            ...(this.config.timestamps?.updatedAt && {
                [this.config.timestamps.updatedAt]: new Date(),
            }),
        };
        let updateQuery = db
            .update(this.config.table)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(this.config.table[this.config.primaryKey], id));
        if (this.config.sql?.useReturning) {
            updateQuery = updateQuery.returning();
            const result = await updateQuery;
            if (result.length === 0)
                throw new crud_exceptions_1.EntityNotFoundException(this.getEntityName(), id);
            const restoredEntity = result[0];
            if (!hooks.skipAfter)
                await this.afterRestore(restoredEntity);
            return restoredEntity;
        }
        else {
            await updateQuery;
            const restoredEntity = await this.find(id, options);
            if (!restoredEntity)
                throw new crud_exceptions_1.EntityNotFoundException(this.getEntityName(), id);
            if (!hooks.skipAfter)
                await this.afterRestore(restoredEntity);
            return restoredEntity;
        }
    }
    async delete(id, options) {
        const { transaction, hooks = {} } = options || {};
        const existing = await this.find(id, options);
        if (!existing)
            throw new crud_exceptions_1.EntityNotFoundException(this.getEntityName(), id);
        if (!hooks.skipBefore)
            await this.beforeDelete(id);
        const db = transaction || this.config.db;
        const deleteQuery = db
            .delete(this.config.table)
            .where((0, drizzle_orm_1.eq)(this.config.table[this.config.primaryKey], id));
        const result = await deleteQuery;
        const success = Array.isArray(result)
            ? result.length > 0
            : result[0].affectedRows > 0;
        if (success && !hooks.skipAfter)
            await this.afterDelete(id);
        return success;
    }
    async massCreate(data, options) {
        return this.executeSqlTransaction(async (tx) => {
            const results = [];
            const errors = [];
            for (let i = 0; i < data.length; i++) {
                try {
                    const result = await this.create(data[i], {
                        ...options,
                        transaction: tx,
                    });
                    results.push(result);
                }
                catch (error) {
                    errors.push({ index: i, error: error });
                }
            }
            if (errors.length > 0)
                throw new crud_exceptions_1.BulkOperationException("Mass create errors", errors);
            return results;
        }, options?.transaction);
    }
    async massUpdate(ids, data, options) {
        return this.executeSqlTransaction(async (tx) => {
            const results = [];
            const errors = [];
            for (const id of ids) {
                try {
                    const result = await this.update(id, data, {
                        ...options,
                        transaction: tx,
                    });
                    results.push(result);
                }
                catch (error) {
                    errors.push({ id, error: error });
                }
            }
            if (errors.length > 0)
                throw new crud_exceptions_1.BulkOperationException("Mass update errors", errors);
            return results;
        }, options?.transaction);
    }
    async massSoftDelete(ids, options) {
        if (!this.config.softDelete?.enabled)
            throw new Error("Soft delete not enabled");
        return this.executeSqlTransaction(async (tx) => {
            const errors = [];
            for (const id of ids) {
                try {
                    await this.softDelete(id, { ...options, transaction: tx });
                }
                catch (error) {
                    errors.push({ id, error: error });
                }
            }
            if (errors.length > 0)
                throw new crud_exceptions_1.BulkOperationException("Mass soft delete errors", errors);
            return true;
        }, options?.transaction);
    }
    async massRestore(ids, options) {
        if (!this.config.softDelete?.enabled)
            throw new Error("Soft delete not enabled");
        return this.executeSqlTransaction(async (tx) => {
            const results = [];
            const errors = [];
            for (const id of ids) {
                try {
                    const result = await this.restore(id, {
                        ...options,
                        transaction: tx,
                    });
                    results.push(result);
                }
                catch (error) {
                    errors.push({ id, error: error });
                }
            }
            if (errors.length > 0)
                throw new crud_exceptions_1.BulkOperationException("Mass restore errors", errors);
            return results;
        }, options?.transaction);
    }
    async massDelete(ids, options) {
        return this.executeSqlTransaction(async (tx) => {
            const errors = [];
            for (const id of ids) {
                try {
                    await this.delete(id, { ...options, transaction: tx });
                }
                catch (error) {
                    errors.push({ id, error: error });
                }
            }
            if (errors.length > 0)
                throw new crud_exceptions_1.BulkOperationException("Mass delete errors", errors);
            return true;
        }, options?.transaction);
    }
    async exists(id, options) {
        const entity = await this.find(id, {
            ...options,
            select: [this.config.primaryKey],
        });
        return !!entity;
    }
    async count(filters, options) {
        const { transaction } = options || {};
        const db = transaction || this.config.db;
        let query = db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(this.config.table);
        const conditions = this.buildWhereConditions(filters);
        if (this.config.softDelete?.enabled) {
            conditions.push((0, drizzle_orm_1.isNull)(this.config.table[this.config.softDelete.column]));
        }
        if (conditions.length > 0)
            query = query.where((0, drizzle_orm_1.and)(...conditions));
        const result = await query;
        return parseInt(result[0]?.count?.toString() || "0");
    }
    buildWhereConditions(filters) {
        if (!filters)
            return [];
        const conditions = [];
        for (const [key, value] of Object.entries(filters)) {
            if (value === undefined || value === null)
                continue;
            const column = this.config.table[key];
            if (!column)
                continue;
            if (Array.isArray(value)) {
                conditions.push((0, drizzle_orm_1.inArray)(column, value));
            }
            else if (typeof value === "string" &&
                this.config.sql?.caseSensitive === false) {
                conditions.push((0, drizzle_orm_1.ilike)(column, `%${value}%`));
            }
            else if (typeof value === "object" && value !== null) {
                this.applyComplexFilter(conditions, column, value);
            }
            else {
                conditions.push((0, drizzle_orm_1.eq)(column, value));
            }
        }
        return conditions;
    }
    applyComplexFilter(conditions, column, filterObj) {
        for (const [op, value] of Object.entries(filterObj)) {
            switch (op) {
                case "gt":
                    conditions.push((0, drizzle_orm_1.gt)(column, value));
                    break;
                case "gte":
                    conditions.push((0, drizzle_orm_1.gte)(column, value));
                    break;
                case "lt":
                    conditions.push((0, drizzle_orm_1.lt)(column, value));
                    break;
                case "lte":
                    conditions.push((0, drizzle_orm_1.lte)(column, value));
                    break;
                case "neq":
                    conditions.push((0, drizzle_orm_1.ne)(column, value));
                    break;
                case "like":
                    conditions.push((0, drizzle_orm_1.like)(column, `%${value}%`));
                    break;
                case "ilike":
                    conditions.push((0, drizzle_orm_1.ilike)(column, `%${value}%`));
                    break;
                case "in":
                    conditions.push((0, drizzle_orm_1.inArray)(column, value));
                    break;
                case "isNull":
                    conditions.push((0, drizzle_orm_1.isNull)(column));
                    break;
                case "isNotNull":
                    conditions.push((0, drizzle_orm_1.isNotNull)(column));
                    break;
            }
        }
    }
    applyRelations(query, relations) {
        return query;
    }
    async executeSqlTransaction(operation, existingTransaction) {
        if (existingTransaction)
            return operation(existingTransaction);
        return this.config.db.transaction(operation);
    }
    getEntityName() {
        return this.config.table.constructor.name || "Entity";
    }
    async fullTextSearch(searchTerm, searchColumns, pagination, options) {
        if (this.config.dialect !== "postgresql") {
            throw new Error("Full-text search only supported in PostgreSQL");
        }
        const { transaction } = options || {};
        const db = transaction || this.config.db;
        const tsVectorColumns = searchColumns
            .map((col) => (0, drizzle_orm_1.sql) `to_tsvector('english', ${this.config.table[col]})`)
            .join(" || ");
        const tsQuery = (0, drizzle_orm_1.sql) `plainto_tsquery('english', ${searchTerm})`;
        let query = db
            .select()
            .from(this.config.table)
            .where((0, drizzle_orm_1.sql) `${drizzle_orm_1.sql.raw(tsVectorColumns)} @@ ${tsQuery}`)
            .orderBy((0, drizzle_orm_1.sql) `ts_rank(${drizzle_orm_1.sql.raw(tsVectorColumns)}, ${tsQuery}) DESC`);
        if (pagination) {
            const { page = 1, limit = this.config.pagination.defaultLimit } = pagination;
            const safeLimit = Math.min(limit, this.config.pagination.maxLimit);
            const offset = (page - 1) * safeLimit;
            query = query.limit(safeLimit).offset(offset);
        }
        const data = await query;
        const countQuery = db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(this.config.table)
            .where((0, drizzle_orm_1.sql) `${drizzle_orm_1.sql.raw(tsVectorColumns)} @@ ${tsQuery}`);
        const totalResult = await countQuery;
        const total = parseInt(totalResult[0]?.count?.toString() || "0");
        return { data, total };
    }
}
exports.SqlBaseCrudService = SqlBaseCrudService;
//# sourceMappingURL=sql-base-crud.service.js.map