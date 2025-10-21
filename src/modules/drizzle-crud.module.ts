import { DynamicModule, Module, Provider } from "@nestjs/common";
import { DrizzleCrudConfig } from "../core/interfaces/drizzle-crud-config.interface";
import { SqlCrudConfig } from "../core/interfaces/sql-crud-config.interface";

@Module({})
export class DrizzleCrudModule {
	static forRoot(config: DrizzleCrudConfig): DynamicModule {
		const drizzleCrudConfigProvider: Provider = {
			provide: "DRIZZLE_CRUD_CONFIG",
			useValue: {
				dialect: config.dialect,
				defaults: {
					softDelete: true,
					timestamps: true,
					pagination: { defaultLimit: 20, maxLimit: 100 },
					...config.defaults,
				},
				sql: {
					caseSensitive: false,
					useReturning: config.dialect === "postgresql",
					jsonSupport: true,
					enableFullTextSearch: false,
					...config.sql,
				},
				hooks: {
					enableGlobalHooks: false,
					...config.hooks,
				},
			},
		};

		return {
			module: DrizzleCrudModule,
			providers: [drizzleCrudConfigProvider],
			exports: [drizzleCrudConfigProvider],
			global: true,
		};
	}

	static forFeature(entities: Array<{ service: any }>): DynamicModule {
		const providers = entities.map((entity) => ({
			provide: entity.service,
			useFactory: (db: any, globalConfig: any) => {
				const config = Reflect.getMetadata("crud:config", entity.service);
				const finalConfig: SqlCrudConfig = {
					...globalConfig,
					...config,
					db,
					table: config.table,
				};
				return new entity.service(finalConfig);
			},
			inject: ["DRIZZLE_DB", "DRIZZLE_CRUD_CONFIG"],
		}));

		return {
			module: DrizzleCrudModule,
			providers,
			exports: providers,
		};
	}

	static forRootAsync(options: {
		imports?: any[];
		useFactory: (
			...args: any[]
		) => Promise<DrizzleCrudConfig> | DrizzleCrudConfig;
		inject?: any[];
	}): DynamicModule {
		const drizzleCrudConfigProvider: Provider = {
			provide: "DRIZZLE_CRUD_CONFIG",
			useFactory: options.useFactory,
			inject: options.inject || [],
		};

		return {
			module: DrizzleCrudModule,
			imports: options.imports || [],
			providers: [drizzleCrudConfigProvider],
			exports: [drizzleCrudConfigProvider],
			global: true,
		};
	}
}
