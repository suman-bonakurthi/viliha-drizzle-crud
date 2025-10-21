import { SqlBaseCrudService } from "../core/abstract/sql-base-crud.service";
import { SqlCrudConfig } from "../core/interfaces/sql-crud-config.interface";

export class TestCrudFactory {
	static createTestService<T extends SqlBaseCrudService<any, any, any, any>>(
		ServiceClass: new (config: SqlCrudConfig) => T,
		mockDb: any,
		mockTable: any,
		configOverrides: Partial<SqlCrudConfig> = {},
	): T {
		const config: SqlCrudConfig = {
			dialect: "postgresql",
			db: mockDb,
			table: mockTable,
			primaryKey: "id",
			primaryKeyType: "serial",
			softDelete: { enabled: true, column: "deleted_at" },
			timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
			pagination: { defaultLimit: 20, maxLimit: 100 },
			sql: {
				caseSensitive: false,
				useReturning: true,
				jsonSupport: true,
				enableFullTextSearch: false,
			},
			...configOverrides,
		};

		return new ServiceClass(config);
	}

	static createMockDb() {
		const mockDb = {
			select: jest.fn().mockImplementation(() => ({
				from: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				offset: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				fields: jest.fn().mockReturnThis(),
			})),
			from: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			offset: jest.fn().mockReturnThis(),
			orderBy: jest.fn().mockReturnThis(),
			insert: jest.fn().mockImplementation(() => ({
				values: jest.fn().mockReturnThis(),
				returning: jest.fn(),
			})),
			values: jest.fn().mockReturnThis(),
			returning: jest.fn().mockReturnThis(),
			update: jest.fn().mockImplementation(() => ({
				set: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				returning: jest.fn(),
			})),
			set: jest.fn().mockReturnThis(),
			delete: jest.fn().mockImplementation(() => ({
				where: jest.fn().mockReturnThis(),
			})),
			transaction: jest.fn().mockImplementation((cb) => cb(mockDb)),
		};

		return mockDb;
	}

	static createMockTable() {
		return {
			id: "id",
			name: "name",
			email: "email",
			created_at: "created_at",
			updated_at: "updated_at",
			deleted_at: "deleted_at",
		};
	}

	static createMockEntity(overrides: any = {}) {
		return {
			id: 1,
			name: "Test Entity",
			email: "test@example.com",
			created_at: new Date(),
			updated_at: new Date(),
			...overrides,
		};
	}
}
