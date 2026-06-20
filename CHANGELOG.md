# Changelog

All notable changes to `nestjs-drizzle-crud` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Scope note: the 3.0.x line is PostgreSQL-first. MySQL-specific paths (non-`RETURNING`
restore, `ER_DUP_ENTRY` mapping, dialect locking) are tracked separately and unchanged here.

## [3.0.3] - 2026-06-20

Correctness fix found while validating the package from a fresh NestJS consumer
(see `drizzle-pkg-demo`). PostgreSQL-first. Verified by 53 jest specs + 47 HTTP e2e assertions.

### Fixed
- **Case-insensitive string filters are now EXACT, not wildcard patterns.** A plain string
  value in a `findAll`/`count` filter (e.g. `{ name: "foo" }`) is documented as a
  case-insensitive *exact* match, but compiled to `ilike(column, value)` — so a value containing
  `%`, `_` or `\` was silently treated as a `LIKE` pattern and returned non-matching rows
  (e.g. `{ title: "a_b" }` matched `"aXb"`; `{ title: "a%" }` matched everything). It now compiles
  to `lower(column) = lower(value)`, so those characters are treated as literal data. The explicit
  `{ like }` / `{ ilike }` operators are unchanged for intentional pattern matching.

## [3.0.2] - 2026-06-19

Residual-edge hardening found by an end-to-end HTTP probe of 3.0.1 (all LOW severity;
no behavior change to the happy path). Verified by 35 HTTP assertions on Neon + 49 jest specs.

### Changed
- **`fullTextSearch` now returns the same envelope as `findAll`** — `{ data, total, page, limit }`
  instead of `{ data, total }`. `page`/`limit` are the resolved (clamped) values; the query is
  still only constrained when the caller passes `pagination`. Callers paginating search results
  can now read back the page/limit they got.

### Fixed
- **Invalid `sortOrder` now fails fast (400).** `?sortOrder=<anything but asc/desc>` previously
  fell through to ascending silently; it now throws `BadRequestException`, mirroring the
  unknown-`sortBy` check added in 3.0.1.
- **Non-finite numeric filter operands return 400, not 500.** A `{ gt: NaN }` / `{ lte: Infinity }`
  operand on `gt`/`gte`/`lt`/`lte` (e.g. from an unguarded `Number('abc')` in a controller) reached
  SQL and surfaced as an opaque `DatabaseException` (500). It is now rejected as
  `BadRequestException`. Non-number operands (dates, strings) are unaffected.

## [3.0.1] - 2026-06-19

Correctness pass: typed exceptions now map to real HTTP status codes, plus several read-path fixes.
(PostgreSQL-first.)

### Fixed
- **Exceptions extend `HttpException`** so Nest maps them automatically:
  `EntityNotFoundException` → 404, `DuplicateEntityException` → 409,
  `ValidationFailedException` / `BulkOperationException` → 400,
  `Database*` / `TransactionException` → 500. Previously every error surfaced as a generic 500.
- **Duplicate-key translation.** A Postgres unique violation (SQLSTATE `23505`, on either
  `err.code` or the Drizzle-wrapped `err.cause.code`) is converted to `DuplicateEntityException`
  (409), parsing the offending field/value from the driver `detail`.
- **`fullTextSearch` excludes soft-deleted rows** (added the `IS NULL` guard on the soft-delete
  column to both the data and count queries, matching `findAll`/`count`).
- **Pagination clamping.** `page < 1`, `limit <= 0`, and `limit > maxLimit` are clamped via a shared
  `resolvePagination` helper — no more negative `OFFSET` or `LIMIT 0`.
- **Unknown sort column fails fast.** A caller-supplied `sortBy` not on the table throws
  `BadRequestException`; an unknown column in a configured `defaultSort` is warned and skipped.
- **`restore()` returns the restored row** on the Postgres `RETURNING` path (no longer re-`find()`s,
  which would have excluded the just-restored row via the soft-delete filter).

### Added
- **Row-level lock options** on Postgres reads (`find`/`findOne`/`findAll`): `lock: 'update' | 'share'`
  and `forNoKeyUpdate` apply `.for(...)`. No-op on MySQL.

## [3.0.0] - 2026-06-19

- First release under the `nestjs-drizzle-crud` name with the 3.x API surface
  (`DrizzleCrudModule.forRoot`/`forRootAsync`/`forFeature`, `SqlBaseCrudService`).

## Earlier (≤ 2.2.0)

Published as `@quybquang/nestjs-drizzle-crud`. Notable: 2.2.0 added a configurable module-level
default sort; 2.1.2 documented the timestamps feature. See git history for details.

[3.0.3]: https://www.npmjs.com/package/nestjs-drizzle-crud/v/3.0.3
[3.0.2]: https://www.npmjs.com/package/nestjs-drizzle-crud/v/3.0.2
[3.0.1]: https://www.npmjs.com/package/nestjs-drizzle-crud/v/3.0.1
[3.0.0]: https://www.npmjs.com/package/nestjs-drizzle-crud/v/3.0.0
