import { DynamicModule } from "@nestjs/common";
import { DrizzleCrudConfig } from "../core/interfaces/drizzle-crud-config.interface";
export declare class DrizzleCrudModule {
    static forRoot(config: DrizzleCrudConfig): DynamicModule;
    static forFeature(entities: Array<{
        service: any;
    }>): DynamicModule;
    static forRootAsync(options: {
        imports?: any[];
        useFactory: (...args: any[]) => Promise<DrizzleCrudConfig> | DrizzleCrudConfig;
        inject?: any[];
    }): DynamicModule;
}
