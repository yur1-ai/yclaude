---
phase: 11-provider-abstraction-layer
plan: 01
subsystem: api
tags: [provider-abstraction, adapter-pattern, typescript, refactor]

# Dependency graph
requires:
  - phase: "v1.1 (prior milestone)"
    provides: "parser, cost engine, privacy filter"
provides:
  - "UnifiedEvent type with shared + provider-specific fields"
  - "ProviderAdapter interface (detect/load)"
  - "ClaudeAdapter wrapping existing JSONL pipeline"
  - "loadProviders() registry with parallel detect/load"
  - "CursorAdapter and OpenCodeAdapter stubs"
affects: [11-02-consumer-rewiring, 11-03-cli-test-migration, 12-cursor-provider, 14-opencode-provider]

# Tech tracking
tech-stack:
  added: []
  patterns: [provider-adapter-pattern, conditional-spread-for-exactOptionalPropertyTypes, parallel-detect-load-registry]

key-files:
  created:
    - src/providers/types.ts
    - src/providers/registry.ts
    - src/providers/claude/adapter.ts
    - src/providers/cursor/adapter.ts
    - src/providers/opencode/adapter.ts
  modified:
    - src/providers/claude/parser/reader.ts
    - src/providers/claude/parser/dedup.ts
    - src/providers/claude/cost/engine.ts

key-decisions:
  - "Conditional spread pattern for all optional UnifiedEvent fields to satisfy exactOptionalPropertyTypes"
  - "EstimatedCost brand stripped via cast-to-number in adapter; costSource tag replaces branded type"
  - "Registry returns ProviderInfo for ALL adapters including excluded and not-found"

patterns-established:
  - "Provider adapter pattern: implement detect() + load() returning UnifiedEvent[]"
  - "Conditional spread for optional fields: ...(val !== undefined ? { key: val } : {})"
  - "Error-isolated parallel loading: each provider fails independently"

requirements-completed: [PROV-01]

# Metrics
duration: 3min
completed: 2026-03-07
---

# Phase 11 Plan 01: Provider Abstraction Layer Summary

**Provider adapter infrastructure with UnifiedEvent type, Claude adapter wrapping existing JSONL/cost pipeline, and parallel-loading registry**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-07T08:46:46Z
- **Completed:** 2026-03-07T08:50:11Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Provider abstraction types defined: UnifiedEvent, ProviderAdapter, ProviderInfo, LoadOptions, ProviderId, CostSource
- All 9 Claude source files moved to src/providers/claude/ with git history preserved
- ClaudeAdapter wraps existing parse -> privacy -> cost pipeline into UnifiedEvent[]
- Registry orchestrates parallel detection and loading with error isolation
- Cursor and OpenCode stub adapters ready for Phase 12 and 14 implementation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create provider types and move Claude code** - `9a8ccbc` (feat)
2. **Task 2: Create Claude adapter, registry, and stub adapters** - `0d097cc` (feat)

## Files Created/Modified
- `src/providers/types.ts` - UnifiedEvent, ProviderAdapter, ProviderInfo, LoadOptions, ProviderId, CostSource
- `src/providers/registry.ts` - loadProviders() with parallel detect/load and exclude filtering
- `src/providers/claude/adapter.ts` - ClaudeAdapter implementing full JSONL pipeline to UnifiedEvent
- `src/providers/cursor/adapter.ts` - CursorAdapter stub (detect returns false)
- `src/providers/opencode/adapter.ts` - OpenCodeAdapter stub (detect returns false)
- `src/providers/claude/parser/reader.ts` - Moved from src/parser/, fixed debug import path
- `src/providers/claude/parser/normalizer.ts` - Moved from src/parser/
- `src/providers/claude/parser/dedup.ts` - Moved from src/parser/, fixed debug import path
- `src/providers/claude/parser/schema.ts` - Moved from src/parser/
- `src/providers/claude/parser/types.ts` - Moved from src/parser/
- `src/providers/claude/cost/engine.ts` - Moved from src/cost/, fixed debug import path
- `src/providers/claude/cost/pricing.ts` - Moved from src/cost/
- `src/providers/claude/cost/privacy.ts` - Moved from src/cost/
- `src/providers/claude/cost/types.ts` - Moved from src/cost/

## Decisions Made
- Used conditional spread pattern (`...(val !== undefined ? { key: val } : {})`) throughout adapter to satisfy `exactOptionalPropertyTypes: true` in tsconfig
- Stripped EstimatedCost branded type by casting to number in adapter; costSource field replaces the brand semantics
- Registry returns ProviderInfo for ALL known adapters (including excluded/not-found) to support startup banner display
- Message field extracted from passthrough data via Record cast for conversation content support

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Import path fixes (reader.ts, dedup.ts, engine.ts) were not captured in the Task 1 commit because `git mv` staged the original content and the Edit tool changes remained unstaged. Included in the Task 2 commit instead. No functional impact.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Provider types and registry ready for Plan 02 (consumer rewiring of api.ts, server.ts, index.ts)
- Test files still reference old import paths in src/parser/__tests__/ and src/cost/__tests__/ -- Plan 03 will migrate them
- src/index.ts and src/server/ consumers still import from old paths -- Plan 02 will rewire them

## Self-Check: PASSED

All 14 source files verified at expected locations. Both task commits (9a8ccbc, 0d097cc) confirmed in git log. Zero TypeScript errors in src/providers/ directory.

---
*Phase: 11-provider-abstraction-layer*
*Completed: 2026-03-07*
