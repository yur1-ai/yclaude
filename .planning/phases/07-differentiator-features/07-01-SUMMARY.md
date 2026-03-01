---
phase: 07-differentiator-features
plan: "01"
subsystem: api
tags: [hono, typescript, sessions, subagents, branches, activity, cost-over-time]

# Dependency graph
requires:
  - phase: 06-session-explorer
    provides: SessionRow/SessionSummary interfaces and /sessions route that this plan extends
provides:
  - gitBranch, hasSubagents, mainCostUsd, subagentCostUsd on /sessions list rows
  - ?branch= filter on /sessions endpoint
  - mainCostUsd, subagentCostUsd, hasSubagents on /sessions/:id summary
  - GET /branches returning sorted unique branch names
  - GET /activity returning gap-filled 365-day Activity[] with session counts and levels
  - GET /cost-over-time?bucket=hour with ?tz= IANA timezone support
affects: [07-02-branch-filter-ui, 07-03-activity-heatmap, 07-04-subagent-accounting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - isSidechain filter split: mainEvents = !isSidechain, sideEvents = isSidechain === true; costUsd always equals mainCostUsd + subagentCostUsd
    - getLocalHourKey() using Intl.DateTimeFormat with en-CA locale for ISO date part extraction
    - /activity gap-fill: iterate up to 366 days from Jan 1 UTC, break on year boundary; level = ceil((count/max)*4) clamped to 1-4

key-files:
  created: []
  modified:
    - src/server/routes/api.ts

key-decisions:
  - "costUsd on sessions list = mainCostUsd + subagentCostUsd (split computed, total unchanged for backward compat)"
  - "gitBranch on session = first event's gitBranch that has one (sorted ascending by timestamp); null if none"
  - "?branch= filter on /sessions applied before grouping by sessionId — filters events, not sessions"
  - "hour bucket skips gap-fill — consistent with week/month bucket behavior; only day bucket gap-fills"
  - "Intl.DateTimeFormat en-CA locale used for ISO-format date parts (YYYY-MM-DD format guaranteed)"

patterns-established:
  - "Intl.DateTimeFormat('en-CA') for local date string in YYYY-MM-DD format — no manual zero-padding needed"
  - "Subagent split: filter !isSidechain vs isSidechain === true (strict equality to avoid undefined true-ish)"

requirements-completed: [SESS-03, SESS-04, ANLT-09, ANLT-08]

# Metrics
duration: 1min
completed: 2026-03-01
---

# Phase 7 Plan 01: Backend API Extensions for Differentiator Features Summary

**Five targeted backend API changes: subagent cost split + branch on sessions, /branches and /activity endpoints, and hour timezone bucket on /cost-over-time**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-01T08:19:53Z
- **Completed:** 2026-03-01T08:30:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Extended SessionRow with gitBranch, hasSubagents, mainCostUsd, subagentCostUsd; costUsd always equals the split sum
- Added ?branch= filter to /sessions endpoint (applied at event level before session grouping)
- Extended SessionSummary (/sessions/:id) with mainCostUsd, subagentCostUsd, hasSubagents
- Added GET /branches returning sorted unique non-null gitBranch values across all events
- Added GET /activity?year=YYYY&tz=TZ returning gap-filled 365-day array with distinct session counts and quartile levels 0-4
- Added ?bucket=hour support to /cost-over-time using Intl.DateTimeFormat for timezone-aware bucketing via ?tz=

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend /sessions list and detail — subagent + branch fields** - `5589a83` (feat)
2. **Task 2: Add /branches and /activity endpoints + hour bucket to /cost-over-time** - `cb9e381` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/server/routes/api.ts` - All five backend changes: SessionRow/SessionSummary extensions, ?branch= filter, /branches route, /activity route, getLocalHourKey() helper, hour bucket case

## Decisions Made
- `costUsd` on the /sessions list rows is now computed as `mainCostUsd + subagentCostUsd` (the sum is identical to the previous all-events reduce since both splits include all events). This preserves backward compatibility while making the split available.
- `?branch=` filter is applied at event level before grouping by sessionId. This means: if only some events of a session carry a branch tag, only those events are included, which may alter aggregates. This matches the `?project=` filter pattern already established.
- `/activity` counts distinct sessionIds per local date (not raw event count). This matches the intent of showing coding activity density, not API call volume.
- Hour bucket does not gap-fill. Week and month buckets don't gap-fill either; only day bucket does when both from/to bounds are provided. Keeping hourly consistent.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three Wave 2 frontend plans (07-02, 07-03, 07-04) can now run in parallel
- 07-02 (Branch Filter UI): consumes /branches + ?branch= filter on /sessions
- 07-03 (Activity Heatmap): consumes /activity?year=YYYY&tz=TZ
- 07-04 (Subagent Accounting UI): consumes hasSubagents, mainCostUsd, subagentCostUsd on sessions list and detail
- TypeScript compiles clean; no new dependencies required

---
*Phase: 07-differentiator-features*
*Completed: 2026-03-01*

## Self-Check: PASSED

- src/server/routes/api.ts: FOUND
- 07-01-SUMMARY.md: FOUND
- Commit 5589a83 (Task 1): FOUND
- Commit cb9e381 (Task 2): FOUND
