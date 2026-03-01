---
phase: 07-differentiator-features
plan: "04"
subsystem: ui
tags: [react, recharts, typescript, cost-over-time, hourly-bucket, timezone]

# Dependency graph
requires:
  - phase: 07-differentiator-features
    plan: "01"
    provides: hour bucket on /cost-over-time with IANA tz support (ANLT-09 backend)
provides:
  - Hourly bucket option in CostBarChart with 48h range guard and disabled state tooltip
  - HH:00 x-axis formatter using slice(11,13) on 'YYYY-MM-DDTHH' date strings
  - ?tz=IANA forwarded on all /cost-over-time requests from frontend
  - Auto-reset to 'day' when hourly view range widens past 48h
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "disabledWhen on BucketOption: function (from, to) => boolean — evaluated at render time, not once at declaration"
    - "HH:00 label via dateStr.slice(11, 13) — never new Date() on non-ISO strings like 'YYYY-MM-DDTHH'"
    - "Module-level Intl constant: const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone — computed once, not per-render"
    - "useEffect bucket reset: watches [from, to, bucket] — stable setBucket from useState requires no useCallback"

key-files:
  created: []
  modified:
    - web/src/hooks/useCostOverTime.ts
    - web/src/components/CostBarChart.tsx
    - web/src/pages/Overview.tsx

key-decisions:
  - "HH:00 label uses dateStr.slice(11,13) not new Date(dateStr) — backend returns 'YYYY-MM-DDTHH' which is not valid ISO; new Date() would produce 'Invalid Date'"
  - "LOCAL_TZ computed once at module load (not on each render) to avoid repeated Intl.DateTimeFormat calls"
  - "?tz= always sent on all bucket requests (not just hour) — backend ignores it for day/week/month; simplifies client logic"
  - "from/to passed as props to CostBarChart (not imported from store inside component) — keeps component testable and decoupled"
  - "Hourly disabled when from/to undefined (no range selected) — safer than guessing"

patterns-established:
  - "BucketOption.disabledWhen: evaluated lazily at button render with current from/to — extensible for future bucket constraints"
  - "Tooltip via CSS-only group-hover on wrapping div — no JS state, no tooltip library needed"

requirements-completed: [ANLT-09]

# Metrics
duration: 5min
completed: 2026-03-01
---

# Phase 7 Plan 04: Hourly Chart Bucket Summary

**Hourly bucket for CostBarChart: 4-button toggle with 48h range guard, CSS-only tooltip, HH:00 x-axis labels, and IANA timezone forwarding on all /cost-over-time requests**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-01T08:32:34Z
- **Completed:** 2026-03-01T08:33:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Extended `Bucket` type to include `'hour'`; `LOCAL_TZ` constant computed once at module load and included in queryKey and fetch params
- Added 4th Hourly button to CostBarChart with `disabledWhen` guard (disabled when range > 48h or undefined)
- CSS-only tooltip on disabled Hourly button via `group-hover` — no JS state, no library
- `makeFormatter` handles `'hour'` bucket via `dateStr.slice(11, 13)` to produce `HH:00` labels safely (backend returns non-ISO `YYYY-MM-DDTHH` strings)
- `useEffect` in Overview auto-resets bucket to `'day'` when hourly is active and date range widens past 48h
- `from`/`to` passed as props from Overview to CostBarChart for disabled guard evaluation

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend useCostOverTime with 'hour' Bucket type and timezone forwarding** - `b7765e1` (feat)
2. **Task 2: Add Hourly bucket to CostBarChart with disabled state and HH:00 formatter; reset guard in Overview** - `19ee271` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `web/src/hooks/useCostOverTime.ts` - Added 'hour' to Bucket type; LOCAL_TZ module constant; ?tz= in all fetch requests; tz in queryKey
- `web/src/components/CostBarChart.tsx` - BucketOption.disabledWhen; 4-button BUCKETS array with Hourly; disabled styling; CSS-only tooltip; HH:00 makeFormatter case; from/to props
- `web/src/pages/Overview.tsx` - Destructure from/to from store; pass to CostBarChart; useEffect bucket reset guard

## Decisions Made
- `HH:00` label uses `dateStr.slice(11, 13)` not `new Date(dateStr)` — backend returns `'YYYY-MM-DDTHH'` which is not valid ISO; `new Date()` would produce `'Invalid Date'` for this format
- `LOCAL_TZ` computed once at module load (not per-render) to avoid unnecessary repeated Intl API calls
- `?tz=` always sent on all bucket requests — backend ignores for non-hour buckets, simplifying client-side conditional logic
- `from`/`to` passed as props to `CostBarChart` rather than imported from store inside component — keeps component testable and decoupled from global state
- Hourly button disabled when `from` or `to` is `undefined` (no range) — conservative, safe default

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 7 is now fully complete (all 4 plans: 07-01 through 07-04)
- All v1.1 differentiator features shipped: subagent accounting, branch filter, activity heatmap, hourly chart
- Ready for Phase 8 (distribution / npm publish) or Phase 9.1 (cost accuracy for Pro/Max users)

---
*Phase: 07-differentiator-features*
*Completed: 2026-03-01*

## Self-Check: PASSED

- web/src/hooks/useCostOverTime.ts: FOUND
- web/src/components/CostBarChart.tsx: FOUND
- web/src/pages/Overview.tsx: FOUND
- .planning/phases/07-differentiator-features/07-04-SUMMARY.md: FOUND
- Commit b7765e1 (Task 1): FOUND
- Commit 19ee271 (Task 2): FOUND
