# Phase 5: Model & Project Breakdowns - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Two new analytics pages filling the "Coming soon" stubs: Models (donut chart + sortable table showing cost by model) and Projects (sortable table showing cost by project with human-readable names derived from `cwd`). Both pages respond to the global date range picker. No new navigation — routes already exist in `App.tsx`.

</domain>

<decisions>
## Implementation Decisions

### Models page — donut chart
- Donut shows top 5 models as slices; remaining models collapsed into a single "Other" slice
- Center of donut shows total cost for the selected period (e.g. "$14.32 est.")
- Unknown/missing model IDs get their own "Unknown" slice (cost is $0 but event count and tokens are real)
- Clicking a slice highlights it in the chart AND highlights the matching table row
- Highlight state exposed as `selectedModel: string | null` — Phase 6 will extend this to a "View sessions" action without refactoring

### Models page — companion table
- Columns: Model name | Cost | % of total | Event count | Total tokens
- Total tokens = single column (input + output + cache); token breakdown (4 sub-types) shown in a tooltip on hover
- Default sort: cost descending; all columns sortable by click
- "Unknown" model has its own row
- All rows shown (no pagination or truncation)

### Projects page — layout
- Table only, no chart (projects list can be large; donut with 10+ slices is unreadable)
- Visually distinct from Models page by design

### Projects page — table
- Columns: Project name | Cost | % of total | Event count | Total tokens (same structure as Models table)
- Default sort: cost descending; all columns sortable
- All rows shown (no pagination or truncation)

### Project name decoding
- Default: last path segment of `cwd` (e.g. `/Users/ishevtsov/ai-projects/yclaude` → `yclaude`)
- Automatic collision fallback: if two projects share the same last segment, show `parent/name` for both (e.g. `work/yclaude` vs `personal/yclaude`) — implemented in Phase 5 (trivial logic, not scope creep)
- Events with no `cwd` field (older Claude Code logs) → grouped as "Unknown project" row

### Shared table behavior
- DateRangePicker shown in each page header (same as Overview) — global Zustand store keeps it in sync
- Both tables use the same sortable table component

### Empty & loading states
- No data in selected range: empty grey donut ring + "No data for this period" message; table shows zero rows with message
- Loading: same "Loading..." placeholder box as Overview (not skeleton rows)

### Claude's Discretion
- Exact donut color palette for model slices
- Tooltip styling and positioning
- Token breakdown tooltip implementation details
- Error state handling for failed API requests

</decisions>

<specifics>
## Specific Ideas

- Highlight state for donut/table should be designed as `selectedModel: string | null` — this becomes the foundation for Phase 6's "View sessions filtered by model" action. Don't wire up the navigation yet, just expose the state.
- The "Other" bucket in the donut should not be selectable/highlightable (or if highlighted, the table shows all "Other" rows) — Claude's discretion on exact behavior.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `web/src/components/CostBarChart.tsx`: Uses Recharts `BarChart` — `PieChart`/`Pie` is in the same Recharts package, no new dependency needed for the donut
- `web/src/components/StatCard.tsx`: Can reuse for any summary callout on the new pages
- `web/src/hooks/useSummary.ts`: Template for new hooks — `useQuery` + `useDateRangeStore` pattern with `?from=ISO&?to=ISO` params
- `web/src/store/useDateRangeStore.ts`: Zustand store already wired; import and consume `from`/`to` in new hooks
- `web/src/components/DateRangePicker.tsx`: Drop in directly — already self-contained

### Established Patterns
- API routes: Hono, filter `state.costs` by `from`/`to`, aggregate and return JSON — same pattern as `/summary` and `/cost-over-time`
- Data fetching: React Query `useQuery` with `queryKey: ['key', from?.toISOString(), to?.toISOString()]` for automatic re-fetch on range change
- Tailwind: `rounded-lg border border-slate-200 bg-white p-6 shadow-sm` for card containers; `text-sm font-semibold text-slate-700` for section headers
- Loading: `h-60 flex items-center justify-center text-slate-400 text-sm` placeholder div with "Loading..." text

### Integration Points
- `src/server/routes/api.ts`: Add `/api/v1/models` and `/api/v1/projects` routes — aggregate `state.costs` by `event.model` and `event.cwd` respectively
- `web/src/pages/Models.tsx` and `web/src/pages/Projects.tsx`: Both already stubbed and registered in `App.tsx` router — replace "Coming soon" content
- `src/parser/types.ts`: `CostEvent` has `model: string | undefined` and `cwd: string | undefined` — both fields available for grouping

</code_context>

<deferred>
## Deferred Ideas

- Column customization (user-configurable show/hide columns) — future phase or v2.0
- "View sessions" action from highlighted model row — Phase 6 (selectedModel state is already the foundation)

</deferred>

---

*Phase: 05-model-project-breakdowns*
*Context gathered: 2026-03-01*
