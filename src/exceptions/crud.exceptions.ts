export class EntityNotFoundException extends Error {
	constructor(entityName: string, id: any) {
		super(`${entityName} with id ${id} not found`);
		this.name = "EntityNotFoundException";
	}
}

export class DuplicateEntityException extends Error {
	constructor(entityName: string, field: string, value: any) {
		super(`${entityName} with ${field} '${value}' already exists`);
		this.name = "DuplicateEntityException";
	}
}

export class ValidationFailedException extends Error {
	constructor(message: string) {
		super(`Validation failed: ${message}`);
		this.name = "ValidationFailedException";
	}
}

export class BulkOperationException extends Error {
	constructor(
		message: string,
		public readonly errors: Array<{ id?: any; index?: number; error: Error }>,
	) {
		super(`${message}. ${errors.length} error(s) occurred.`);
		this.name = "BulkOperationException";
	}
}

export class DatabaseConnectionException extends Error {
	constructor(message: string = "Database connection failed") {
		super(message);
		this.name = "DatabaseConnectionException";
	}
}

export class TransactionException extends Error {
	constructor(message: string = "Transaction failed") {
		super(message);
		this.name = "TransactionException";
	}
}
