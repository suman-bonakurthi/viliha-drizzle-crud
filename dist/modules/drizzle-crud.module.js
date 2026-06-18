"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DrizzleCrudModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrizzleCrudModule = void 0;
const common_1 = require("@nestjs/common");
const drizzle_connection_1 = require("./drizzle-connection");
const DRIZZLE_RAW_CONFIG = "DRIZZLE_RAW_CONFIG";
function normalizeConfig(config) {
    return {
        dialect: config.dialect,
        defaults: {
            softDelete: true,
            timestamps: true,
            pagination: { defaultLimit: 20, maxLimit: 100 },
            ...config.defaults,
        },
        sql: {
            caseSensitive: false,
            useReturning: config.dialect === "postgresql",
            jsonSupport: true,
            enableFullTextSearch: false,
            ...config.sql,
        },
        hooks: {
            enableGlobalHooks: false,
            ...config.hooks,
        },
    };
}
function buildEntityConfig(service, table, entityConfig, db, globalConfig) {
    const decoratorConfig = Reflect.getMetadata?.("crud:config", service) || {};
    const perEntity = { ...decoratorConfig, ...(entityConfig || {}) };
    const gd = globalConfig?.defaults || {};
    const finalConfig = {
        dialect: globalConfig?.dialect,
        db,
        primaryKey: "id",
        primaryKeyType: "serial",
        softDelete: gd.softDelete === false
            ? { enabled: false, column: "deleted_at" }
            : { enabled: true, column: "deleted_at" },
        timestamps: gd.timestamps === false
            ? undefined
            : { createdAt: "created_at", updatedAt: "updated_at" },
    };
    if (gd.pagination)
        finalConfig.pagination = gd.pagination;
    if (globalConfig?.sql)
        finalConfig.sql = globalConfig.sql;
    Object.assign(finalConfig, perEntity);
    finalConfig.table = table ?? perEntity.table;
    return finalConfig;
}
function connectionProviders(rawConfigProvider) {
    return [
        rawConfigProvider,
        {
            provide: drizzle_connection_1.DRIZZLE_CRUD_CONFIG,
            inject: [DRIZZLE_RAW_CONFIG],
            useFactory: (raw) => normalizeConfig(raw),
        },
        {
            provide: drizzle_connection_1.DRIZZLE_CONNECTION,
            inject: [DRIZZLE_RAW_CONFIG],
            useFactory: async (raw) => {
                const connection = new drizzle_connection_1.DrizzleConnection();
                await connection.init(raw);
                return connection;
            },
        },
        {
            provide: drizzle_connection_1.DRIZZLE_DB,
            inject: [drizzle_connection_1.DRIZZLE_CONNECTION],
            useFactory: (connection) => connection.db,
        },
    ];
}
const EXPORTED_TOKENS = [drizzle_connection_1.DRIZZLE_CRUD_CONFIG, drizzle_connection_1.DRIZZLE_DB, drizzle_connection_1.DRIZZLE_CONNECTION];
let DrizzleCrudModule = DrizzleCrudModule_1 = class DrizzleCrudModule {
    static forRoot(config) {
        return {
            module: DrizzleCrudModule_1,
            providers: connectionProviders({
                provide: DRIZZLE_RAW_CONFIG,
                useValue: config,
            }),
            exports: EXPORTED_TOKENS,
            global: true,
        };
    }
    static forRootAsync(options) {
        return {
            module: DrizzleCrudModule_1,
            imports: options.imports || [],
            providers: connectionProviders({
                provide: DRIZZLE_RAW_CONFIG,
                useFactory: options.useFactory,
                inject: options.inject || [],
            }),
            exports: EXPORTED_TOKENS,
            global: true,
        };
    }
    static forFeature(entities) {
        const providers = entities.map((entity) => ({
            provide: entity.service,
            inject: [drizzle_connection_1.DRIZZLE_DB, drizzle_connection_1.DRIZZLE_CRUD_CONFIG],
            useFactory: (db, globalConfig) => new entity.service(buildEntityConfig(entity.service, entity.table, entity.config, db, globalConfig)),
        }));
        return {
            module: DrizzleCrudModule_1,
            providers,
            exports: providers,
        };
    }
};
exports.DrizzleCrudModule = DrizzleCrudModule;
exports.DrizzleCrudModule = DrizzleCrudModule = DrizzleCrudModule_1 = __decorate([
    (0, common_1.Module)({})
], DrizzleCrudModule);
//# sourceMappingURL=drizzle-crud.module.js.map