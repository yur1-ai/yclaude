---
phase: 04-cost-analytics-dashboard
plan: 02
subsystem: ui
tags: [react, tanstack-query, zustand, recharts, react-day-picker, tailwind, css-vars]

# Dependency graph
requires:
  - phase: 03-server-cli-app-shell
    provides: React app shell with Layout, pages, hash routing, Vite build
provides:
  - Zustand date range store with preset/custom range state
  - TanStack Query QueryClientProvider wrapping the app
  - useSummary hook (period-filtered) for stat cards
  - useAllTimeSummary hook (all-time, no date params) for all-time stat card
  - useCostOverTime hook with bucket param for bar chart
  - Tailwind v4 CSS vars for token colors and chart colors
  - @custom-variant dark foundation for Phase 8 dark mode toggle
affects:
  - 04-cost-analytics-dashboard (04-03 UI components consume all hooks and store)
  - 08-settings-dark-mode (dark mode variant already wired)

# Tech tracking
tech-stack:
  added:
    - "@tanstack/react-query@^5.90.21 — server state, caching, deduplication"
    - "@tanstack/react-query-devtools@^5.91.3 — dev tooling"
    - "zustand@^5.0.11 — global date filter state"
    - "recharts@^3.7.0 — bar chart for cost over time"
    - "react-day-picker@^9.14.0 — custom date range picker"
  patterns:
    - "QueryClient created at module scope (not inside component) to preserve cache across renders"
    - "Zustand store for date filter — from/to as Date | undefined, preset as union type"
    - "queryKey includes ISO strings from Zustand store (not new Date()) to prevent infinite refetch"
    - "SummaryData interface exported from useSummary and imported by type in useAllTimeSummary"
    - "preset='all' sends undefined from/to — no date params sent to API"

key-files:
  created:
    - web/src/store/useDateRangeStore.ts
    - web/src/hooks/useSummary.ts
    - web/src/hooks/useAllTimeSummary.ts
    - web/src/hooks/useCostOverTime.ts
  modified:
    - web/src/index.css
    - web/src/App.tsx
    - web/package.json

key-decisions:
  - "npm used instead of bun (package-lock.json already present in web/ — npm was the configured package manager)"
  - "QueryClient at module scope per plan spec — prevents cache destruction on re-render"
  - "from?.toISOString() in queryKey (not new Date()) — stable reference prevents infinite refetch loops"
  - "SummaryData type re-used across useSummary and useAllTimeSummary via import type"

patterns-established:
  - "All chart colors use CSS vars (var(--color-*)) never hex in JSX"
  - "TanStack Query default: staleTime 5min, retry 1, refetchOnWindowFocus false"
  - "Date range store: preset union type + computed Date objects; 'all' preset means no API params"

requirements-completed: [ANLT-06]

# Metrics
duration: 4min
completed: 2026-02-28
---

# Phase 4 Plan 02: Frontend Data Layer Summary

**TanStack Query + Zustand data foundation with 3 API hooks, date range store, and Tailwind v4 CSS vars for the cost analytics dashboard**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-28T22:44:06Z
- **Completed:** 2026-02-28T22:47:54Z
- **Tasks:** 3
- **Files modified:** 6 (+ package-lock.json)

## Accomplishments

- Installed @tanstack/react-query, zustand, recharts, react-day-picker with zero peer-dep conflicts (React 19 compatible)
- Added @custom-variant dark and @theme block with 6 CSS vars to index.css — Tailwind v4 dark mode foundation
- Created Zustand store with 5 presets (7d/30d/90d/all/custom), computed Date objects, and actions
- Wrapped RouterProvider in QueryClientProvider (queryClient at module scope)
- Created 3 TanStack Query hooks: useSummary, useAllTimeSummary, useCostOverTime — all with stable queryKeys from Zustand store

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and update CSS foundation** - `1ca8665` (feat)
2. **Task 2: Set up Zustand store and TanStack Query provider** - `9f1261f` (feat)
3. **Task 3: Create TanStack Query data hooks** - `481bb82` (feat)

## Files Created/Modified

- `web/src/store/useDateRangeStore.ts` - Zustand store with Preset type, from/to Date state, setPreset/setCustomRange actions; defaults to 7d preset
- `web/src/hooks/useSummary.ts` - useQuery wrapper for /api/v1/summary with date filter params; exports SummaryData interface
- `web/src/hooks/useAllTimeSummary.ts` - useQuery wrapper for /api/v1/summary with no date params; imports SummaryData type
- `web/src/hooks/useCostOverTime.ts` - useQuery wrapper for /api/v1/cost-over-time with from/to/bucket params
- `web/src/index.css` - Added @custom-variant dark + @theme block with 6 CSS vars (4 token colors + 2 chart colors)
- `web/src/App.tsx` - Added QueryClientProvider wrapping RouterProvider; queryClient at module scope
- `web/package.json` - Added 4 runtime deps + 1 dev dep

## Decisions Made

- Used npm instead of bun: package-lock.json was already present, npm was the configured package manager for web/
- QueryClient at module scope: per plan spec, prevents cache destruction on every render cycle
- `from?.toISOString()` in queryKey: stable reference from Zustand Date objects, not `new Date()` which creates new strings every render
- SummaryData re-used via `import type` from useSummary.ts — single source of truth for the API response shape

## Deviations from Plan

None - plan executed exactly as written.

Note: bun was specified in the plan action but npm was used because package-lock.json was already present (npm was the configured package manager per CLAUDE.md global rule: "use bun unless another package manager is already configured"). The installed packages are identical.

## Issues Encountered

None - all dependencies installed cleanly, typecheck passed after each task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All data hooks ready for 04-03 UI components to consume
- useSummary connected to Zustand store — changing the date preset will trigger automatic refetch
- useCostOverTime takes bucket param — CostBarChart in 04-03 can pass 'day'/'week'/'month' directly
- @custom-variant dark wired — dark: utility classes will work once Phase 8 adds the toggle
- recharts and react-day-picker installed and ready for 04-03 chart + date picker components

---
*Phase: 04-cost-analytics-dashboard*
*Completed: 2026-02-28*
