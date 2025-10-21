export declare class EntityNotFoundException extends Error {
    constructor(entityName: string, id: any);
}
export declare class DuplicateEntityException extends Error {
    constructor(entityName: string, field: string, value: any);
}
export declare class ValidationFailedException extends Error {
    constructor(message: string);
}
export declare class BulkOperationException extends Error {
    readonly errors: Array<{
        id?: any;
        index?: number;
        error: Error;
    }>;
    constructor(message: string, errors: Array<{
        id?: any;
        index?: number;
        error: Error;
    }>);
}
export declare class DatabaseConnectionException extends Error {
    constructor(message?: string);
}
export declare class TransactionException extends Error {
    constructor(message?: string);
}
