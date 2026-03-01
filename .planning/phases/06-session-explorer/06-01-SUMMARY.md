---
phase: 06-session-explorer
plan: 01
subsystem: api
tags: [hono, sessions, pagination, aggregation, vitest, tdd]

# Dependency graph
requires:
  - phase: 05-model-project-breakdowns
    provides: "assignProjectNames() helper and existing API route patterns in api.ts"
provides:
  - "GET /api/v1/sessions — paginated session list with project filter, date range, groupBy sessionId aggregation"
  - "GET /api/v1/sessions/:id — per-turn detail with cumulativeCost running total and 404 for unknown IDs"
  - "24 vitest tests covering all session endpoint behaviors"
affects:
  - 06-02-session-list-ui
  - 06-03-session-detail-ui

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD: RED (failing tests committed) then GREEN (implementation) cycle"
    - "Session grouping: Map<sessionId, events[]> from state.costs, token-bearing filter at row level"
    - "durationMs: Math.max across ALL events (not just token-bearing) — system/turn_duration events included"
    - "costUsd sum across all events per session; token sums only from events where e.tokens !== undefined"
    - "Explicit field construction in turns — never spread raw CostEvent to prevent prose leakage"

key-files:
  created:
    - src/server/__tests__/api-sessions.test.ts
  modified:
    - src/server/routes/api.ts

key-decisions:
  - "PAGE_SIZE=50 defined as local constant inside route handler, not exported or global"
  - "Sessions with zero token-bearing events are fully excluded from list results"
  - "durationMs uses Math.max across ALL events per session — non-token events (system/turn_duration) may carry larger values"
  - "TurnRow and SessionSummary interfaces are local (not exported) — matches SessionRow pattern from plan"
  - "displayName for /sessions/:id uses assignProjectNames([cwd]).get(cwd) — single-item call"

patterns-established:
  - "Session aggregation pattern: collect ALL events into Map, then filter token-bearing at field-level for token sums/model arrays"
  - "Response safety: explicit field construction prevents raw CostEvent fields (including prose) from leaking into API responses"

requirements-completed:
  - SESS-01
  - SESS-02

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 6 Plan 01: Session API Routes Summary

**Hono session API with paginated list (50/page), date/project filters, and per-turn detail with running cumulativeCost — backed by 24 vitest tests**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T06:12:10Z
- **Completed:** 2026-03-01T06:14:49Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced the `/sessions` stub with full groupBy sessionId aggregation: date filtering, project filtering, pagination (50/page), multi-model detection, durationMs from all events
- Added `/sessions/:id` route returning `{ summary, turns }` with 1-indexed turns, running cumulativeCost, and 404 for unknown IDs
- 24 vitest tests covering all behaviors: shape, grouping, exclusion of zero-token sessions, pagination slices, project/date filters, durationMs sourcing, model/Mixed, 400 on bad dates, 404 for unknown ID, cumulativeCost running total, no prose fields in response

## Task Commits

Each task was committed atomically:

1. **RED: Failing tests** - `470a013` (test) - `src/server/__tests__/api-sessions.test.ts`
2. **GREEN: Both routes implemented** - `9008604` (feat) - `src/server/routes/api.ts`

**Plan metadata:** (final docs commit — see below)

_Note: TDD tasks have two commits (test → feat). Both API routes were implemented together since they share the same file._

## Files Created/Modified

- `src/server/__tests__/api-sessions.test.ts` - 24 vitest tests for both session endpoints (24 tests, all passing)
- `src/server/routes/api.ts` - Replaced `/sessions` stub; added `/sessions/:id` with full aggregation logic

## Decisions Made

- PAGE_SIZE=50 as local constant inside route handler — plan specified this explicitly
- Sessions with zero token-bearing events are excluded entirely from list results
- durationMs is `Math.max` across ALL events (not just token-bearing), null if none have it
- `model` field is `'Mixed'` when session contains 2+ distinct models; `models[]` array carries all distinct names for tooltip
- Explicit field construction in `TurnRow` (never spread raw CostEvent) — prevents prose/content fields from leaking
- `assignProjectNames([cwd])` for single-item call in detail endpoint — avoids passing full set when only one cwd needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both API endpoints are live and passing all 24 tests; typecheck clean
- Plans 02 (session list UI) and 03 (session detail UI) can build against these data contracts immediately
- `useSessions` and `useSessionDetail` hooks will call `/api/v1/sessions` and `/api/v1/sessions/:id` respectively
- Response shapes are stable: `{ sessions, total, page, pageSize }` for list; `{ summary, turns }` for detail

## Self-Check: PASSED

- FOUND: `src/server/__tests__/api-sessions.test.ts`
- FOUND: `src/server/routes/api.ts`
- FOUND: `.planning/phases/06-session-explorer/06-01-SUMMARY.md`
- FOUND: commit `470a013` (test: RED phase)
- FOUND: commit `9008604` (feat: GREEN phase)

---
*Phase: 06-session-explorer*
*Completed: 2026-03-01*
