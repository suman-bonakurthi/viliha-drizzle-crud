import { OnModuleDestroy } from "@nestjs/common";
import { DrizzleCrudConfig } from "../core/interfaces/drizzle-crud-config.interface";

export const DRIZZLE_DB = "DRIZZLE_DB";
export const DRIZZLE_CRUD_CONFIG = "DRIZZLE_CRUD_CONFIG";
export const DRIZZLE_CONNECTION = "DRIZZLE_CONNECTION";

/**
 * Owns the Drizzle connection for the lifetime of the application.
 *
 * If the caller passes a ready-made `db`, it is used as-is and left for the
 * caller to dispose. If a `connectionString` is given instead, this manager
 * builds the driver connection and closes it on application shutdown.
 */
export class DrizzleConnection implements OnModuleDestroy {
	db: any;
	private client?: { end?: () => Promise<void> };
	private ownsConnection = false;

	async init(config: DrizzleCrudConfig): Promise<void> {
		if (config.db) {
			this.db = config.db;
			return;
		}

		if (!config.connectionString) {
			throw new Error(
				"DrizzleCrudModule: provide either `db` (a Drizzle instance) or `connectionString`.",
			);
		}

		if (config.dialect === "postgresql") {
			const postgres = (await import("postgres")).default;
			const { drizzle } = await import("drizzle-orm/postgres-js");
			const client = postgres(config.connectionString, { prepare: false });
			this.client = client as unknown as { end: () => Promise<void> };
			this.ownsConnection = true;
			this.db = config.schema
				? drizzle(client, { schema: config.schema })
				: drizzle(client);
			return;
		}

		throw new Error(
			`DrizzleCrudModule: building a connection from \`connectionString\` is only supported for the "postgresql" dialect. ` +
				`For "${config.dialect}", construct the Drizzle instance yourself and pass it as \`db\`.`,
		);
	}

	async onModuleDestroy(): Promise<void> {
		if (this.ownsConnection && this.client?.end) {
			await this.client.end();
		}
	}
}
