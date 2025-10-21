import { SqlBaseCrudService } from "../core/abstract/sql-base-crud.service";
import { SqlCrudConfig } from "../core/interfaces/sql-crud-config.interface";
export declare class TestCrudFactory {
    static createTestService<T extends SqlBaseCrudService<any, any, any, any>>(ServiceClass: new (config: SqlCrudConfig) => T, mockDb: any, mockTable: any, configOverrides?: Partial<SqlCrudConfig>): T;
    static createMockDb(): {
        select: jest.Mock<any, any, any>;
        from: jest.Mock<any, any, any>;
        where: jest.Mock<any, any, any>;
        limit: jest.Mock<any, any, any>;
        offset: jest.Mock<any, any, any>;
        orderBy: jest.Mock<any, any, any>;
        insert: jest.Mock<any, any, any>;
        values: jest.Mock<any, any, any>;
        returning: jest.Mock<any, any, any>;
        update: jest.Mock<any, any, any>;
        set: jest.Mock<any, any, any>;
        delete: jest.Mock<any, any, any>;
        transaction: jest.Mock<any, any, any>;
    };
    static createMockTable(): {
        id: string;
        name: string;
        email: string;
        created_at: string;
        updated_at: string;
        deleted_at: string;
    };
    static createMockEntity(overrides?: any): any;
}
