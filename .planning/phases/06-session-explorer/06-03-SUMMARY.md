---
phase: 06-session-explorer
plan: 03
subsystem: ui
tags: [react, recharts, react-query, react-router, typescript]

# Dependency graph
requires:
  - phase: 06-01
    provides: /api/v1/sessions/:id endpoint with TurnRow and SessionSummary types
  - phase: 06-02
    provides: Sessions list page with SortableTable component and routing foundation

provides:
  - useSessionDetail hook fetching /api/v1/sessions/:id with TurnRow/SessionSummary/SessionDetailData types
  - SessionDetail page with summary header, per-turn breakdown table, and cumulative cost line chart
  - sessions/:id child route registered in App.tsx hash router

affects:
  - 07-subagent-accounting
  - 09-distribution

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Session detail fetched via useQuery with 404 detection (res.status === 404 throws 'Session not found')"
    - "Multiple SortableTable columns sharing key: 'tokens' differentiated by label + render function"
    - "SortableTable column keys use index suffix to prevent React duplicate-key warnings with shared keys"

key-files:
  created:
    - web/src/hooks/useSessionDetail.ts
    - web/src/pages/SessionDetail.tsx
  modified:
    - web/src/App.tsx
    - web/src/components/SortableTable.tsx

key-decisions:
  - "TurnRow extends Record<string, unknown> — consistent with ModelRow/ProjectRow/SessionRow generic constraint pattern"
  - "Multiple columns with key: 'tokens' share same keyof TurnRow — non-sortable display columns use render prop; React key uniqueness achieved by appending column index in SortableTable"
  - "Recharts Tooltip formatter guards undefined: value != null ? format : '—' — consistent with project pattern"
  - "Summary stats rendered as static array (not SortableTable) — grid of label+value pairs more appropriate for metadata display"

patterns-established:
  - "Detail page structure: page-header (back + title), summary-card, table-card, chart-card with space-y-6 outer wrapper"
  - "Error state checks error.message === 'Session not found' to distinguish 404 from other failures"

requirements-completed: [SESS-02]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 6 Plan 03: Session Detail Page Summary

**Session detail page with per-turn token breakdown table and cumulative cost Recharts line chart wired to hash router at sessions/:id**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-01T06:20:40Z
- **Completed:** 2026-03-01T06:22:29Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `useSessionDetail` hook with full TypeScript types (TurnRow, SessionSummary, SessionDetailData) and 404-aware error handling
- Registered `sessions/:id` child route in App.tsx hash router
- Built `SessionDetail.tsx` with 3-section layout: 10-stat summary grid, 7-column sortable turn table, and Recharts cumulative cost line chart
- Auto-fixed SortableTable to use index-suffixed column keys preventing React duplicate-key warnings when multiple columns share the same `keyof T` value

## Task Commits

Each task was committed atomically:

1. **Task 1: useSessionDetail hook and App.tsx route registration** - `d6c46c6` (feat)
2. **Task 2: SessionDetail.tsx page** - `c205897` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `web/src/hooks/useSessionDetail.ts` - TurnRow, SessionSummary, SessionDetailData interfaces + useSessionDetail query hook
- `web/src/pages/SessionDetail.tsx` - Full detail page: summary header, per-turn SortableTable, Recharts LineChart
- `web/src/App.tsx` - Added SessionDetail import and `{ path: 'sessions/:id', element: <SessionDetail /> }` child route
- `web/src/components/SortableTable.tsx` - Auto-fix: column key suffix with index to prevent React duplicate-key warnings

## Decisions Made
- Columns with `key: 'tokens'` share the same `keyof TurnRow` value — plan explicitly endorsed this approach for non-sortable display columns with different render functions. React key uniqueness resolved by appending `colIdx` in SortableTable.
- Summary stats displayed as a static grid (not SortableTable) since metadata fields have heterogeneous types and aren't sortable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed React duplicate-key warnings in SortableTable column rendering**
- **Found during:** Task 2 (SessionDetail.tsx implementation — multiple columns with `key: 'tokens'`)
- **Issue:** SortableTable used `String(col.key)` as React key for `th` and `td` elements. Multiple columns with `key: 'tokens'` would produce duplicate React keys causing warnings.
- **Fix:** Changed keys to `${String(col.key)}-${colIdx}` for both `th` and `td` rendering loops
- **Files modified:** `web/src/components/SortableTable.tsx`
- **Verification:** TypeScript compiles cleanly; build succeeds
- **Committed in:** `d6c46c6` (Task 1 commit, included with hook and route changes)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix prevents React warnings without changing any visible behavior. No scope creep.

## Issues Encountered
None — plan executed cleanly. TypeScript compiled on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SESS-02 complete: Session detail page fully implemented
- Phase 6 is now complete (all 3 plans done)
- Phase 7 (subagent token accounting) can proceed; note existing blocker: confirm whether `isSidechain` events are additive to parent session totals before implementing sidechain aggregation

## Self-Check: PASSED

- `web/src/hooks/useSessionDetail.ts` — FOUND
- `web/src/pages/SessionDetail.tsx` — FOUND
- Commit d6c46c6 — FOUND (Task 1)
- Commit c205897 — FOUND (Task 2)

---
*Phase: 06-session-explorer*
*Completed: 2026-03-01*
