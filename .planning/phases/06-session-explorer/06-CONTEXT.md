# Phase 6: Session Explorer - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Browsable session list with per-session drill-down detail. Users can see all sessions with key metadata, filter and sort the list, then click into a session to see per-turn token breakdown and cumulative cost. No conversation content appears anywhere — only metadata, token counts, and cost estimates.

</domain>

<decisions>
## Implementation Decisions

### Session detail navigation
- Opens as a separate route: `/sessions/:id`
- Deep-linkable; browser back returns to list
- Requires adding a new route to App.tsx (hash router)

### Session list columns and behavior
- Columns: project name, model, estimated cost, timestamp, duration — all sortable
- Project filter: dropdown select (single project or "All") that compounds with the global date range picker
- Server-side pagination: 50 sessions per page, prev/next page buttons
- Missing `durationMs`: display em dash `—`

### Multi-model sessions
- When a session uses more than one model, the model column shows "Mixed"
- "Mixed" has a hover tooltip listing all distinct models used in that session

### Session detail page layout
- Layout order: summary header → per-turn token table → cumulative cost timeline
- Summary header: total cost, total tokens (breakdown), project name, model (or "Mixed"), duration, git branch if present
- Per-turn table: one row per turn, columns = input / output / cache creation / cache read tokens + turn cost
- Cumulative cost timeline: running total line chart (cost accumulates turn-by-turn along x-axis)

### Cumulative cost timeline
- Running total line chart — each point = total cost so far through that turn
- X-axis: turn number; Y-axis: cumulative cost in USD
- Uses Recharts (already installed and used on Models page)

### Claude's Discretion
- Loading skeleton / loading state design
- Exact chart sizing and axis label formatting
- Error state when session ID is not found (404-style)
- How turns are ordered if timestamps are identical (stable sort by index)

</decisions>

<specifics>
## Specific Ideas

- No specific references given — open to standard approaches consistent with existing pages

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SortableTable<T>` (`web/src/components/SortableTable.tsx`): generic sortable table — reuse for session list and per-turn detail table
- `DateRangePicker` (`web/src/components/DateRangePicker.tsx`): already wired to `useDateRangeStore` — session list should read from the same store
- `useDateRangeStore` (`web/src/store/useDateRangeStore.ts`): global date range state — session list hook reads `from`/`to` from here
- `assignProjectNames()` in `src/server/routes/api.ts`: already handles cwd → display name with collision detection — reuse in sessions API route
- `PieChart`/`LineChart` from Recharts: already installed; `CostBarChart` shows existing chart pattern

### Established Patterns
- React Query hook per page: `useModels` / `useProjects` → create `useSessions` and `useSessionDetail` hooks
- Page structure: header row with title + `DateRangePicker`, then card sections — follow same layout
- Hono API routes in `src/server/routes/api.ts`: add `/sessions` and `/sessions/:id` endpoints following existing route patterns
- `parseDate()` utility already in `api.ts` — reuse for date filtering

### Integration Points
- `App.tsx`: add `{ path: 'sessions/:id', element: <SessionDetail /> }` as a child of the layout route
- `/api/v1/sessions` stub already exists (returns `[]`) — replace with real implementation
- Add `/api/v1/sessions/:id` new route
- `state.costs` (array of `CostEvent`) is the source — group by `sessionId` to build sessions

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-session-explorer*
*Context gathered: 2026-03-01*
