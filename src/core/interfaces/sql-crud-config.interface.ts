import { PrimaryKeyType, SortColumn, SqlDialect } from "../types/sql.types";

// A many-to-one / one-to-one (belongs-to) relation: this table's `localKey`
// references `references` (default the related table's primary key) on `table`.
export interface RelationConfig {
	table: any;
	localKey: string;
	references?: string;
}

export type RelationsConfig = Record<string, RelationConfig>;

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

	// Default ORDER BY applied by findAll() when the caller passes no sortBy.
	// Columns are applied in order (primary sort first, then tiebreakers).
	defaultSort?: SortColumn[];

	// SQL-specific optimizations
	sql?: {
		caseSensitive: boolean;
		useReturning: boolean;
		jsonSupport: boolean;
		enableFullTextSearch: boolean;
	};

	// Many-to-one / one-to-one relations, keyed by relation name. Enables
	// eager loading (options.relations) and filtering by related columns
	// (filters: { <relationName>: { <col>: value } }).
	relations?: RelationsConfig;
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
