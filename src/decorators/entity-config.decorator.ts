import { SetMetadata } from "@nestjs/common";

export const ENTITY_CONFIG_METADATA = "ENTITY_CONFIG_METADATA";

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

export function EntityConfig(config: EntityConfig): ClassDecorator {
	return (target: any) => {
		SetMetadata(ENTITY_CONFIG_METADATA, config)(target);
	};
}
