import { SqlBaseCrudService } from "../core/abstract/sql-base-crud.service";
import { TestCrudFactory } from "./test-factory";

export class BaseCrudSpecHelper<T extends Record<string, any>, C, U, F> {
	protected service: SqlBaseCrudService<T, C, U, F>;
	protected mockDb: any;
	protected mockTable: any;

	constructor(
		protected getServiceClass: () => new (
			config: any,
		) => SqlBaseCrudService<T, C, U, F>,
		protected getMockTable: () => any,
		protected getCreateDto: () => C,
		protected getUpdateDto: () => U,
		protected getEntity: () => T,
	) {
		this.setup();
	}

	protected setup() {
		this.mockDb = TestCrudFactory.createMockDb();
		this.mockTable = this.getMockTable();

		this.service = TestCrudFactory.createTestService(
			this.getServiceClass(),
			this.mockDb,
			this.mockTable,
		);
	}

	// Test data getters
	getCreateDtoData(): C {
		return this.getCreateDto();
	}

	getUpdateDtoData(): U {
		return this.getUpdateDto();
	}

	getEntityData(): T {
		return this.getEntity();
	}

	// Test scenarios
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

		// Proper mock chaining
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

		// Use mockResolvedValueOnce for sequential calls
		this.mockDb.select
			.mockResolvedValueOnce(mockEntities) // First call - data
			.mockResolvedValueOnce(mockCountResult); // Second call - count

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

	// Reset mocks between tests
	resetMocks() {
		jest.clearAllMocks();
		this.setup();
	}
}
