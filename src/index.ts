/**
 * Drizzle CRUD Nest - Complete CRUD abstraction for Drizzle ORM in NestJS
 * @package drizzle-crud-nest
 */

// Re-export common Drizzle types for convenience
export {
	and,
	asc,
	desc,
	eq,
	gt,
	gte,
	ilike,
	inArray,
	isNotNull,
	isNull,
	like,
	lt,
	lte,
	ne,
	or,
	sql,
} from "drizzle-orm";
// Core abstractions
export { SqlBaseCrudService } from "./core/abstract/sql-base-crud.service";
export { ICrudService } from "./core/interfaces/crud-service.interface";
export { DrizzleCrudConfig } from "./core/interfaces/drizzle-crud-config.interface";
// Configuration interfaces
export {
	SqlCrudConfig,
	SqlOperationOptions,
} from "./core/interfaces/sql-crud-config.interface";
// Types
export {
	PrimaryKeyType,
	SqlDialect,
	SqlFilterCondition,
} from "./core/types/sql.types";
// Decorators
export { CrudService } from "./decorators/crud-service.decorator";
export { EntityConfig } from "./decorators/entity-config.decorator";
// Exceptions
export {
	BulkOperationException,
	DatabaseConnectionException,
	DuplicateEntityException,
	EntityNotFoundException,
	TransactionException,
	ValidationFailedException,
} from "./exceptions/crud.exceptions";
// Module
export { DrizzleCrudModule } from "./modules/drizzle-crud.module";
// Test utilities
export { BaseCrudSpecHelper } from "./test-utils/base-crud.spec-helper";
export { TestCrudFactory } from "./test-utils/test-factory";
