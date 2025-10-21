"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCrudService = void 0;
const crud_exceptions_1 = require("../exceptions/crud.exceptions");
class BaseCrudService {
    table;
    config;
    defaultConfig = {
        softDelete: { enabled: true, column: "deleted_at" },
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
        primaryKey: "id",
        pagination: { defaultLimit: 20, maxLimit: 100 },
        validation: { strict: true },
    };
    constructor(table, config = {}) {
        this.table = table;
        this.config = config;
        this.config = { ...this.defaultConfig, ...config };
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
        const query = transaction
            ? transaction.select().from(this.table)
            : this.db.select().from(this.table);
        let baseQuery = query.where(this.eq(this.table[this.config.primaryKey], id));
        if (this.config.softDelete?.enabled) {
            baseQuery = baseQuery.where(this.isNull(this.table[this.config.softDelete.column]));
        }
        if (relations.length > 0) {
            baseQuery = this.applyRelations(baseQuery, relations);
        }
        if (select.length > 0) {
            baseQuery = baseQuery.fields(select);
        }
        const result = await baseQuery;
        return result[0] || null;
    }
    async findOne(where, options) {
        const { transaction, relations = [], select = [] } = options || {};
        const query = transaction
            ? transaction.select().from(this.table)
            : this.db.select().from(this.table);
        let baseQuery = query.where(this.buildWhereClause(where));
        if (this.config.softDelete?.enabled) {
            baseQuery = baseQuery.where(this.isNull(this.table[this.config.softDelete.column]));
        }
        if (relations.length > 0) {
            baseQuery = this.applyRelations(baseQuery, relations);
        }
        if (select.length > 0) {
            baseQuery = baseQuery.fields(select);
        }
        const result = await baseQuery;
        return result[0] || null;
    }
    async findAll(filters, pagination, options) {
        const { transaction, relations = [], select = [] } = options || {};
        const { page = 1, limit = this.config.pagination.defaultLimit, sortBy, sortOrder = "desc", } = pagination || {};
        const safeLimit = Math.min(limit, this.config.pagination.maxLimit);
        const offset = (page - 1) * safeLimit;
        const query = transaction
            ? transaction.select().from(this.table)
            : this.db.select().from(this.table);
        let baseQuery = query.where(this.buildWhereClause(filters));
        if (this.config.softDelete?.enabled) {
            baseQuery = baseQuery.where(this.isNull(this.table[this.config.softDelete.column]));
        }
        if (sortBy) {
            baseQuery = baseQuery.orderBy(this.table[sortBy][sortOrder === "desc" ? "desc" : "asc"]);
        }
        const paginatedQuery = baseQuery.limit(safeLimit).offset(offset);
        let finalQuery = paginatedQuery;
        if (relations.length > 0) {
            finalQuery = this.applyRelations(finalQuery, relations);
        }
        if (select.length > 0) {
            finalQuery = finalQuery.fields(select);
        }
        const [data, totalResult] = await Promise.all([
            finalQuery,
            this.count(filters, options),
        ]);
        return {
            data,
            total: totalResult,
            page,
            limit: safeLimit,
        };
    }
    async create(data, options) {
        const { transaction, hooks = {} } = options || {};
        await this.validateCreate(data);
        const processedData = hooks.skipBefore
            ? data
            : await this.beforeCreate(data);
        const entityData = this.mapCreateDtoToEntity(processedData);
        if (this.config.timestamps?.createdAt) {
            entityData[this.config.timestamps.createdAt] = new Date();
        }
        if (this.config.timestamps?.updatedAt) {
            entityData[this.config.timestamps.updatedAt] = new Date();
        }
        const query = transaction
            ? transaction.insert(this.table)
            : this.db.insert(this.table);
        const result = await query.values(entityData).returning();
        const createdEntity = result[0];
        if (!hooks.skipAfter) {
            await this.afterCreate(createdEntity);
        }
        return createdEntity;
    }
    async update(id, data, options) {
        const { transaction, hooks = {} } = options || {};
        const existing = await this.find(id, options);
        if (!existing) {
            throw new crud_exceptions_1.EntityNotFoundException(this.getEntityName(), id);
        }
        await this.validateUpdate(id, data);
        const processedData = hooks.skipBefore
            ? data
            : await this.beforeUpdate(id, data);
        const entityData = this.mapUpdateDtoToEntity(processedData);
        if (this.config.timestamps?.updatedAt) {
            entityData[this.config.timestamps.updatedAt] = new Date();
        }
        const query = transaction
            ? transaction.update(this.table)
            : this.db.update(this.table);
        const result = await query
            .set(entityData)
            .where(this.eq(this.table[this.config.primaryKey], id))
            .returning();
        const updatedEntity = result[0];
        if (!hooks.skipAfter) {
            await this.afterUpdate(updatedEntity);
        }
        return updatedEntity;
    }
    async softDelete(id, options) {
        if (!this.config.softDelete?.enabled) {
            throw new Error("Soft delete is not enabled for this entity");
        }
        const { transaction, hooks = {} } = options || {};
        const existing = await this.find(id, options);
        if (!existing) {
            throw new crud_exceptions_1.EntityNotFoundException(this.getEntityName(), id);
        }
        if (!hooks.skipBefore) {
            await this.beforeSoftDelete(id);
        }
        const query = transaction
            ? transaction.update(this.table)
            : this.db.update(this.table);
        const result = await query
            .set({
            [this.config.softDelete.column]: new Date(),
            ...(this.config.timestamps?.updatedAt && {
                [this.config.timestamps.updatedAt]: new Date(),
            }),
        })
            .where(this.eq(this.table[this.config.primaryKey], id))
            .returning();
        const success = result.length > 0;
        if (success && !hooks.skipAfter) {
            await this.afterSoftDelete(id);
        }
        return success;
    }
    async restore(id, options) {
        if (!this.config.softDelete?.enabled) {
            throw new Error("Soft delete is not enabled for this entity");
        }
        const { transaction, hooks = {} } = options || {};
        if (!hooks.skipBefore) {
            await this.beforeRestore(id);
        }
        const query = transaction
            ? transaction.update(this.table)
            : this.db.update(this.table);
        const result = await query
            .set({
            [this.config.softDelete.column]: null,
            ...(this.config.timestamps?.updatedAt && {
                [this.config.timestamps.updatedAt]: new Date(),
            }),
        })
            .where(this.eq(this.table[this.config.primaryKey], id))
            .returning();
        if (result.length === 0) {
            throw new crud_exceptions_1.EntityNotFoundException(this.getEntityName(), id);
        }
        const restoredEntity = result[0];
        if (!hooks.skipAfter) {
            await this.afterRestore(restoredEntity);
        }
        return restoredEntity;
    }
    async delete(id, options) {
        const { transaction, hooks = {} } = options || {};
        const existing = await this.find(id, options);
        if (!existing) {
            throw new crud_exceptions_1.EntityNotFoundException(this.getEntityName(), id);
        }
        if (!hooks.skipBefore) {
            await this.beforeDelete(id);
        }
        const query = transaction
            ? transaction.delete(this.table)
            : this.db.delete(this.table);
        const result = await query
            .where(this.eq(this.table[this.config.primaryKey], id))
            .returning();
        const success = result.length > 0;
        if (success && !hooks.skipAfter) {
            await this.afterDelete(id);
        }
        return success;
    }
    async massCreate(data, options) {
        return this.executeInTransaction(async (tx) => {
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
            if (errors.length > 0) {
                throw new crud_exceptions_1.BulkOperationException("Mass create operation completed with errors", errors);
            }
            return results;
        }, options?.transaction);
    }
    async massUpdate(ids, data, options) {
        return this.executeInTransaction(async (tx) => {
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
            if (errors.length > 0) {
                throw new crud_exceptions_1.BulkOperationException("Mass update operation completed with errors", errors);
            }
            return results;
        }, options?.transaction);
    }
    async massSoftDelete(ids, options) {
        if (!this.config.softDelete?.enabled) {
            throw new Error("Soft delete is not enabled for this entity");
        }
        return this.executeInTransaction(async (tx) => {
            const errors = [];
            for (const id of ids) {
                try {
                    await this.softDelete(id, { ...options, transaction: tx });
                }
                catch (error) {
                    errors.push({ id, error: error });
                }
            }
            if (errors.length > 0) {
                throw new crud_exceptions_1.BulkOperationException("Mass soft delete operation completed with errors", errors);
            }
            return true;
        }, options?.transaction);
    }
    async massRestore(ids, options) {
        if (!this.config.softDelete?.enabled) {
            throw new Error("Soft delete is not enabled for this entity");
        }
        return this.executeInTransaction(async (tx) => {
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
            if (errors.length > 0) {
                throw new crud_exceptions_1.BulkOperationException("Mass restore operation completed with errors", errors);
            }
            return results;
        }, options?.transaction);
    }
    async massDelete(ids, options) {
        return this.executeInTransaction(async (tx) => {
            const errors = [];
            for (const id of ids) {
                try {
                    await this.delete(id, { ...options, transaction: tx });
                }
                catch (error) {
                    errors.push({ id, error: error });
                }
            }
            if (errors.length > 0) {
                throw new crud_exceptions_1.BulkOperationException("Mass delete operation completed with errors", errors);
            }
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
        const query = transaction
            ? transaction.select().from(this.table)
            : this.db.select().from(this.table);
        let baseQuery = query.where(this.buildWhereClause(filters));
        if (this.config.softDelete?.enabled) {
            baseQuery = baseQuery.where(this.isNull(this.table[this.config.softDelete.column]));
        }
        const result = await baseQuery;
        return result.length;
    }
    buildWhereClause(filters) {
        if (!filters)
            return {};
        const where = {};
        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    where[key] = { in: value };
                }
                else {
                    where[key] = value;
                }
            }
        }
        return where;
    }
    applyRelations(query, relations) {
        return query;
    }
    async executeInTransaction(operation, existingTransaction) {
        if (existingTransaction) {
            return operation(existingTransaction);
        }
        return this.db.transaction(operation);
    }
    getEntityName() {
        return this.table.constructor.name || "Entity";
    }
    get db() {
        return global.drizzleDb;
    }
    eq(column, value) {
        return { [column]: value };
    }
    isNull(column) {
        return { [column]: null };
    }
}
exports.BaseCrudService = BaseCrudService;
//# sourceMappingURL=base-crud.service.js.map