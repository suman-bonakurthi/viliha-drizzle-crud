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
let DrizzleCrudModule = DrizzleCrudModule_1 = class DrizzleCrudModule {
    static forRoot(config) {
        const drizzleCrudConfigProvider = {
            provide: "DRIZZLE_CRUD_CONFIG",
            useValue: {
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
            },
        };
        return {
            module: DrizzleCrudModule_1,
            providers: [drizzleCrudConfigProvider],
            exports: [drizzleCrudConfigProvider],
            global: true,
        };
    }
    static forFeature(entities) {
        const providers = entities.map((entity) => ({
            provide: entity.service,
            useFactory: (db, globalConfig) => {
                const config = Reflect.getMetadata("crud:config", entity.service);
                const finalConfig = {
                    ...globalConfig,
                    ...config,
                    db,
                    table: config.table,
                };
                return new entity.service(finalConfig);
            },
            inject: ["DRIZZLE_DB", "DRIZZLE_CRUD_CONFIG"],
        }));
        return {
            module: DrizzleCrudModule_1,
            providers,
            exports: providers,
        };
    }
    static forRootAsync(options) {
        const drizzleCrudConfigProvider = {
            provide: "DRIZZLE_CRUD_CONFIG",
            useFactory: options.useFactory,
            inject: options.inject || [],
        };
        return {
            module: DrizzleCrudModule_1,
            imports: options.imports || [],
            providers: [drizzleCrudConfigProvider],
            exports: [drizzleCrudConfigProvider],
            global: true,
        };
    }
};
exports.DrizzleCrudModule = DrizzleCrudModule;
exports.DrizzleCrudModule = DrizzleCrudModule = DrizzleCrudModule_1 = __decorate([
    (0, common_1.Module)({})
], DrizzleCrudModule);
//# sourceMappingURL=drizzle-crud.module.js.map