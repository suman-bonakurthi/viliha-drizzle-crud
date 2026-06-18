import { SqlDialect } from "../types/sql.types";
export interface DrizzleCrudConfig {
    dialect: SqlDialect;
    db?: any;
    connectionString?: string;
    schema?: Record<string, unknown>;
    defaults?: {
        softDelete?: boolean;
        timestamps?: boolean;
        pagination?: {
            defaultLimit: number;
            maxLimit: number;
        };
    };
    sql?: {
        caseSensitive: boolean;
        useReturning: boolean;
        jsonSupport: boolean;
        enableFullTextSearch: boolean;
    };
    hooks?: {
        enableGlobalHooks: boolean;
    };
}
export interface CrudFeature {
    service: new (...args: any[]) => any;
    table: any;
    config?: Record<string, any>;
}
