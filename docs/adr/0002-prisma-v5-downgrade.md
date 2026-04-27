# ADR-0002: Downgrade Prisma ORM to v5

## Status
Accepted

## Context
Initial scaffold targeted Prisma 7 (latest), which shipped with breaking changes:
- Removed `url` from `datasource` block in `schema.prisma` (moved to `prisma.config.ts`)
- Removed support for `new PrismaClient()` without an explicit driver adapter or Accelerate URL
- SQLite support now requires `@prisma/adapter-better-sqlite3` or `@prisma/adapter-libsql`
- No support for native `enums` was already a SQLite constraint (unchanged)

These changes add significant setup complexity and introduce adapter dependencies not warranted for a single-container, single-restaurant workload.

## Decision
Pin Prisma ORM and `@prisma/client` at **v5.x** (`^5.22.0`).

Prisma 5 supports:
- Traditional `datasource url = env("DATABASE_URL")` in schema
- `new PrismaClient()` with zero extra dependencies
- SQLite natively without a driver adapter
- Active maintenance until Prisma 7 stabilises

## Consequences
- No breaking schema changes anticipated — migrating to Prisma 6/7 later is a minor upgrade once driver adapters are documented
- SQLite enums are still unsupported (Prisma 5 and 7 identical behaviour) — workaround: `String` fields with JSDoc comments documenting allowed values
- `prisma.config.ts` removed; `package.json` carries `prisma.seed` configuration via `prisma.config.ts` migration key
