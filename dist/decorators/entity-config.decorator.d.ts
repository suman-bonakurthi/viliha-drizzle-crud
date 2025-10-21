export declare const ENTITY_CONFIG_METADATA = "ENTITY_CONFIG_METADATA";
export interface EntityConfig {
    table: any;
    primaryKey?: string;
    primaryKeyType?: "serial" | "bigserial" | "int" | "bigint" | "uuid";
    softDelete?: boolean;
    softDeleteColumn?: string;
    timestamps?: {
        createdAt: string;
        updatedAt: string;
    };
}
export declare function EntityConfig(config: EntityConfig): ClassDecorator;
