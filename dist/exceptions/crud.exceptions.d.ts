import { BadRequestException, ConflictException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
export declare class EntityNotFoundException extends NotFoundException {
    constructor(entityName: string, id: any);
}
export declare class DuplicateEntityException extends ConflictException {
    constructor(entityName: string, field: string, value: any);
}
export declare class ValidationFailedException extends BadRequestException {
    constructor(message: string);
}
export declare class BulkOperationException extends BadRequestException {
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
export declare class DatabaseConnectionException extends InternalServerErrorException {
    constructor(message?: string);
}
export declare class TransactionException extends InternalServerErrorException {
    constructor(message?: string);
}
