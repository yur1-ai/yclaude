---
phase: 05-model-project-breakdowns
plan: "02"
status: complete
completed: "2026-03-01"
subsystem: web/components
tags: [ui, table, css, recharts]
dependency_graph:
  requires: []
  provides: [SortableTable, Column, donut-css-vars]
  affects: [web/src/pages/Models.tsx, web/src/pages/Projects.tsx]
tech_stack:
  added: []
  patterns: [generic-react-component, css-custom-properties, oklch-colors]
key_files:
  created:
    - web/src/components/SortableTable.tsx
  modified:
    - web/src/index.css
decisions:
  - Token tooltip via render prop — tooltip HTML lives in consuming page, not in SortableTable
  - Row key uses array index i — rows have no stable identity key in API shape
  - Sort indicator only shows on active column — no indicator on inactive sortable columns
metrics:
  duration: "~10 minutes"
  completed: "2026-03-01"
  tasks: 2
  files: 2
---

# Phase 05 Plan 02: Shared SortableTable Component and Donut CSS Vars Summary

## One-liner

Generic `SortableTable<T>` React component with typed `Column<T>` API plus six `--color-donut-*` oklch CSS variables in the Tailwind `@theme` block.

## What Was Built

Two shared artifacts that Plans 03 (Models page) and Projects page will consume:

1. **`SortableTable<T>` component** — a fully generic sortable table with clickable column headers, asc/desc toggle with sort indicator (▲/▼), per-row highlight via `highlightKey`/`highlightValue` props, customizable cell rendering via `render` prop on each `Column<T>`, and empty state messaging.

2. **Donut chart CSS variables** — six `--color-donut-*` custom properties added to `web/src/index.css` inside the existing `@theme` block. All values use `oklch()` notation. These will be consumed as `'var(--color-donut-N)'` in Recharts `<Cell fill>` props.

## Key Files

### Created

- `web/src/components/SortableTable.tsx` — generic `SortableTable<T extends Record<string, unknown>>` component; exports `Column<T>` interface and `SortableTable<T>` function; pure Tailwind + React, no external UI library

### Modified

- `web/src/index.css` — added 6 `--color-donut-*` CSS variables after existing `--color-bar`/`--color-grid` lines inside `@theme` block

## Self-Check: PASSED

- `web/src/components/SortableTable.tsx` exists and exports `Column<T>` interface and `SortableTable<T>` function component
- Clicking sortable column headers toggles asc/desc; sort indicator (▲/▼) shown on active column
- `highlightKey` + `highlightValue` props drive `bg-slate-100` row highlight
- `emptyMessage` renders in full-width cell when `rows.length === 0`
- `index.css` `@theme` block contains all 6 `--color-donut-*` variables (confirmed via `grep --count` returning 6)
- No hex colors hardcoded — only `oklch()` CSS vars used
- TypeScript compiles without errors (`npx tsc --noEmit` exits 0)

## Decisions Made

- **Token tooltip via render prop**: The CSS-only hover tooltip for total tokens breakdown is NOT built into `SortableTable` itself. It is provided via the `render` prop on the "Total tokens" `Column<T>` definition in `Models.tsx`. `SortableTable` renders whatever `col.render(row)` returns, keeping the component generic.
- **Row key uses index `i`**: Rows in the API response have no stable unique identity key, so array index is acceptable since rows are re-sorted in memory.
- **Sort indicator only on active column**: Inactive sortable columns show no indicator; only the active sort column shows ▲/▼.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. `bun` was not available in the shell PATH during execution; used `npx tsc` as equivalent. TypeScript compiled cleanly on first attempt.
