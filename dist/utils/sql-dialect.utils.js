"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlDialectUtils = void 0;
class SqlDialectUtils {
    static getTimestampFunction(dialect) {
        return dialect === "postgresql" ? "NOW()" : "CURRENT_TIMESTAMP";
    }
    static getJsonExtractQuery(dialect, column, path) {
        if (dialect === "postgresql") {
            return `${column}->>'${path}'`;
        }
        else {
            return `JSON_EXTRACT(${column}, '$.${path}')`;
        }
    }
}
exports.SqlDialectUtils = SqlDialectUtils;
//# sourceMappingURL=sql-dialect.utils.js.map