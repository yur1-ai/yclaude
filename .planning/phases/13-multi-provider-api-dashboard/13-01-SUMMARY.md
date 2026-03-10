---
phase: 13-multi-provider-api-dashboard
plan: 01
subsystem: api
tags: [hono, provider-filtering, multi-provider, tdd, api-endpoints]

# Dependency graph
requires:
  - phase: 12-cursor-provider
    provides: UnifiedEvent with provider field, CursorAdapter producing cursor events
provides:
  - filterByProvider helper on all API endpoints
  - /config returns loaded providers list
  - /summary returns providerBreakdown when unfiltered
  - /cost-over-time returns per-provider cost columns when unfiltered
  - /activity returns per-provider session counts when unfiltered
  - /sessions supports provider, costSource, sessionType filtering
  - /chats includes provider and costSource fields
  - /models includes dominant provider field
  - sessionType field on UnifiedEvent
affects: [13-02, 13-03, 13-04, frontend-provider-tabs]

# Tech tracking
tech-stack:
  added: []
  patterns: [filterByProvider helper pattern, providerBreakdown aggregation, dominant-provider tracking]

key-files:
  created:
    - src/server/__tests__/api-provider-filter.test.ts
  modified:
    - src/providers/types.ts
    - src/server/routes/api.ts
    - src/server/__tests__/api.test.ts
    - src/server/__tests__/api-chats.test.ts

key-decisions:
  - "filterByProvider applied at top of every endpoint handler before date filtering"
  - "providerBreakdown only returned when no ?provider= filter (avoids redundant single-provider breakdown)"
  - "sessionType filter allows events without sessionType to pass through (Claude events have no sessionType)"
  - "Dominant provider on model rows determined by highest event count for that model grouping"
  - "Existing tests updated from toEqual to toMatchObject for backward-compatible assertions with new fields"

patterns-established:
  - "filterByProvider: applied before date filtering in every endpoint"
  - "Per-provider data only included when no provider filter active (All-view pattern)"
  - "Provider/costSource from first event in session (all events in a session share same provider)"

requirements-completed: [PROV-04, CROSS-01, CROSS-02, CROSS-03]

# Metrics
duration: 12min
completed: 2026-03-10
---

# Phase 13 Plan 01: API Provider Overhaul Summary

**Provider-aware API layer with ?provider= filtering on all endpoints, providerBreakdown on /summary, per-provider columns on cost-over-time/activity, provider/costSource on session/chat/model rows, and sessionType filtering**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-10T03:30:22Z
- **Completed:** 2026-03-10T03:42:35Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 5

## Accomplishments
- All API endpoints now accept ?provider= query parameter for provider-scoped data
- /config returns loaded providers list enabling frontend tab rendering
- /summary includes providerBreakdown with per-provider cost, session count, and costSource
- /cost-over-time includes per-provider cost columns (claude, cursor, etc.) when unfiltered
- /activity includes per-provider session counts per day when unfiltered
- Sessions, chats, and models rows include provider and costSource fields
- /sessions supports ?sessionType= filter for Cursor composer/edit distinction
- sessionType field added to UnifiedEvent type
- 19 new provider filter tests + all 268 existing tests pass (zero regression)

## Task Commits

Each task was committed atomically (TDD flow):

1. **Task 1 RED: Failing tests** - `8f99403` (test)
2. **Task 1 GREEN: Implementation** - `fdf97a3` (feat)

**Plan metadata:** (pending)

_Note: TDD task has RED (failing tests) and GREEN (implementation) commits_

## Files Created/Modified
- `src/providers/types.ts` - Added sessionType optional field to UnifiedEvent
- `src/server/routes/api.ts` - Complete provider-aware overhaul: filterByProvider helper, providerBreakdown, per-provider columns, provider/costSource on rows, sessionType filter
- `src/server/__tests__/api-provider-filter.test.ts` - 19 tests covering all provider filtering behaviors
- `src/server/__tests__/api.test.ts` - Updated 2 assertions from toEqual to toMatchObject for new fields
- `src/server/__tests__/api-chats.test.ts` - Updated 2 config assertions from toEqual to toMatchObject

## Decisions Made
- filterByProvider helper applied at the top of every endpoint handler, before date filtering, maintaining consistent filtering order
- providerBreakdown only included in /summary response when no ?provider= filter is active (single-provider view doesn't need breakdown)
- sessionType filter uses pass-through semantics: events without sessionType (Claude) pass through when any sessionType filter is active
- Dominant provider on model rows determined by highest event count (not cost), enabling provider badge display
- Existing tests updated from strict toEqual to toMatchObject to remain backward-compatible with added response fields

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed existing test assertions for backward compatibility**
- **Found during:** Task 1 GREEN (implementation)
- **Issue:** 4 existing tests used toEqual which failed when new fields (providerBreakdown, per-provider columns, providers list) were added to responses
- **Fix:** Changed toEqual to toMatchObject in api.test.ts (2 assertions) and api-chats.test.ts (2 assertions) to allow additional fields
- **Files modified:** src/server/__tests__/api.test.ts, src/server/__tests__/api-chats.test.ts
- **Verification:** All 268 tests pass
- **Committed in:** fdf97a3

**2. [Rule 1 - Bug] Fixed TypeScript strict null check on breakdown object**
- **Found during:** Task 1 GREEN (implementation)
- **Issue:** TypeScript reported "Object is possibly undefined" on `breakdown[e.provider].cost` even though it was initialized in the line above
- **Fix:** Added non-null assertion with biome-ignore comment explaining the guarantee
- **Files modified:** src/server/routes/api.ts
- **Verification:** npx tsc --noEmit reports zero errors
- **Committed in:** fdf97a3

---

**Total deviations:** 2 auto-fixed (2 bug fixes)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None - plan executed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- API layer is COMPLETE - all subsequent plans (02, 03, 04) are frontend-only
- Frontend can query ?provider= on any endpoint to get provider-scoped data
- /config provides providers list for tab rendering
- Provider fields on rows enable provider badges in UI tables
- Per-provider columns on cost-over-time and activity enable stacked charts

## Self-Check: PASSED

All files exist, all commits verified. 268/268 tests pass. Zero TypeScript errors.

---
*Phase: 13-multi-provider-api-dashboard*
*Completed: 2026-03-10*
