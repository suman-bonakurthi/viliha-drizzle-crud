import { SqlCrudConfig } from "../core/interfaces/sql-crud-config.interface";
export declare function CrudService(config: Omit<SqlCrudConfig, "db" | "table"> & {
    table: any;
}): ClassDecorator;
