---
phase: 05-model-project-breakdowns
phase_number: "05"
status: passed
verified: "2026-03-01"
---

# Phase 5 Verification

## Goal

User can see exactly which models and projects are driving their spend.

## Must-Haves Verification

### Plan 05-01: Server API Routes

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | GET /api/v1/models returns rows grouped by model with cost, event count, tokens, plus totalCost | PASS | `src/server/routes/api.ts:177` — full aggregation map loop, cost/eventCount/tokens accumulation, sorted by costUsd desc, returns `{ rows, totalCost }` |
| 2 | GET /api/v1/projects returns rows with human-readable displayName derived from cwd, plus totalCost | PASS | `src/server/routes/api.ts:229` — aggregates by cwd key, calls `assignProjectNames()` before response, returns `{ rows, totalCost }` with `displayName` field |
| 3 | Both routes respect date range filters using UTC date comparison | PASS | `api.ts:188-189, 240-241` — filters use `new Date(e.timestamp) >= from` / `<= to` (UTC ISO comparison, no local date methods) |
| 4 | Events with undefined model grouped as 'Unknown'; events with undefined cwd grouped as 'Unknown project' (cwd: null) | PASS | `api.ts:198` `e.model ?? 'Unknown'`; `api.ts:250` `e.cwd ?? null`; `assignProjectNames()` at line 37 maps null → 'Unknown project' |
| 5 | Project name collision detection is server-side: two distinct cwds sharing the same last segment both display as parent/name | PASS | `api.ts:28-48` — `assignProjectNames()` counts last-segment frequency, applies parent/name format for count > 1 |

### Plan 05-02: SortableTable Component and CSS Variables

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 6 | SortableTable renders a table with clickable column headers that toggle sort direction | PASS | `web/src/components/SortableTable.tsx:34-42` — `handleSort` toggles asc/desc on same key, resets to desc on new key; sort indicator at line 72 |
| 7 | Default sort applied on first render (defaultSortKey + defaultSortDir) | PASS | `SortableTable.tsx:31-32` — `useState(defaultSortKey)` and `useState(defaultSortDir)` initialize from props |
| 8 | Highlighted row receives visual distinction | PASS | `SortableTable.tsx:91-95` — `isHighlighted` computed from `highlightKey`/`highlightValue`; `bg-slate-100` applied at line 100 |
| 9 | Six donut color CSS variables defined in index.css @theme block | PASS | `web/src/index.css:17-22` — all 6 vars present: `--color-donut-1` through `--color-donut-5` and `--color-donut-other`, all in oklch, no hex values |

### Plan 05-03: Models and Projects Pages

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 10 | Models page shows a donut chart with top-5 model slices plus an 'Other' slice | PASS | `web/src/pages/Models.tsx:23-31` — `toDonutData()` splits at index 5, collects remainder into `{ model: 'Other', costUsd: otherCost }` |
| 11 | Each slice uses a --color-donut-* CSS var | PASS | `Models.tsx:9-16` — `DONUT_COLORS` array uses `'var(--color-donut-1)'` through `'var(--color-donut-other)'`; applied via `<Cell fill={DONUT_COLORS[index]}>` at line 139 |
| 12 | Clicking a donut slice highlights it (dims others to 0.4 opacity) and highlights the matching row in the companion table | PASS | `Models.tsx:49-52` — `handlePieClick` toggles `selectedModel`; opacity at line 141 dims non-selected to 0.4; `highlightValue={selectedModel}` at line 174 |
| 13 | Clicking the same slice again deselects; clicking 'Other' does nothing | PASS | `Models.tsx:50-51` — early return for `entry.model === 'Other'`; toggle `(prev === entry.model ? null : entry.model)` deselects on second click |
| 14 | Center of the donut shows total cost formatted as '$X.XX est.' | PASS | `Models.tsx:54` — `totalTokensLabel` computed as `$${totalCost.toFixed(2)} est.`; SVG `<text>` at line 151 renders it centered |
| 15 | Both pages render a DateRangePicker; changing the date range re-fetches without a full page reload | PASS | `Models.tsx:7,111` and `Projects.tsx:5,75` — `<DateRangePicker />` imported and rendered; hooks use `useDateRangeStore` and include `from`/`to` in React Query `queryKey` (`useModels.ts:23`, `useProjects.ts:24`), so store change triggers automatic re-fetch |
| 16 | Projects page shows a sortable table only (no chart); project names are human-readable | PASS | `Projects.tsx` — no `PieChart` import; uses `<SortableTable<ProjectRow>>` with `key: 'displayName'` column; `displayName` comes from server-side `assignProjectNames()` |
| 17 | Both tables default-sort by cost descending; all columns sortable by click | PASS | `Models.tsx:172` and `Projects.tsx:82` — `defaultSortKey="costUsd"` `defaultSortDir="desc"` on both; only `% of total` and `Total tokens` columns have `sortable: false` (correct) |
| 18 | Total tokens column shows token sub-types in a CSS-only hover tooltip | PASS | `Models.tsx:82-104` and `Projects.tsx:38-60` — `group-hover:block` span shows all 4 sub-types (Input, Output, Cache write, Cache read) |
| 19 | Loading state shows 'Loading...' placeholder div | PASS | `Models.tsx:37-43` and `Projects.tsx:63-68` — both return early with loading div when `isLoading` is true |

