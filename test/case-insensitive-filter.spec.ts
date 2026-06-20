/**
 * @jest-environment node
 *
 * Regression: a plain string value in a filter is documented as a
 * case-insensitive *exact* match (when `sql.caseSensitive === false`). It must
 * compile to `lower(column) = lower(value)`, NOT `ilike(column, value)`.
 *
 * `ilike` treats `%`, `_` and `\` in the value as wildcards/escapes, which
 * silently turns an equality filter into a pattern match — e.g. `{ name: "a_b" }`
 * would match "aXb", and `{ name: "a%" }` would match everything. Pattern
 * matching must be opt-in via the explicit `{ like }` / `{ ilike }` operators.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";
import { PgDialect, pgTable, serial, varchar } from "drizzle-orm/pg-core";
import { SqlBaseCrudService } from "../src/core/abstract/sql-base-crud.service";
import { TestCrudFactory } from "../src/test-utils/test-factory";

// A real Drizzle table so conditions render to actual SQL.
const items = pgTable("items", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 255 }),
});

interface Item {
	id: number;
	name: string;
}
interface ItemFilter {
	name?: string | Record<string, unknown> | string[];
}

class ItemService extends SqlBaseCrudService<Item, any, any, ItemFilter> {
	protected mapCreateDtoToEntity(data: any): Record<string, any> {
		return { ...data };
	}
	protected mapUpdateDtoToEntity(data: any): Record<string, any> {
		return { ...data };
	}
}

describe("case-insensitive string filter is EXACT, not a wildcard pattern", () => {
	const dialect = new PgDialect();
	let service: ItemService;

	// Render the first WHERE condition produced for `filters` to lower-cased SQL.
	const render = (filters: ItemFilter): string => {
		const conditions = (service as any).buildWhereConditions(filters);
		return dialect.sqlToQuery(conditions[0]).sql.toLowerCase();
	};

	beforeEach(() => {
		// Default factory config sets sql.caseSensitive === false.
		service = TestCrudFactory.createTestService(
			ItemService,
			TestCrudFactory.createMockDb(),
			items,
		);
	});

	it("compiles a plain string to lower(col) = lower(val), not ILIKE", () => {
		const sql = render({ name: "Foo" });
		expect(sql).toContain("lower(");
		expect(sql).not.toContain("ilike");
	});

	it("treats % as a literal character (no wildcard semantics)", () => {
		// Same SQL shape as a value with no special chars: the `%` lives in the
		// bound parameters, never in the rendered SQL.
		expect(render({ name: "a%b" })).toBe(render({ name: "axb" }));
		expect(render({ name: "a%b" })).not.toContain("ilike");
	});

	it("treats _ as a literal character (no wildcard semantics)", () => {
		expect(render({ name: "a_b" })).toBe(render({ name: "axb" }));
	});

	it("still uses ILIKE for the explicit { ilike } operator", () => {
		expect(render({ name: { ilike: "a%" } })).toContain("ilike");
	});

	it("still uses IN (...) for array values", () => {
		expect(render({ name: ["a", "b"] })).toContain("in (");
	});
});
