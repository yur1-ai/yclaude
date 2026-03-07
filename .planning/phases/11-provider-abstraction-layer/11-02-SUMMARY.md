---
phase: 11-provider-abstraction-layer
plan: 02
subsystem: api
tags: [provider-abstraction, unified-event, server-rewiring, api-migration]

# Dependency graph
requires:
  - phase: "11-01"
    provides: "UnifiedEvent type, ProviderInfo, loadProviders(), Claude adapter"
provides:
  - "AppState using UnifiedEvent[] + ProviderInfo[] (no costs/rawEvents)"
  - "All API routes consuming state.events instead of state.costs"
  - "Chat endpoints filtering by event.message instead of rawEvents array"
  - "Public npm API exporting loadProviders() (replaces parseAll/computeCosts)"
  - "All 76 server tests passing with UnifiedEvent-based helpers"
affects: [11-03-cli-test-migration, 12-cursor-provider, 14-opencode-provider]

# Tech tracking
tech-stack:
  added: []
  patterns: [unified-event-consumption, message-field-based-chat-filtering]

key-files:
  modified:
    - src/server/server.ts
    - src/server/routes/api.ts
    - src/index.ts
    - src/server/__tests__/api.test.ts
    - src/server/__tests__/api-sessions.test.ts
    - src/server/__tests__/api-chats.test.ts
    - src/server/__tests__/server.test.ts

key-decisions:
  - "Chat endpoints filter state.events by message !== undefined instead of separate rawEvents array"
  - "Chat list and chat detail summaries include provider field for multi-provider readiness"
  - "Public API exports only loadProviders and types -- parseAll/computeCosts are now internal"

patterns-established:
  - "Unified event consumption: all routes use state.events (single array) for both cost and content data"
  - "Message gating: chat features check event.message presence instead of separate rawEvents/costs arrays"

requirements-completed: [PROV-01]

# Metrics
duration: 7min
completed: 2026-03-07
---

# Phase 11 Plan 02: Consumer Rewiring Summary

**Server layer and public API rewired from CostEvent/NormalizedEvent to UnifiedEvent, with all 76 server tests passing**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-07T08:52:52Z
- **Completed:** 2026-03-07T08:59:53Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- AppState simplified from 4 fields (events, costs, rawEvents, showMessages) to 3 fields (events, providers, showMessages)
- All 20+ occurrences of state.costs replaced with state.events across 10 API routes
- Chat endpoints use event.message field presence instead of separate rawEvents array
- Public npm API reduced to loadProviders() + type exports (clean break from old parseAll/computeCosts)
- Chat responses include provider field in summary for multi-provider readiness

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite AppState, api.ts, and index.ts to consume UnifiedEvent** - `ac29387` (feat)
2. **Task 2: Migrate server test files to UnifiedEvent-based helpers** - `ca50b66` (test)

## Files Created/Modified
- `src/server/server.ts` - AppState now uses UnifiedEvent[] + ProviderInfo[], removed CostEvent/NormalizedEvent imports
- `src/server/routes/api.ts` - All routes consume state.events; chat endpoints filter by message field; pricing import updated to providers/claude/cost/ path
- `src/index.ts` - New public API: exports loadProviders, UnifiedEvent, ProviderId, CostSource, ProviderAdapter, ProviderInfo, LoadOptions
- `src/server/__tests__/api.test.ts` - 22 tests using makeUnifiedEvent helper
- `src/server/__tests__/api-sessions.test.ts` - 24 tests using makeUnifiedEvent/makeNonTokenEvent helpers
- `src/server/__tests__/api-chats.test.ts` - 15 tests using unified events with message field (no rawEvents)
- `src/server/__tests__/server.test.ts` - 7 tests with { events: [], providers: [] } AppState

## Decisions Made
- Chat endpoints now filter `state.events` for `message !== undefined` instead of using a separate `rawEvents` array. This eliminates data duplication and simplifies the AppState interface.
- Added `provider` field to chat list items and chat detail summary responses, making them ready for multi-provider display without further API changes.
- Public API is a clean break: `loadProviders()` is the single entry point, old `parseAll`/`computeCosts` functions are now internal to the Claude adapter.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Server layer fully migrated to UnifiedEvent -- ready for Plan 03 (CLI and old test file migration)
- Old test files (src/parser/__tests__/, src/cost/__tests__/) still reference moved paths -- Plan 03 will update them
- CLI (src/server/cli.ts) still imports from old paths -- Plan 03 will rewire

---
*Phase: 11-provider-abstraction-layer*
*Completed: 2026-03-07*
