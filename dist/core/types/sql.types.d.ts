export type SqlDialect = "postgresql" | "mysql";
export type PrimaryKeyType = "serial" | "bigserial" | "int" | "bigint" | "uuid";
export type SortOrder = "asc" | "desc";
export interface SortColumn {
    column: string;
    order?: SortOrder;
}
