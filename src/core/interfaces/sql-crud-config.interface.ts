import { PrimaryKeyType, SqlDialect } from "../types/sql.types";

export interface SqlCrudConfig {
	// Database configuration
	dialect: SqlDialect;
	db: any; // Drizzle database instance
	table: any; // Drizzle table

	// Primary key configuration
	primaryKey: string;
	primaryKeyType: PrimaryKeyType;

	// Soft delete
	softDelete?: {
		enabled: boolean;
		column: string;
	};

	// Timestamps
	timestamps?: {
		createdAt: string;
		updatedAt: string;
	};

	// Pagination
	pagination?: {
		defaultLimit: number;
		maxLimit: number;
	};

	// SQL-specific optimizations
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
