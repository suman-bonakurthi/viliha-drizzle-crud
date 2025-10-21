export interface CrudConfig {
    softDelete?: {
        enabled: boolean;
        column: string;
    };
    timestamps?: {
        createdAt: string;
        updatedAt: string;
    };
    primaryKey?: string;
    pagination?: {
        defaultLimit: number;
        maxLimit: number;
    };
    validation?: {
        strict: boolean;
    };
}
