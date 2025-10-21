import { DynamicModule } from "@nestjs/common";
import { CrudOptions } from "src/interfaces/crud-options.interface";
export declare class CrudModule {
    static forRoot(options: CrudOptions): DynamicModule;
}
