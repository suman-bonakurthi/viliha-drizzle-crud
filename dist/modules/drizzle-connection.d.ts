import { OnModuleDestroy } from "@nestjs/common";
import { DrizzleCrudConfig } from "../core/interfaces/drizzle-crud-config.interface";
export declare const DRIZZLE_DB = "DRIZZLE_DB";
export declare const DRIZZLE_CRUD_CONFIG = "DRIZZLE_CRUD_CONFIG";
export declare const DRIZZLE_CONNECTION = "DRIZZLE_CONNECTION";
export declare class DrizzleConnection implements OnModuleDestroy {
    db: any;
    private client?;
    private ownsConnection;
    init(config: DrizzleCrudConfig): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
