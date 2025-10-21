import { SqlDialect } from "../types/sql.types";

export interface DrizzleCrudConfig {
	// Database configuration
	dialect: SqlDialect;

	// Global defaults
	defaults?: {
		softDelete?: boolean;
		timestamps?: boolean;
		pagination?: {
			defaultLimit: number;
			maxLimit: number;
		};
	};

	// SQL-specific
	sql?: {
		caseSensitive: boolean;
		useReturning: boolean;
		jsonSupport: boolean;
		enableFullTextSearch: boolean;
	};

	// Hooks
	hooks?: {
		enableGlobalHooks: boolean;
	};
}
