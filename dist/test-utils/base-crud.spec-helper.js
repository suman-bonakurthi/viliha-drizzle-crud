"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCrudSpecHelper = void 0;
const test_factory_1 = require("./test-factory");
class BaseCrudSpecHelper {
    getServiceClass;
    getMockTable;
    getCreateDto;
    getUpdateDto;
    getEntity;
    service;
    mockDb;
    mockTable;
    constructor(getServiceClass, getMockTable, getCreateDto, getUpdateDto, getEntity) {
        this.getServiceClass = getServiceClass;
        this.getMockTable = getMockTable;
        this.getCreateDto = getCreateDto;
        this.getUpdateDto = getUpdateDto;
        this.getEntity = getEntity;
        this.setup();
    }
    setup() {
        this.mockDb = test_factory_1.TestCrudFactory.createMockDb();
        this.mockTable = this.getMockTable();
        this.service = test_factory_1.TestCrudFactory.createTestService(this.getServiceClass(), this.mockDb, this.mockTable);
    }
    getCreateDtoData() {
        return this.getCreateDto();
    }
    getUpdateDtoData() {
        return this.getUpdateDto();
    }
    getEntityData() {
        return this.getEntity();
    }
    getFindSuccessScenario() {
        const mockEntity = this.getEntity();
        this.mockDb.select.mockResolvedValue([mockEntity]);
        return {
            input: 1,
            expected: mockEntity,
            mockEntity,
        };
    }
    getFindNotFoundScenario() {
        this.mockDb.select.mockResolvedValue([]);
        return {
            input: 999,
            expected: null,
        };
    }
    getCreateSuccessScenario() {
        const createDto = this.getCreateDto();
        const mockEntity = this.getEntity();
        const mockInsert = {
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([mockEntity]),
        };
        this.mockDb.insert.mockReturnValue(mockInsert);
        return {
            input: createDto,
            expected: mockEntity,
            mockEntity,
            mockInsert,
        };
    }
    getUpdateSuccessScenario() {
        const updateDto = this.getUpdateDto();
        const mockEntity = this.getEntity();
        const updatedEntity = { ...mockEntity, ...updateDto };
        this.mockDb.select.mockResolvedValue([mockEntity]);
        const mockUpdate = {
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([updatedEntity]),
        };
        this.mockDb.update.mockReturnValue(mockUpdate);
        return {
            input: { id: 1, data: updateDto },
            expected: updatedEntity,
            mockEntity,
            updatedEntity,
            mockUpdate,
        };
    }
    getDeleteSuccessScenario() {
        const mockEntity = this.getEntity();
        this.mockDb.select.mockResolvedValue([mockEntity]);
        this.mockDb.delete.mockResolvedValue([{ affectedRows: 1 }]);
        return {
            input: 1,
            expected: true,
            mockEntity,
        };
    }
    getFindAllSuccessScenario() {
        const mockEntities = [this.getEntity(), this.getEntity()];
        const mockCountResult = [{ count: "2" }];
        this.mockDb.select
            .mockResolvedValueOnce(mockEntities)
            .mockResolvedValueOnce(mockCountResult);
        return {
            input: {},
            expected: {
                data: mockEntities,
                total: 2,
                page: 1,
                limit: 20,
            },
            mockEntities,
        };
    }
    resetMocks() {
        jest.clearAllMocks();
        this.setup();
    }
}
exports.BaseCrudSpecHelper = BaseCrudSpecHelper;
//# sourceMappingURL=base-crud.spec-helper.js.map