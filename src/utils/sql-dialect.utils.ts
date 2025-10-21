// src/utils/sql-dialect.utils.ts
export class SqlDialectUtils {
	static getTimestampFunction(dialect: "postgresql" | "mysql"): string {
		return dialect === "postgresql" ? "NOW()" : "CURRENT_TIMESTAMP";
	}

	static getJsonExtractQuery(
		dialect: "postgresql" | "mysql",
		column: string,
		path: string,
	): string {
		if (dialect === "postgresql") {
			return `${column}->>'${path}'`;
		} else {
			return `JSON_EXTRACT(${column}, '$.${path}')`;
		}
	}
}
