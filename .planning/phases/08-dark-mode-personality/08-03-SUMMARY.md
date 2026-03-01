---
phase: 08-dark-mode-personality
plan: "03"
subsystem: ui
tags: [react, tailwind, dark-mode, recharts, zustand, personality, quips]

# Dependency graph
requires:
  - phase: 08-01
    provides: useThemeStore, dark mode CSS vars (--color-axis-tick, --color-grid, --color-bar), ThemeToggle in Layout
  - phase: 08-02
    provides: quips.ts with QUIPS, pickQuip, pickSpendQuip; StatCard quip prop

provides:
  - Full dark mode GitHub palette across all 5 pages and all shared components
  - Personality quips on every page (empty states, milestone, spend thresholds, heatmap peaks)
  - ActivityHeatmap: dark color scheme from HEATMAP_THEME.dark, computeP90 peak detection
  - All Recharts axis ticks using var(--color-axis-tick) for dark-aware colors

affects:
  - phase 09: Distribution — dark mode is fully wired; no further UI changes expected

# Tech tracking
tech-stack:
  added: []
  patterns:
    - dark:bg-[#161b22] / dark:border-[#30363d] applied consistently across all card containers
    - Recharts axis ticks always use fill var(--color-axis-tick) (never hardcoded oklch)
    - pickQuip called at render time for random-per-load behavior (not memoized)
    - computeP90 as pure function outside component for heatmap peak-day detection

key-files:
  created: []
  modified:
    - web/src/components/ActivityHeatmap.tsx
    - web/src/components/SortableTable.tsx
    - web/src/components/CostBarChart.tsx
    - web/src/components/CacheEfficiencyCard.tsx
    - web/src/components/DateRangePicker.tsx
    - web/src/pages/Overview.tsx
    - web/src/pages/Sessions.tsx
    - web/src/pages/Models.tsx
    - web/src/pages/Projects.tsx
    - web/src/pages/SessionDetail.tsx

key-decisions:
  - "computeP90 guards against 1-session false peaks: peak condition is count >= p90 AND count >= 2"
  - "Models donut center text uses var(--color-axis-tick) (same CSS var as chart axes) — avoids hardcoded #0f172a"
  - "emptyMessage on SortableTable accepts a string quip picked at render time — random per page load, no state needed"
  - "Sessions milestone quip renders below h1 heading, above filter controls — placement matches plan spec"

patterns-established:
  - "Dark mode card pattern: rounded-lg border border-slate-200 bg-white ... dark:border-[#30363d] dark:bg-[#161b22]"
  - "Empty state quip: pickQuip(QUIPS.empty_*) passed as emptyMessage to SortableTable or rendered inline"

requirements-completed: [CLI-03, PRSL-01]

# Metrics
duration: 35min
completed: 2026-03-01
---

# Phase 8 Plan 03: Dark Mode Sweep + Personality Summary

**GitHub dark palette applied across all 5 pages and shared components; personality quips wired into every empty state, spend threshold, and ActivityHeatmap peak day via 90th-percentile detection**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-01T18:30:00Z
- **Completed:** 2026-03-01T19:08:49Z
- **Tasks:** 2 of 3 complete (Task 3 is checkpoint:human-verify — awaiting visual verification)
- **Files modified:** 10

## Accomplishments

- Dark mode GitHub palette (`#161b22` bg, `#30363d` border, `#e6edf3`/`#8b949e` text) applied to all 5 pages and 4 shared components
- ActivityHeatmap fully upgraded: dark HEATMAP_THEME colors, dynamic colorScheme from useThemeStore, `computeP90` replaces cycling `getQuip(count)` with 90th-pct peak-day quips from `QUIPS.heatmap_peak`
- All Recharts axis ticks updated from hardcoded `oklch(0.55 0 0)` to `var(--color-axis-tick)` (CostBarChart + SessionDetail LineChart)
- All 5 pages have personality quips: Overview (spend threshold + empty state), Sessions (empty state + milestone at 100+), Models (empty state), Projects (empty state), SessionDetail (empty turns)

## Task Commits

Each task was committed atomically:

1. **Task 1: Dark mode sweep — shared components** - `0c84394` (feat) — SortableTable, CostBarChart, CacheEfficiencyCard, DateRangePicker
2. **Task 2: ActivityHeatmap dark theme + 90th-pct quips; all 5 pages** - `f240e74` (feat)

_Task 3 is checkpoint:human-verify — no commit yet._

## Files Created/Modified

- `web/src/components/SortableTable.tsx` - dark: classes on header, rows, highlighted row, empty state
- `web/src/components/CostBarChart.tsx` - dark: on loading/buttons; axis ticks use var(--color-axis-tick)
- `web/src/components/CacheEfficiencyCard.tsx` - dark: on card, label, toggle buttons, value, sub-label
- `web/src/components/DateRangePicker.tsx` - dark: on calendar popover container and inactive preset buttons
- `web/src/components/ActivityHeatmap.tsx` - HEATMAP_THEME.dark, computeP90, dynamic colorScheme, dark: card classes
- `web/src/pages/Overview.tsx` - pickSpendQuip on All-time card; empty state quip; dark: on headings/cards
- `web/src/pages/Sessions.tsx` - emptyMessage quip; milestone quip at 100+; dark: on card/filters/pagination
- `web/src/pages/Models.tsx` - import quips; empty state quip; donut center var(--color-axis-tick); dark: everywhere
- `web/src/pages/Projects.tsx` - import quips; emptyMessage quip; dark: on heading/card
- `web/src/pages/SessionDetail.tsx` - import quips; dark: on all cards/headings/error state; axis ticks fixed; empty turns quip

## Decisions Made

- `computeP90` guards against false peaks with minimum count of 2: a day with 1 session is never "peak" even if it's the only day with activity
- Models page donut center text uses `var(--color-axis-tick)` (same CSS var as chart axes) rather than adding a new CSS var — consistent with existing pattern
- `emptyMessage` is evaluated at render time (not hoisted to module scope) — each page load gets a different quip

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled clean on first pass. All 10 files modified without type errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All dark mode and personality work is complete pending human visual verification (Task 3 checkpoint)
- Phase 9 (npm distribution) can proceed once user approves visual correctness
- No blockers — all code committed and TypeScript clean

---
*Phase: 08-dark-mode-personality*
*Completed: 2026-03-01*
