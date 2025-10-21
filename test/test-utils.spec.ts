// test/test-factory.spec.ts
import { TestCrudFactory } from "../src/test-utils/test-factory";

describe("TestCrudFactory", () => {
	describe("createMockDb", () => {
		it("should create a mock database with required methods", () => {
			const mockDb = TestCrudFactory.createMockDb();

			expect(mockDb.select).toBeDefined();
			expect(mockDb.from).toBeDefined();
			expect(mockDb.where).toBeDefined();
			expect(mockDb.limit).toBeDefined();
			expect(mockDb.offset).toBeDefined();
			expect(mockDb.orderBy).toBeDefined();
			expect(mockDb.insert).toBeDefined();
			expect(mockDb.update).toBeDefined();
			expect(mockDb.delete).toBeDefined();
			expect(mockDb.transaction).toBeDefined();
		});

		it("should have mock functions as jest.fn", () => {
			const mockDb = TestCrudFactory.createMockDb();

			expect(jest.isMockFunction(mockDb.select)).toBe(true);
			expect(jest.isMockFunction(mockDb.insert)).toBe(true);
			expect(jest.isMockFunction(mockDb.update)).toBe(true);
			expect(jest.isMockFunction(mockDb.delete)).toBe(true);
		});
	});

	describe("createMockTable", () => {
		it("should create a mock table with required columns", () => {
			const mockTable = TestCrudFactory.createMockTable();

			expect(mockTable.id).toBeDefined();
			expect(mockTable.name).toBeDefined();
			expect(mockTable.email).toBeDefined();
			expect(mockTable.created_at).toBeDefined();
			expect(mockTable.updated_at).toBeDefined();
			expect(mockTable.deleted_at).toBeDefined();
		});
	});

	describe("createMockEntity", () => {
		it("should create a mock entity with default values", () => {
			const mockEntity = TestCrudFactory.createMockEntity();

			expect(mockEntity.id).toBeDefined();
			expect(mockEntity.name).toBeDefined();
			expect(mockEntity.email).toBeDefined();
			expect(mockEntity.created_at).toBeDefined();
			expect(mockEntity.updated_at).toBeDefined();
		});

		it("should allow overrides", () => {
			const override = { id: 999, name: "Custom Name" };
			const mockEntity = TestCrudFactory.createMockEntity(override);

			expect(mockEntity.id).toBe(999);
			expect(mockEntity.name).toBe("Custom Name");
			expect(mockEntity.email).toBeDefined(); // Should still have default
		});
	});
});
