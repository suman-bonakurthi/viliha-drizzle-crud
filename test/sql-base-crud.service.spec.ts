// test/sql-base-crud.service.spec.ts
import { SqlBaseCrudService } from '../src/core/abstract/sql-base-crud.service';
import { TestCrudFactory } from '../src/test-utils/test-factory';

// Define test interfaces
interface TestEntity {
  id: number;
  name: string;
  email: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface TestCreateDto {
  name: string;
  email: string;
}

interface TestUpdateDto {
  name?: string;
  email?: string;
}

interface TestFilterDto {
  name?: string;
  email?: string;
}

// Create a concrete implementation for testing
class TestCrudService extends SqlBaseCrudService<
  TestEntity,
  TestCreateDto,
  TestUpdateDto,
  TestFilterDto
> {
  protected async validateCreate(data: TestCreateDto): Promise<void> {
    if (!data.name) throw new Error('Name is required');
  }

  protected async validateUpdate(
    id: any,
    data: TestUpdateDto
  ): Promise<void> {
    if (data.name && data.name.length < 2) throw new Error('Name too short');
  }

  protected mapCreateDtoToEntity(data: TestCreateDto): Record<string, any> {
    return { ...data };
  }

  protected mapUpdateDtoToEntity(data: TestUpdateDto): Record<string, any> {
    return { ...data };
  }
}

describe('SqlBaseCrudService', () => {
  let service: TestCrudService;
  let mockDb: any;
  let mockTable: any;

  beforeEach(() => {
    mockDb = TestCrudFactory.createMockDb();
    mockTable = TestCrudFactory.createMockTable();
    service = TestCrudFactory.createTestService(
      TestCrudService,
      mockDb,
      mockTable
    );
  });

  describe('find', () => {
    it('should find an entity by ID', async () => {
      const mockEntity = TestCrudFactory.createMockEntity();
      mockDb.select.mockResolvedValue([mockEntity]);
      
      const result = await service.find(1);
      expect(result).toEqual(mockEntity);
    });

    it('should return null when entity not found', async () => {
      mockDb.select.mockResolvedValue([]);
      
      const result = await service.find(999);
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const mockEntities = [
        TestCrudFactory.createMockEntity(),
        TestCrudFactory.createMockEntity({ id: 2 })
      ];
      const mockCountResult = [{ count: "2" }];

      mockDb.select
        .mockResolvedValueOnce(mockEntities) // First call - data
        .mockResolvedValueOnce(mockCountResult); // Second call - count

      const result = await service.findAll({}, { page: 1, limit: 20 });
      expect(result).toEqual({
        data: mockEntities,
        total: 2,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('create', () => {
    it('should create a new entity', async () => {
      const createDto = { name: 'Test Name', email: 'test@example.com' };
      const mockEntity = TestCrudFactory.createMockEntity();
      
      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockEntity]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.create(createDto);
      expect(result).toEqual(mockEntity);
      expect(mockDb.insert).toHaveBeenCalledWith(mockTable);
    });
  });

  describe('update', () => {
    it('should update an existing entity', async () => {
      const updateDto = { name: 'Updated Name' };
      const mockEntity = TestCrudFactory.createMockEntity();
      const updatedEntity = { ...mockEntity, ...updateDto };
      
      mockDb.select.mockResolvedValue([mockEntity]);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedEntity]),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await service.update(1, updateDto);
      expect(result).toEqual(updatedEntity);
    });
  });

  describe('delete', () => {
    it('should delete an entity', async () => {
      const mockEntity = TestCrudFactory.createMockEntity();
      mockDb.select.mockResolvedValue([mockEntity]);
      mockDb.delete.mockResolvedValue([{ affectedRows: 1 }]);

      const result = await service.delete(1);
      expect(result).toBe(true);
    });
  });

  describe('count', () => {
    it('should count entities', async () => {
      mockDb.select.mockResolvedValue([{ count: "5" }]);

      const count = await service.count();
      expect(count).toBe(5);
    });
  });

  describe('exists', () => {
    it('should check if entity exists', async () => {
      mockDb.select.mockResolvedValue([{ id: 1 }]);

      const exists = await service.exists(1);
      expect(exists).toBe(true);
    });
  });
});