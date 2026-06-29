import {
	BadRequestException,
	ConflictException,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";

// These extend NestJS HttpException subclasses so the framework's default
// exception filter maps them to the right HTTP status automatically:
//   not found -> 404, duplicate -> 409, validation/bulk -> 400.
// (@nestjs/common is a peer dependency.)

export class EntityNotFoundException extends NotFoundException {
	constructor(entityName: string, id: any) {
		super(`${entityName} with id ${id} not found`);
		this.name = "EntityNotFoundException";
	}
}

export class DuplicateEntityException extends ConflictException {
	constructor(entityName: string, field: string, value: any) {
		super(`${entityName} with ${field} '${value}' already exists`);
		this.name = "DuplicateEntityException";
	}
}

export class ValidationFailedException extends BadRequestException {
	constructor(message: string) {
		super(`Validation failed: ${message}`);
		this.name = "ValidationFailedException";
	}
}

export class BulkOperationException extends BadRequestException {
	constructor(
		message: string,
		public readonly errors: Array<{ id?: any; index?: number; error: Error }>,
	) {
		super(`${message}. ${errors.length} error(s) occurred.`);
		this.name = "BulkOperationException";
	}
}

export class DatabaseConnectionException extends InternalServerErrorException {
	constructor(message: string = "Database connection failed") {
		super(message);
		this.name = "DatabaseConnectionException";
	}
}

export class TransactionException extends InternalServerErrorException {
	constructor(message: string = "Transaction failed") {
		super(message);
		this.name = "TransactionException";
	}
}
