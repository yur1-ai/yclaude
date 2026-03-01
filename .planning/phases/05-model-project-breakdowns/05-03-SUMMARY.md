---
phase: 05-model-project-breakdowns
plan: "03"
status: complete
completed: "2026-03-01"
subsystem: web/pages
tags: [ui, recharts, donut-chart, sortable-table, react-query, models, projects]
dependency_graph:
  requires: [05-01, 05-02]
  provides: [Models page, Projects page, useModels hook, useProjects hook]
  affects: [web/src/pages/Models.tsx, web/src/pages/Projects.tsx]
tech_stack:
  added: []
  patterns: [recharts-donut, css-only-tooltip, react-query-hook-pattern, donut-slice-selection]
key_files:
  created:
    - web/src/hooks/useModels.ts
    - web/src/hooks/useProjects.ts
  modified:
    - web/src/pages/Models.tsx — replaced "Coming soon" with donut chart + sortable table
    - web/src/pages/Projects.tsx — replaced "Coming soon" with sortable table only
decisions:
  - ModelRow and ProjectRow extend Record<string, unknown> for SortableTable generic constraint
  - Tooltip formatter handles undefined value for TypeScript compatibility with recharts types
  - Projects % of total column uses key 'cwd' with sortable:false to avoid duplicate 'costUsd' key
metrics:
  duration: "~10 minutes"
  completed: "2026-03-01"
  tasks: 3
  files_modified: 4
---

# Phase 05 Plan 03: Models and Projects Pages Summary

## One-liner

End-to-end Models and Projects analytics pages — Recharts donut with slice selection linked to SortableTable row highlight, plus a table-only Projects page, both driven by React Query hooks with date range filtering.

## What Was Built

**`useModels` hook** (`web/src/hooks/useModels.ts`) — mirrors `useSummary` pattern exactly. Reads `useDateRangeStore` for `from`/`to`, serializes to ISOString in `queryKey` to prevent infinite refetch loops, fetches `GET /api/v1/models` and returns typed `ModelsData`.

**`useProjects` hook** (`web/src/hooks/useProjects.ts`) — same pattern, fetches `GET /api/v1/projects`, returns typed `ProjectsData`.

**Models page** (`web/src/pages/Models.tsx`) — full implementation:
- Recharts `PieChart` + `Pie` + `Cell` donut (`innerRadius=80`, `outerRadius=120`, `strokeWidth=0`)
- `toDonutData()` collapses models 6+ into a single "Other" slice client-side
- `selectedModel` state (`useState<string | null>`) toggled on slice click; "Other" slice is non-selectable
- `<Cell opacity>` dims non-selected slices to 0.4 when any selection is active
- SVG `<text>` center label shows total cost as `$X.XX est.`
- `SortableTable<ModelRow>` with 5 columns: Model, Cost, % of total, Events, Total tokens
- CSS-only hover tooltip on Total tokens column showing 4 sub-types (input, output, cache write, cache read)
- `highlightKey="model"` + `highlightValue={selectedModel}` links donut click to table row highlight
- `DateRangePicker` in page header; loading placeholder and empty donut state handled

**Projects page** (`web/src/pages/Projects.tsx`) — simpler table-only layout:
- `SortableTable<ProjectRow>` with 5 columns: Project, Cost, % of total, Events, Total tokens
- Same CSS-only token tooltip pattern as Models page
- `displayName` from API already human-readable (no raw cwd slugs)
- No chart, no selection state
- `DateRangePicker` in page header; loading state handled

## Key Files

### Created

- `web/src/hooks/useModels.ts` — `useModels()` hook; exports `ModelRow`, `ModelsData`, `useModels`
- `web/src/hooks/useProjects.ts` — `useProjects()` hook; exports `ProjectRow`, `ProjectsData`, `useProjects`

### Modified

- `web/src/pages/Models.tsx` — replaced "Coming soon" stub with donut chart + sortable table implementation
- `web/src/pages/Projects.tsx` — replaced "Coming soon" stub with sortable table implementation

## Commits

| Hash    | Description                                                                           |
| ------- | ------------------------------------------------------------------------------------- |
| 1711a0c | feat(05-03): create useModels and useProjects React Query hooks                       |
| 8d9b943 | feat(05-03): implement Models page with donut chart and sortable table                |
| d2c5545 | feat(05-03): implement Projects page with sortable table                              |

## Self-Check: PASSED

- `web/src/hooks/useModels.ts` exists, exports `useModels`, `ModelRow`, `ModelsData`
- `web/src/hooks/useProjects.ts` exists, exports `useProjects`, `ProjectRow`, `ProjectsData`
- `web/src/pages/Models.tsx` imports and uses `PieChart`, `Pie`, `Cell`, `SortableTable`, `DateRangePicker`, `useModels`
- `web/src/pages/Projects.tsx` imports and uses `SortableTable`, `DateRangePicker`, `useProjects`
- No "Coming soon" text in either Models.tsx or Projects.tsx
- `selectedModel` state wired from donut `onClick` to `SortableTable highlightValue`
- "Other" slice click handler returns early (non-selectable)
- TypeScript compiles without errors on both server (`npx tsc --noEmit`) and web (`npx tsc --noEmit`)
- All 3 tasks committed individually with proper format

## Decisions Made

- **ModelRow/ProjectRow extend Record<string, unknown>**: SortableTable's generic constraint `T extends Record<string, unknown>` requires an index signature. Extended both interfaces in the hook files rather than using type casts in pages — keeps the pages clean.
- **Tooltip formatter handles `undefined`**: Recharts `Formatter` type passes `number | undefined` for value. Added conditional check `value !== undefined ? ... : ...` to satisfy TypeScript.
- **Projects % of total uses `key: 'cwd'`**: The "% of total" column has no sortable behavior (`sortable: false`), so its `key` is only used as a React key for the `<th>`. Used `'cwd'` to avoid duplicate `'costUsd'` key in the columns array (Cost and % of total both derive from costUsd).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ModelRow/ProjectRow index signature missing**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** `ModelRow` and `ProjectRow` did not satisfy `T extends Record<string, unknown>` constraint required by `SortableTable<T>`, causing TS2344 type errors
- **Fix:** Added `extends Record<string, unknown>` to both interface declarations in hook files
- **Files modified:** `web/src/hooks/useModels.ts`, `web/src/hooks/useProjects.ts`
- **Commit:** 8d9b943

**2. [Rule 1 - Bug] Recharts Tooltip formatter type mismatch**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** Recharts Formatter type passes `number | undefined` for value, but plan specified `(value: number) => ...`
- **Fix:** Added `undefined` check in formatter to satisfy TypeScript strict type
- **Files modified:** `web/src/pages/Models.tsx`
- **Commit:** 8d9b943

## Issues Encountered

None beyond the auto-fixed TypeScript errors above. Both pages implement all spec requirements: donut selection, row highlighting, CSS-only tooltips, DateRangePicker, loading and empty states.
