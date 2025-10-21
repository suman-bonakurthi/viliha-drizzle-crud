export type SqlDialect = "postgresql" | "mysql";
export type PrimaryKeyType = "serial" | "bigserial" | "int" | "bigint" | "uuid";
export interface SqlQueryBuilder {
    where: (conditions: any[]) => any;
    limit: (count: number) => any;
    offset: (count: number) => any;
    orderBy: (column: any, direction: "asc" | "desc") => any;
}
export interface SqlFilterCondition {
    field: string;
    operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "like" | "ilike" | "isNull" | "isNotNull";
    value: any;
}
