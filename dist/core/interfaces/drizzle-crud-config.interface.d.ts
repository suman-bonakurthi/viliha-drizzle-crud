import { SqlDialect } from "../types/sql.types";
export interface DrizzleCrudConfig {
    dialect: SqlDialect;
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
