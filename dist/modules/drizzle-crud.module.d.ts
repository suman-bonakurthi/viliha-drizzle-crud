import { DynamicModule } from "@nestjs/common";
import { CrudFeature, DrizzleCrudConfig } from "../core/interfaces/drizzle-crud-config.interface";
export declare class DrizzleCrudModule {
    static forRoot(config: DrizzleCrudConfig): DynamicModule;
    static forRootAsync(options: {
        imports?: any[];
        useFactory: (...args: any[]) => Promise<DrizzleCrudConfig> | DrizzleCrudConfig;
        inject?: any[];
    }): DynamicModule;
    static forFeature(entities: CrudFeature[]): DynamicModule;
}
