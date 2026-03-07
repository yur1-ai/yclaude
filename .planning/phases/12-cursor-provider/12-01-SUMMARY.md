---
phase: 12-cursor-provider
plan: 01
subsystem: providers
tags: [cursor, sqlite, node-sqlite, zod, parser, state-vscdb]

# Dependency graph
requires:
  - phase: 11-provider-abstraction
    provides: UnifiedEvent type, ProviderAdapter interface, conditional spread pattern
provides:
  - Internal Cursor types (ComposerHead, ComposerFullData, RawBubble, ParsedSession)
  - Zod validation schemas with safeParse wrappers for bubble/composer JSON
  - Platform path resolution for macOS/Linux Cursor data directories
  - SQLite database access layer with read-only + BUSY fallback
  - Two-database parser pipeline (workspace heads + global bubbles -> UnifiedEvent[])
  - Synthetic SQLite fixture factory for deterministic testing
affects: [12-02-adapter, cursor-adapter, provider-registry]

# Tech tracking
tech-stack:
  added: [node:sqlite DatabaseSync]
  patterns: [two-database join, defensive JSON parsing with Zod, SQLITE_BUSY temp-copy fallback]

key-files:
  created:
    - src/providers/cursor/types.ts
    - src/providers/cursor/schema.ts
    - src/providers/cursor/paths.ts
    - src/providers/cursor/db.ts
    - src/providers/cursor/parser.ts
    - src/providers/cursor/__tests__/fixtures.ts
    - src/providers/cursor/__tests__/paths.test.ts
    - src/providers/cursor/__tests__/db.test.ts
    - src/providers/cursor/__tests__/parser.test.ts
  modified: []

key-decisions:
  - "node:sqlite DatabaseSync with readOnly:true for direct access, temp-copy fallback only on SQLITE_BUSY"
  - "Zod schemas with .passthrough() for forward compatibility with future Cursor schema versions"
  - "Cost distributed evenly across AI bubbles in a composer, raw costInCents preserved on first event"
  - "Model name derived from usageData keys (prefer non-default) with modelConfig.modelName fallback"
  - "isAgentic derived from composer head unifiedMode, not per-bubble isAgentic flag"

patterns-established:
  - "Two-database join: workspace DBs for composer heads + global DB for bubbles and full composer data"
  - "safeParse wrappers returning discriminated union { success: true, data } | { success: false, error }"
  - "Synthetic SQLite fixtures: createTestWorkspaceDb/createTestGlobalDb + sample helpers for deterministic tests"
  - "Table name validation allowlist to prevent SQL injection via table parameter"

requirements-completed: [CURS-01, CURS-02, CURS-03]

# Metrics
duration: 7min
completed: 2026-03-07
---

# Phase 12 Plan 01: Cursor Data Extraction Pipeline Summary

**Complete Cursor data extraction: types, Zod schemas, platform paths, SQLite access layer, and parser converting two-database architecture into UnifiedEvent arrays with cost, model, and agent mode extraction**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-07T16:56:01Z
- **Completed:** 2026-03-07T17:03:10Z
- **Tasks:** 3
- **Files created:** 9

## Accomplishments
- 5 implementation modules (types.ts, schema.ts, paths.ts, db.ts, parser.ts) providing complete Cursor data extraction
- 42 passing tests across 3 test files + 1 fixture helper covering CURS-01/02/03 requirements
- v2 and v3 bubble timestamp unification, cost extraction from sparse usageData, agent mode detection
- Graceful degradation for corrupt JSON, missing fields, unknown schema versions (no crashes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create internal types, Zod schemas, and platform paths** - `24f3664` (feat)
2. **Task 2: Create SQLite database access layer with tests** - `9366ac4` (feat)
3. **Task 3: Create parser with comprehensive tests (TDD)**
   - RED: `bbff064` (test) - 26 failing parser tests
   - GREEN: `c6a3cfb` (feat) - parser implementation passing all tests

## Files Created/Modified
- `src/providers/cursor/types.ts` - Internal types: ComposerHead, ComposerFullData, RawBubble, ParsedSession, ParseError, SchemaVersion
- `src/providers/cursor/schema.ts` - Zod schemas with passthrough() and safeParse wrappers for validation
- `src/providers/cursor/paths.ts` - Pure path construction for macOS/Linux Cursor data dirs (stable + Insiders)
- `src/providers/cursor/db.ts` - SQLite access layer with read-only + BUSY fallback, KV read, schema detection
- `src/providers/cursor/parser.ts` - Core parser: workspace heads + global bubbles -> UnifiedEvent[] with cost/model/agent extraction
- `src/providers/cursor/__tests__/fixtures.ts` - Synthetic SQLite factory and sample data helpers
- `src/providers/cursor/__tests__/paths.test.ts` - 7 tests for platform path resolution
- `src/providers/cursor/__tests__/db.test.ts` - 9 tests for database access, BLOB decoding, table validation
- `src/providers/cursor/__tests__/parser.test.ts` - 26 tests covering sessions, costs, agent mode, resilience, content

## Decisions Made
- Used `node:sqlite` DatabaseSync (built-in, zero deps) with readOnly option for direct access; temp copy only on SQLITE_BUSY
- Zod schemas use `.passthrough()` to allow unknown fields from future Cursor versions without breaking
- Cost distributed evenly across AI bubbles (`totalCostUsd / aiBubbleCount`) since cost data is per-composer not per-bubble
- Model name: prefer usageData keys that aren't 'default' (actual model IDs like 'claude-3.5-sonnet'), fall back to modelConfig.modelName
- isAgentic: derived from composer-level unifiedMode ('agent' = true, everything else = false), per CONTEXT.md decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript `exactOptionalPropertyTypes` required `unknown` intermediate cast when using `delete` operator on typed objects in tests (e.g., `delete (bubble as unknown as Record<string, unknown>).tokenCount`). Fixed inline in test file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 5 implementation modules ready for Plan 02's CursorAdapter to wire together
- Synthetic fixtures available for adapter integration tests
- Parser produces correct UnifiedEvent[] from two-database architecture

## Self-Check: PASSED

- All 10 files verified present on disk
- All 4 commits verified in git log (24f3664, 9366ac4, bbff064, c6a3cfb)
- 42/42 tests passing
- 0 TypeScript errors

---
*Phase: 12-cursor-provider*
*Completed: 2026-03-07*
