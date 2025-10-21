"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionException = exports.DatabaseConnectionException = exports.BulkOperationException = exports.ValidationFailedException = exports.DuplicateEntityException = exports.EntityNotFoundException = void 0;
class EntityNotFoundException extends Error {
    constructor(entityName, id) {
        super(`${entityName} with id ${id} not found`);
        this.name = "EntityNotFoundException";
    }
}
exports.EntityNotFoundException = EntityNotFoundException;
class DuplicateEntityException extends Error {
    constructor(entityName, field, value) {
        super(`${entityName} with ${field} '${value}' already exists`);
        this.name = "DuplicateEntityException";
    }
}
exports.DuplicateEntityException = DuplicateEntityException;
class ValidationFailedException extends Error {
    constructor(message) {
        super(`Validation failed: ${message}`);
        this.name = "ValidationFailedException";
    }
}
exports.ValidationFailedException = ValidationFailedException;
class BulkOperationException extends Error {
    errors;
    constructor(message, errors) {
        super(`${message}. ${errors.length} error(s) occurred.`);
        this.errors = errors;
        this.name = "BulkOperationException";
    }
}
exports.BulkOperationException = BulkOperationException;
class DatabaseConnectionException extends Error {
    constructor(message = "Database connection failed") {
        super(message);
        this.name = "DatabaseConnectionException";
    }
}
exports.DatabaseConnectionException = DatabaseConnectionException;
class TransactionException extends Error {
    constructor(message = "Transaction failed") {
        super(message);
        this.name = "TransactionException";
    }
}
exports.TransactionException = TransactionException;
//# sourceMappingURL=crud.exceptions.js.map