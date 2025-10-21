export interface OperationOptions {
    transaction?: any;
    relations?: string[];
    select?: string[];
    hooks?: {
        skipBefore?: boolean;
        skipAfter?: boolean;
    };
}
export interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}
export interface BulkOperationResult<T> {
    success: boolean;
    data?: T[];
    errors?: Array<{
        id: any;
        error: Error;
    }>;
}
