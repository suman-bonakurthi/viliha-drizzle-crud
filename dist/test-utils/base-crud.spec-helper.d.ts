import { SqlBaseCrudService } from "../core/abstract/sql-base-crud.service";
export declare class BaseCrudSpecHelper<T extends Record<string, any>, C, U, F> {
    protected getServiceClass: () => new (config: any) => SqlBaseCrudService<T, C, U, F>;
    protected getMockTable: () => any;
    protected getCreateDto: () => C;
    protected getUpdateDto: () => U;
    protected getEntity: () => T;
    protected service: SqlBaseCrudService<T, C, U, F>;
    protected mockDb: any;
    protected mockTable: any;
    constructor(getServiceClass: () => new (config: any) => SqlBaseCrudService<T, C, U, F>, getMockTable: () => any, getCreateDto: () => C, getUpdateDto: () => U, getEntity: () => T);
    protected setup(): void;
    getCreateDtoData(): C;
    getUpdateDtoData(): U;
    getEntityData(): T;
    getFindSuccessScenario(): {
        input: number;
        expected: T;
        mockEntity: T;
    };
    getFindNotFoundScenario(): {
        input: number;
        expected: null;
    };
    getCreateSuccessScenario(): {
        input: C;
        expected: T;
        mockEntity: T;
        mockInsert: {
            values: jest.Mock<any, any, any>;
            returning: jest.Mock<any, any, any>;
        };
    };
    getUpdateSuccessScenario(): {
        input: {
            id: number;
            data: U;
        };
        expected: T & U;
        mockEntity: T;
        updatedEntity: T & U;
        mockUpdate: {
            set: jest.Mock<any, any, any>;
            where: jest.Mock<any, any, any>;
            returning: jest.Mock<any, any, any>;
        };
    };
    getDeleteSuccessScenario(): {
        input: number;
        expected: boolean;
        mockEntity: T;
    };
    getFindAllSuccessScenario(): {
        input: {};
        expected: {
            data: T[];
            total: number;
            page: number;
            limit: number;
        };
        mockEntities: T[];
    };
    resetMocks(): void;
}
