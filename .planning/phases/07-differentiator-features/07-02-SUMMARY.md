---
phase: 07-differentiator-features
plan: "02"
subsystem: ui
tags: [react, typescript, tanstack-query, tailwind, sessions, subagents, branches, filtering]

# Dependency graph
requires:
  - phase: 07-differentiator-features
    plan: "01"
    provides: gitBranch/hasSubagents/mainCostUsd/subagentCostUsd on /sessions; /branches endpoint; subagent fields on /sessions/:id summary
provides:
  - SubagentBadge amber chip component in sessions table model column
  - Branch column (gitBranch) in Sessions page table
  - Branch filter dropdown (local state) narrowing session list by git branch
  - useBranches hook fetching /api/v1/branches
  - Main Thread + Subagents cost split in SessionDetail summary card
affects: [07-03-activity-heatmap, 07-04-subagent-accounting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - branchFilter as local useState in Sessions.tsx (NOT Zustand) — prevents filter from leaking into Overview stats
    - SubagentBadge rendered inline in model column render prop using row.hasSubagents conditional
    - Branch dropdown mirrors project filter pattern exactly (empty string → null, select → set)
    - queryKey includes branchFilter to prevent stale cache when filter changes
    - SessionSummary optional fields (mainCostUsd?, subagentCostUsd?, hasSubagents?) for backward safety

key-files:
  created:
    - web/src/components/SubagentBadge.tsx
    - web/src/hooks/useBranches.ts
  modified:
    - web/src/hooks/useSessions.ts
    - web/src/hooks/useSessionDetail.ts
    - web/src/pages/Sessions.tsx
    - web/src/pages/SessionDetail.tsx

key-decisions:
  - "branchFilter lives only in Sessions.tsx local state, not Zustand — prevents leaking into Overview stats (pitfall 6 from research)"
  - "SessionSummary new fields (mainCostUsd, subagentCostUsd, hasSubagents) are optional in TypeScript for backward safety"
  - "SubagentBadge rendered in model column render prop (not a separate column) — keeps badge contextually linked to model info"

patterns-established:
  - "Local filter state pattern: branchFilter as useState in page component, passed as param to hook, NOT in Zustand global store"
  - "Conditional stats array spread: ...(condition ? [extra entries] : [single entry]) pattern for dynamic summary card stats"

requirements-completed: [SESS-03, SESS-04]

# Metrics
duration: 10min
completed: 2026-03-01
---

# Phase 7 Plan 02: Sessions Page Upgrades for Branch Filtering and Subagent Analysis Summary

**SubagentBadge chip + branch filter dropdown + gitBranch column in Sessions; Main Thread/Subagents cost split in SessionDetail**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-01T08:24:40Z
- **Completed:** 2026-03-01T08:35:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created SubagentBadge amber chip component shown in model column when session used subagents
- Added useBranches hook fetching /api/v1/branches and branch filter dropdown to Sessions page
- Added gitBranch column to Sessions table with monospace font and '—' null sentinel
- Extended useSessions to accept branchFilter, include in queryKey and URL params
- SessionDetail summary card now conditionally splits cost into Total / Main Thread / Subagents

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SubagentBadge, useBranches hook, and update useSessions** - `7437fba` (feat)
2. **Task 2: Update Sessions.tsx (branch column + filter) and SessionDetail.tsx (cost split)** - `df075ae` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `web/src/components/SubagentBadge.tsx` - Amber "Multi-agent" chip component for session rows using subagents
- `web/src/hooks/useBranches.ts` - React Query hook fetching /api/v1/branches returning { branches: string[] }
- `web/src/hooks/useSessions.ts` - Added gitBranch/hasSubagents/mainCostUsd/subagentCostUsd to SessionRow; added branchFilter param
- `web/src/hooks/useSessionDetail.ts` - Added optional mainCostUsd/subagentCostUsd/hasSubagents to SessionSummary interface
- `web/src/pages/Sessions.tsx` - Branch column, branch filter dropdown (local state), SubagentBadge in model column
- `web/src/pages/SessionDetail.tsx` - Conditional cost split (Total + Main Thread + Subagents) when hasSubagents is true

## Decisions Made
- branchFilter is local state in Sessions.tsx (not Zustand) to prevent it from affecting Overview page stats — this is the key architectural constraint from research pitfall 6
- SessionSummary new fields typed as optional (?) for backward safety in case older API responses lack them
- SubagentBadge placed in model column rather than its own column to keep the badge contextually linked to model info and avoid table width creep

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 07-03 (Activity Heatmap): can proceed in parallel — consumes /activity endpoint built in 07-01
- 07-04 (Subagent Accounting UI): can proceed — Sessions page now shows subagent indicators; detail cost split complete
- TypeScript compiles clean; no new dependencies added

---
*Phase: 07-differentiator-features*
*Completed: 2026-03-01*

## Self-Check: PASSED

- web/src/components/SubagentBadge.tsx: FOUND
- web/src/hooks/useBranches.ts: FOUND
- web/src/hooks/useSessions.ts: FOUND
- web/src/hooks/useSessionDetail.ts: FOUND
- web/src/pages/Sessions.tsx: FOUND
- web/src/pages/SessionDetail.tsx: FOUND
- .planning/phases/07-differentiator-features/07-02-SUMMARY.md: FOUND
- Commit 7437fba (Task 1): FOUND
- Commit df075ae (Task 2): FOUND