## Key Links Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `src/server/routes/api.ts` | `state.costs` (CostEvent[]) | aggregation loop | WIRED | `api.ts:187, 239` — `let costs = state.costs` then filtered and iterated |
| `GET /api/v1/projects` | `assignProjectNames()` | called before JSON response | WIRED | `api.ts:267` — `const names = assignProjectNames(uniqueCwds)` |
| `web/src/pages/Models.tsx` | `SortableTable` | import + usage | WIRED | `Models.tsx:5` import; `Models.tsx:168` usage as `<SortableTable<ModelRow>>` |
| `web/src/pages/Projects.tsx` | `SortableTable` | import + usage | WIRED | `Projects.tsx:3` import; `Projects.tsx:78` usage as `<SortableTable<ProjectRow>>` |
| `web/src/pages/Models.tsx` | `/api/v1/models` | useModels() hook → fetch | WIRED | `Models.tsx:3` imports `useModels`; `useModels.ts:25` fetches `/api/v1/models?${params}` |
| `web/src/pages/Projects.tsx` | `/api/v1/projects` | useProjects() hook → fetch | WIRED | `Projects.tsx:1` imports `useProjects`; `useProjects.ts:26` fetches `/api/v1/projects?${params}` |
| donut Pie onClick | `selectedModel` state | onSelect callback → useState | WIRED | `Models.tsx:49-52` — `handlePieClick` sets `selectedModel` via `setSelectedModel` |
| `selectedModel` state | `SortableTable highlightValue` | prop pass | WIRED | `Models.tsx:174` — `highlightValue={selectedModel}` |
| Server `/api/v1` mount | `apiRoutes()` | `server.ts:60` | WIRED | `server.ts:6` imports `apiRoutes`; `server.ts:60` mounts via `app.route('/api/v1', apiRoutes(state))` |

## Requirements Coverage

| Req ID | Description | Status | Evidence |
|--------|-------------|--------|----------|
| ANLT-04 | User can view estimated cost broken down by model as a donut chart with a companion sortable table | COVERED | Models page (`web/src/pages/Models.tsx`) — donut (PieChart/Pie/Cell with top-5 + Other) + SortableTable; data from `/api/v1/models`; date range picker present |
| ANLT-05 | User can view per-project cost breakdown with human-readable project names derived from directory paths (not raw slugs) | COVERED | Projects page (`web/src/pages/Projects.tsx`) — SortableTable with `displayName` from server-side `assignProjectNames()`; collision detection (parent/name) at `api.ts:28-48`; date range picker present |

## TypeScript Compilation

Both server and web TypeScript compile cleanly with zero errors:
- `npx tsc --noEmit` (server): 0 errors
- `cd web && npx tsc --noEmit` (web): 0 errors

## Anti-Patterns

No stubs, placeholders, or TODO markers found in any of the six implementation files. No "Coming soon" text remains in Models.tsx or Projects.tsx.

One minor note (not a blocker): the `% of total` column in both pages uses `key: 'costUsd'` (Models) and `key: 'cwd'` (Projects) with `sortable: false` to avoid TypeScript errors from a computed percentage having no direct data key. This is the accepted pattern per the plan's own note and works correctly — sort key is unused when `sortable: false`.

## Human Verification Required

The following behaviors are correct in code but require a live browser to confirm visually:

1. **Donut chart renders correctly in browser**
   - Test: Navigate to `/#/models` with real data loaded
   - Expected: Colored donut segments visible, center shows total cost, hover tooltip shows model name and cost
   - Why human: Recharts rendering, CSS var resolution, and SVG text positioning cannot be verified statically

2. **Donut click interaction**
   - Test: Click a model slice; verify that slice stays full opacity while others dim to ~0.4; verify matching table row highlights
   - Expected: Selected state visually apparent; second click deselects
   - Why human: Visual opacity change and highlight color require runtime DOM inspection

3. **Date range picker triggers re-fetch**
   - Test: Open Network tab, change date preset from "30d" to "7d"
   - Expected: New requests to `/api/v1/models` and `/api/v1/projects` fire; data updates without page reload
   - Why human: React Query cache invalidation and network activity require browser Network tab

4. **CSS-only token tooltip on hover**
   - Test: Hover over a "Total tokens" cell value in either table
   - Expected: Dark popover appears with 4-line breakdown (Input / Output / Cache write / Cache read)
   - Why human: CSS `group-hover:block` requires actual mouse interaction; Tailwind JIT must emit the class

## Summary

Phase 5 goal is fully achieved. All 19 must-have criteria verified against actual code. Both ANLT-04 and ANLT-05 requirements are substantively covered with real implementations (no stubs). All key wiring links are present and correct:

- Server routes `/api/v1/models` and `/api/v1/projects` are implemented with proper aggregation, UTC date filtering, collision detection for project names, and correct JSON response shapes.
- `SortableTable<T>` is a substantive generic component with sort toggling, row highlighting, and empty state — not a placeholder.
- `useModels` and `useProjects` hooks wire the React Query `queryKey` to `useDateRangeStore`, so date range changes automatically trigger re-fetches.
- Both `Models.tsx` and `Projects.tsx` are fully implemented with `DateRangePicker`, loading states, and the respective chart/table components. No "Coming soon" text remains anywhere.
- TypeScript compiles without errors on both server and web.

The only items requiring human verification are visual behaviors (donut rendering, interaction effects, tooltip hover, re-fetch confirmation in Network tab) — all of which are correctly wired in code.

---
_Verified: 2026-03-01_
_Verifier: Claude (gsd-verifier)_
