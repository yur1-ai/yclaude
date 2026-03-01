---
phase: 07-differentiator-features
plan: "03"
subsystem: ui
tags: [react, typescript, react-activity-calendar, heatmap, cache, subagents, analytics, zustand]

# Dependency graph
requires:
  - phase: 07-differentiator-features
    plan: "01"
    provides: /activity endpoint with gap-filled Activity[], /summary with subagent cost fields foundation
provides:
  - CacheEfficiencyCard with two-tab mode toggle (Input Coverage / Hit Rate) and TrendIndicator
  - usePriorSummary hook for prior-period comparison
  - ActivityHeatmap with independent year picker and session-count tooltip
  - useActivityData hook fetching /api/v1/activity
  - /summary endpoint extended with subagentCostUsd and mainCostUsd
  - SubagentStatCard inline on Overview (conditional on subagent activity)
affects: [07-04-subagent-accounting]

# Tech tracking
tech-stack:
  added:
    - react-activity-calendar@3.1.1
  patterns:
    - "Named import only for react-activity-calendar v3: import { ActivityCalendar } from 'react-activity-calendar'"
    - "Heatmap theme uses hex strings only — CSS variables (var(--color-*)) not supported in react-activity-calendar theme prop"
    - "cloneElement from 'react' (named import) used to add title attribute to heatmap block SVG rect for browser-native tooltip"
    - "usePriorSummary: prior period = [from - duration, from] where duration = to - from; enabled=false when no date range"
    - "CacheEfficiencyCard holds local mode state (inputCoverage|cacheHitRate) — does NOT affect global date range store"
    - "ActivityHeatmap holds local year state — does NOT import useDateRangeStore"
    - "SubagentStatCard is inline in Overview.tsx (not a separate component) — only renders when subagentCostUsd > 0"
    - "Cache formula Mode 1 (Input Coverage): cacheRead / (input + cacheRead) * 100"
    - "Cache formula Mode 2 (Hit Rate): cacheRead / (cacheCreation + cacheRead) * 100"
    - "TrendIndicator percent=null for all/custom presets — shown as 'No prior data'"

key-files:
  created:
    - web/src/hooks/usePriorSummary.ts
    - web/src/components/CacheEfficiencyCard.tsx
    - web/src/hooks/useActivityData.ts
    - web/src/components/ActivityHeatmap.tsx
  modified:
    - src/server/routes/api.ts
    - web/src/hooks/useSummary.ts
    - web/src/pages/Overview.tsx

key-decisions:
  - "react-activity-calendar v3 named import only — default export removed; ONLY use { ActivityCalendar }"
  - "Heatmap tooltips use browser-native title attribute via cloneElement — no CSS import or tooltip library needed"
  - "SubagentStatCard only renders when subagentCostUsd > 0 — prevents confusing 0% for users without subagents"
  - "CacheEfficiencyCard TrendIndicator shows null for all/custom presets — consistent with Overview cost trend behavior"
  - "usePriorSummary enabled=false when from/to undefined — avoids fetching with empty params; returns no data gracefully"

patterns-established:
  - "usePriorSummary pattern: shift [from,to] by duration to get prior equivalent period; queryKey uses ISO strings"
  - "Hex colors in react-activity-calendar theme — never CSS vars; 5-element array for levels 0-4"
  - "ActivityHeatmap year selector: local useState, NOT useDateRangeStore — heatmap is orthogonal to global date filter"

requirements-completed: [ANLT-07, ANLT-08, SESS-03]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 7 Plan 03: Activity Heatmap + Cache Efficiency Card + Subagent Overview Summary

**Cache efficiency score with two-tab mode toggle, GitHub-style activity heatmap with independent year picker, and conditional subagent share stat — all using react-activity-calendar v3 with hex-only color theme**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-01T08:28:29Z
- **Completed:** 2026-03-01T08:30:19Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Extended /summary API endpoint to return subagentCostUsd and mainCostUsd alongside totalCost
- Created usePriorSummary hook for fetching prior equivalent period via date-range shift
- CacheEfficiencyCard: StatCard-style component with Input Coverage / Hit Rate tab toggle + TrendIndicator
- Installed react-activity-calendar v3.1.1; created useActivityData hook and ActivityHeatmap component
- ActivityHeatmap: full-year green heatmap with independent year picker and browser-native tooltip quips
- Overview updated with three new sections: CacheEfficiencyCard, conditional SubagentStatCard, ActivityHeatmap

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend /summary endpoint + create usePriorSummary hook + CacheEfficiencyCard** - `67ad1cb` (feat)
2. **Task 2: Install react-activity-calendar, create ActivityHeatmap, update Overview** - `1b07805` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/server/routes/api.ts` - Added subagentCostUsd and mainCostUsd to /summary GET response
- `web/src/hooks/useSummary.ts` - Added optional subagentCostUsd and mainCostUsd to SummaryData interface
- `web/src/hooks/usePriorSummary.ts` - New hook: fetches prior equivalent period summary for trend comparison
- `web/src/components/CacheEfficiencyCard.tsx` - New component: two-tab cache score StatCard with TrendIndicator
- `web/src/hooks/useActivityData.ts` - New hook: fetches /api/v1/activity?year&tz for heatmap data
- `web/src/components/ActivityHeatmap.tsx` - New component: GitHub-style heatmap with green theme and quip tooltips
- `web/src/pages/Overview.tsx` - Added CacheEfficiencyCard, SubagentStatCard (conditional), ActivityHeatmap

## Decisions Made
- Used browser-native `title` attribute (via `cloneElement`) for heatmap tooltips — avoids any CSS import or third-party tooltip library while meeting the "tooltip with session count + personality quip" requirement
- SubagentStatCard is inline in Overview.tsx rather than a separate component — it's a one-liner conditional wrapping the existing StatCard; no behavior worth extracting
- CacheEfficiencyCard trend is null for `all` and `custom` presets, matching the existing cost trend behavior on Overview
- react-activity-calendar v3 hex theme colors: level 0 uses `#f0f0f0` (visible light gray per CONTEXT.md note), levels 1-4 are green gradient

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 07-04 (Subagent Accounting UI) can proceed: SessionRow already has mainCostUsd/subagentCostUsd/hasSubagents from 07-01; Sessions page already shows SubagentBadge from 07-02
- Overview now displays subagent share stat when subagent sessions exist
- TypeScript compiles clean; react-activity-calendar v3.1.1 installed in web/

---
*Phase: 07-differentiator-features*
*Completed: 2026-03-01*

## Self-Check: PASSED

- src/server/routes/api.ts: FOUND
- web/src/hooks/usePriorSummary.ts: FOUND
- web/src/components/CacheEfficiencyCard.tsx: FOUND
- web/src/hooks/useActivityData.ts: FOUND
- web/src/components/ActivityHeatmap.tsx: FOUND
- web/src/pages/Overview.tsx: FOUND
- Commit 67ad1cb (Task 1): FOUND
- Commit 1b07805 (Task 2): FOUND
