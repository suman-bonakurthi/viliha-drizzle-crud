export declare class SqlDialectUtils {
    static getTimestampFunction(dialect: "postgresql" | "mysql"): string;
    static getJsonExtractQuery(dialect: "postgresql" | "mysql", column: string, path: string): string;
}
