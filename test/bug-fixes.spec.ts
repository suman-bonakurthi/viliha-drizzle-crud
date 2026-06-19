/**
 * @jest-environment node
 *
 * Bug-reproduction + fix-verification specs (PostgreSQL-first).
 * Each `describe` targets one bug from the audit. Before the fixes these fail
 * (RED); after the fixes they pass (GREEN). Bug #2 (fullTextSearch soft-delete)
 * is filtering done in SQL and can't be proven with a dumb mock — it is verified
 * end-to-end in the HTTP lab instead (see drizzle-crud-lab/test/full-results.md).
 */

import { beforeEach, describe, expect, it } from "@jest/globals";
import {
	BadRequestException,
	ConflictException,
	HttpException,
} from "@nestjs/common";
import { SqlBaseCrudService } from "../src/core/abstract/sql-base-crud.service";
import {
	DuplicateEntityException,
	EntityNotFoundException,
	ValidationFailedException,
} from "../src/exceptions/crud.exceptions";
import { TestCrudFactory } from "../src/test-utils/test-factory";

interface E {
	id: number;
	name: string;
	email: string;
	deleted_at?: Date | null;
}
class Svc extends SqlBaseCrudService<E, any, any, any> {}

// A thenable query-builder mock: every chain method returns itself, and awaiting
// it resolves to `result`. Lets us assert which builder methods were called.
function chain(result: any) {
	const obj: any = {};
	for (const m of [
		"select",
		"from",
		"where",
		"limit",
		"offset",
		"orderBy",
		"for",
		"leftJoin",
		"set",
	]) {
		obj[m] = jest.fn(() => obj);
	}
	obj.then = (res: any, rej: any) => Promise.resolve(result).then(res, rej);
	return obj;
}

describe("Bug #1: exceptions map to HTTP status codes", () => {
	it("EntityNotFoundException is a 404 HttpException", () => {
		const e = new EntityNotFoundException("regions", 9999);
		expect(e).toBeInstanceOf(HttpException);
		expect((e as any).getStatus()).toBe(404);
	});

	it("DuplicateEntityException is a 409 HttpException", () => {
		const e = new DuplicateEntityException("regions", "code", "EU");
		expect(e).toBeInstanceOf(HttpException);
		expect((e as any).getStatus()).toBe(409);
	});

	it("ValidationFailedException is a 400 HttpException", () => {
		const e = new ValidationFailedException("bad");
		expect(e).toBeInstanceOf(HttpException);
		expect((e as any).getStatus()).toBe(400);
	});
});

describe("Bug #3: unique violation -> DuplicateEntityException (409)", () => {
	const mockTable = TestCrudFactory.createMockTable();

	it("translates a raw Postgres 23505 error", async () => {
		const insert: any = {
			values: jest.fn(() => insert),
			returning: jest.fn(() =>
				Promise.reject(Object.assign(new Error("dup"), { code: "23505" })),
			),
		};
		const db: any = { insert: jest.fn(() => insert) };
		const svc = TestCrudFactory.createTestService(Svc, db, mockTable);
		await expect(
			(svc as any).create({ name: "x", email: "y" }),
		).rejects.toBeInstanceOf(ConflictException);
	});

	it("translates a wrapped DrizzleQueryError (cause.code 23505)", async () => {
		const insert: any = {
			values: jest.fn(() => insert),
			returning: jest.fn(() =>
				Promise.reject(
					Object.assign(new Error("drizzle"), { cause: { code: "23505" } }),
				),
			),
		};
		const db: any = { insert: jest.fn(() => insert) };
		const svc = TestCrudFactory.createTestService(Svc, db, mockTable);
		await expect(
			(svc as any).create({ name: "x", email: "y" }),
		).rejects.toBeInstanceOf(ConflictException);
	});
});

describe("Bug #4: pagination clamping", () => {
	let svc: any;
	beforeEach(() => {
		svc = TestCrudFactory.createTestService(
			Svc,
			TestCrudFactory.createMockDb(),
			TestCrudFactory.createMockTable(),
		);
	});

	it("clamps limit <= 0 up to 1", () => {
		expect(svc.resolvePagination(1, 0).limit).toBe(1);
		expect(svc.resolvePagination(1, -5).limit).toBe(1);
	});

	it("clamps limit above maxLimit down to maxLimit", () => {
		expect(svc.resolvePagination(1, 9999).limit).toBe(100);
	});

	it("clamps page < 1 to page 1 and offset 0", () => {
		expect(svc.resolvePagination(0, 20)).toMatchObject({ page: 1, offset: 0 });
		expect(svc.resolvePagination(-3, 20)).toMatchObject({ page: 1, offset: 0 });
	});

	it("computes a non-negative offset for valid input", () => {
		expect(svc.resolvePagination(3, 10).offset).toBe(20);
	});
});

describe("Bug #5: unknown sort column fails fast", () => {
	let svc: any;
	beforeEach(() => {
		svc = TestCrudFactory.createTestService(
			Svc,
			TestCrudFactory.createMockDb(),
			TestCrudFactory.createMockTable(),
		);
	});

	it("throws BadRequest when caller sortBy is not a real column", () => {
		expect(() => svc.buildOrderBy("not_a_column", "asc")).toThrow(
			BadRequestException,
		);
	});

	it("still sorts by a valid column", () => {
		expect(svc.buildOrderBy("name", "asc")).toHaveLength(1);
	});
});

describe("Bug #6 (guard): restore returns the row on Postgres RETURNING path", () => {
	it("returns the restored row directly", async () => {
		const restored = { id: 1, name: "a", email: "b", deleted_at: null };
		const upd: any = {
			set: jest.fn(() => upd),
			where: jest.fn(() => upd),
			returning: jest.fn(() => Promise.resolve([restored])),
		};
		const db: any = { update: jest.fn(() => upd) };
		const svc = TestCrudFactory.createTestService(
			Svc,
			db,
			TestCrudFactory.createMockTable(),
		);
		await expect((svc as any).restore(1)).resolves.toEqual(restored);
	});
});

describe("Bug #7: lock options applied on Postgres reads", () => {
	it("appends .for('update') to find() when options.lock = 'update'", async () => {
		const q = chain([]);
		const db: any = { select: jest.fn(() => q) };
		const svc = TestCrudFactory.createTestService(
			Svc,
			db,
			TestCrudFactory.createMockTable(),
		);
		await (svc as any).find(1, { lock: "update" });
		expect(q.for).toHaveBeenCalledWith("update");
	});
});
