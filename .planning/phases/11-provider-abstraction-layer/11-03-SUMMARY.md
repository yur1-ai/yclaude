---
phase: 11-provider-abstraction-layer
plan: 03
subsystem: api
tags: [cli, provider-registry, auto-detection, vitest, test-migration]

# Dependency graph
requires:
  - phase: 11-01
    provides: "ProviderAdapter interface, ClaudeAdapter, loadProviders registry, stub adapters"
  - phase: 11-02
    provides: "AppState with UnifiedEvent[], ProviderInfo[], server consumer rewiring"
provides:
  - "CLI entry point using loadProviders() with auto-detection and startup banner"
  - "--exclude flag for provider opt-out"
  - "All parser/cost tests migrated to src/providers/claude/__tests__/"
  - "Registry-level tests with module mocking for adapter constructors"
  - "ClaudeAdapter unit tests with temp directory fixtures"
  - "194 total tests passing against provider-based code paths"
affects: [phase-12-cursor-provider, phase-13-multi-provider-dashboard, phase-14-opencode-provider]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.mock with class-based factory for constructor mocking"
    - "CLAUDE_CONFIG_DIR env var in test fixtures for detect() path control"
    - "Startup banner with ANSI-colored status icons per provider"

key-files:
  created:
    - src/providers/__tests__/registry.test.ts
    - src/providers/claude/__tests__/adapter.test.ts
  modified:
    - src/server/cli.ts
    - src/server/__tests__/cli.test.ts
    - src/providers/claude/__tests__/reader.test.ts
    - src/providers/claude/__tests__/normalizer.test.ts
    - src/providers/claude/__tests__/dedup.test.ts
    - src/providers/claude/__tests__/types.test.ts
    - src/providers/claude/__tests__/debug.test.ts
    - src/providers/claude/__tests__/index.test.ts
    - src/providers/claude/__tests__/engine.test.ts
    - src/providers/claude/__tests__/pricing.test.ts
    - src/providers/claude/__tests__/privacy.test.ts
    - src/providers/claude/__tests__/cost-types.test.ts

key-decisions:
  - "Class-based vi.mock factories instead of vi.fn() for constructor mocking in registry tests"
  - "CLAUDE_CONFIG_DIR env var + projects/ subdirectory structure for integration test fixtures"
  - "index.test.ts rewritten to test loadProviders() via registry rather than removed parseAll()"

patterns-established:
  - "Provider test fixtures: set CLAUDE_CONFIG_DIR to tmpDir, place JSONL under projects/*/session-*/*.jsonl"
  - "Registry mock pattern: state holders + class-based vi.mock + vi.resetModules + dynamic import"

requirements-completed: [PROV-01, PROV-02]

# Metrics
duration: 15min
completed: 2026-03-07
---

# Phase 11 Plan 03: CLI + Test Migration Summary

**CLI rewired to loadProviders() with auto-detection banner, all 194 tests migrated to provider-based paths with new registry and adapter test suites**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-07T08:53:38Z
- **Completed:** 2026-03-07T09:08:55Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- CLI entry point (cli.ts) fully rewired from parseAll/computeCosts/applyPrivacyFilter to single loadProviders() call with auto-detection
- Startup banner shows all known providers with ANSI-colored status icons (green checkmark for loaded, gray dash for not-found, yellow warning for errors)
- --exclude flag enables provider opt-out via comma-separated list
- All 10 parser/cost test files migrated to src/providers/claude/__tests__/ with corrected import paths
- New registry.test.ts with 6 tests covering detection, loading, error handling, exclude filtering, and parallel execution
- New adapter.test.ts with 8 tests covering ClaudeAdapter interface (id, name, detect, load, preserveContent, uuid mapping, tokens)
- index.test.ts fully rewritten to test loadProviders() integration (8 tests covering JSONL parsing, dedup, malformed lines, subagents, provider info)
- Full suite: 194 tests passing across 17 files, zero TypeScript errors, production build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite CLI with provider registry, --exclude flag, and startup banner** - `34288e4` (feat)
2. **Task 2: Migrate parser/cost tests and create provider tests** - `395beb8` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `src/server/cli.ts` - CLI entry point using loadProviders(), --exclude flag, startup banner with provider status
- `src/server/__tests__/cli.test.ts` - Updated CLI tests with --exclude and --debug flag coverage (13 tests)
- `src/providers/__tests__/registry.test.ts` - New registry tests with module mocking (6 tests)
- `src/providers/claude/__tests__/adapter.test.ts` - New ClaudeAdapter unit tests (8 tests)
- `src/providers/claude/__tests__/index.test.ts` - Rewritten to test loadProviders() integration (8 tests)
- `src/providers/claude/__tests__/reader.test.ts` - Import path: `../parser/reader.js`
- `src/providers/claude/__tests__/normalizer.test.ts` - Import path: `../parser/normalizer.js`
- `src/providers/claude/__tests__/dedup.test.ts` - Import paths: `../parser/dedup.js`, `../parser/types.js`
- `src/providers/claude/__tests__/types.test.ts` - Import paths: `../parser/schema.js`, `../parser/types.js`
- `src/providers/claude/__tests__/debug.test.ts` - Import path: `../../../shared/debug.js`
- `src/providers/claude/__tests__/engine.test.ts` - Import paths: `../parser/types.js`, `../cost/engine.js`, `../cost/types.js`
- `src/providers/claude/__tests__/pricing.test.ts` - Import path: `../cost/pricing.js`
- `src/providers/claude/__tests__/privacy.test.ts` - Import paths: `../parser/types.js`, `../cost/privacy.js`
- `src/providers/claude/__tests__/cost-types.test.ts` - Import paths: `../parser/types.js`, `../cost/types.js`

