"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrizzleConnection = exports.DRIZZLE_CONNECTION = exports.DRIZZLE_CRUD_CONFIG = exports.DRIZZLE_DB = void 0;
exports.DRIZZLE_DB = "DRIZZLE_DB";
exports.DRIZZLE_CRUD_CONFIG = "DRIZZLE_CRUD_CONFIG";
exports.DRIZZLE_CONNECTION = "DRIZZLE_CONNECTION";
class DrizzleConnection {
    db;
    client;
    ownsConnection = false;
    async init(config) {
        if (config.db) {
            this.db = config.db;
            return;
        }
        if (!config.connectionString) {
            throw new Error("DrizzleCrudModule: provide either `db` (a Drizzle instance) or `connectionString`.");
        }
        if (config.dialect === "postgresql") {
            const postgres = (await Promise.resolve().then(() => __importStar(require("postgres")))).default;
            const { drizzle } = await Promise.resolve().then(() => __importStar(require("drizzle-orm/postgres-js")));
            const client = postgres(config.connectionString, { prepare: false });
            this.client = client;
            this.ownsConnection = true;
            this.db = config.schema
                ? drizzle(client, { schema: config.schema })
                : drizzle(client);
            return;
        }
        throw new Error(`DrizzleCrudModule: building a connection from \`connectionString\` is only supported for the "postgresql" dialect. ` +
            `For "${config.dialect}", construct the Drizzle instance yourself and pass it as \`db\`.`);
    }
    async onModuleDestroy() {
        if (this.ownsConnection && this.client?.end) {
            await this.client.end();
        }
    }
}
exports.DrizzleConnection = DrizzleConnection;
//# sourceMappingURL=drizzle-connection.js.map