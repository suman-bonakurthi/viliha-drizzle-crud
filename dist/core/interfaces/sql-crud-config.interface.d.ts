import { PrimaryKeyType, SqlDialect } from "../types/sql.types";
export interface SqlCrudConfig {
    dialect: SqlDialect;
    db: any;
    table: any;
    primaryKey: string;
    primaryKeyType: PrimaryKeyType;
    softDelete?: {
        enabled: boolean;
        column: string;
    };
    timestamps?: {
        createdAt: string;
        updatedAt: string;
    };
    pagination?: {
        defaultLimit: number;
        maxLimit: number;
    };
    sql?: {
        caseSensitive: boolean;
        useReturning: boolean;
        jsonSupport: boolean;
        enableFullTextSearch: boolean;
    };
}
export interface SqlOperationOptions {
    transaction?: any;
    relations?: string[];
    select?: string[];
    hooks?: {
        skipBefore?: boolean;
        skipAfter?: boolean;
    };
    lock?: "update" | "share" | "none";
    forNoKeyUpdate?: boolean;
}