## Decisions Made
- **Class-based vi.mock factories**: Registry uses `new ClaudeAdapter()` constructor calls, so vi.fn() mocks fail with "not a constructor". Solved by using `class` syntax in mock factories with state holders for per-test configuration.
- **CLAUDE_CONFIG_DIR for integration tests**: The ClaudeAdapter's detect() uses CLAUDE_CONFIG_DIR to find JSONL files under `projects/**/*.jsonl`. Test fixtures must set this env var and place data in the correct subdirectory structure.
- **index.test.ts full rewrite**: Since parseAll() was removed from the public API, the integration test was rewritten to call loadProviders() directly, testing the same scenarios (empty dir, valid files, dedup, malformed lines, subagents, provider info) through the new API surface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed registry mock pattern for constructor compatibility**
- **Found during:** Task 2 (registry.test.ts creation)
- **Issue:** vi.mock with vi.fn() returned function mocks, but registry.ts calls `new ClaudeAdapter()` which requires a constructor. Error: "() => claude is not a constructor"
- **Fix:** Changed to class-based mock factories: `ClaudeAdapter: class { id = mockInstance.id; ... }` with external state holders reassigned per test via beforeEach
- **Files modified:** src/providers/__tests__/registry.test.ts
- **Verification:** All 6 registry tests pass
- **Committed in:** 395beb8

**2. [Rule 3 - Blocking] Fixed integration test fixture directory structure**
- **Found during:** Task 2 (index.test.ts rewrite)
- **Issue:** Tests called loadProviders({ dir: tmpDir }) but detect() searches CLAUDE_CONFIG_DIR/projects/**/*.jsonl, not dir/**/*.jsonl. Without CLAUDE_CONFIG_DIR set, detect() returned false and load() never ran.
- **Fix:** Set process.env.CLAUDE_CONFIG_DIR = tmpDir in beforeEach, placed JSONL test data under projects/test-project/session-1/ subdirectory
- **Files modified:** src/providers/claude/__tests__/index.test.ts
- **Verification:** All 8 integration tests pass
- **Committed in:** 395beb8

---

**Total deviations:** 2 auto-fixed (2 blocking issues)
**Impact on plan:** Both auto-fixes were necessary to make the test infrastructure work with the adapter pattern's constructor and file discovery requirements. No scope creep.

## Issues Encountered
- The old src/parser/ and src/cost/ directories were already empty (source files moved by Plan 01) -- removal was trivial with `rm -rf`.
- Plan 02 had uncommitted server test changes in 4 files, but these were outside Plan 03's scope and did not interfere with execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 11 is now complete: all 3 plans executed, all tests pass, TypeScript clean, production build succeeds
- The provider abstraction layer is fully operational with Claude Code as reference implementation
- Ready for Phase 12 (Cursor Provider): implement CursorAdapter with detect()/load() against state.vscdb
- Stub adapters for Cursor and OpenCode are in place, returning detect()=false until implemented

## Self-Check: PASSED

- All 14 files: FOUND
- Commit 34288e4: FOUND
- Commit 395beb8: FOUND
- src/parser/ directory: CONFIRMED removed
- src/cost/ directory: CONFIRMED removed

---
*Phase: 11-provider-abstraction-layer*
*Completed: 2026-03-07*
