# Phase 7: Differentiator Features - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Five distinct analytical features that make yclaude stand out from competing tools: cache efficiency scoring, GitHub-style activity heatmap, subagent analysis, git branch context in sessions, and an intraday (hourly) chart view. This phase does not include dark mode, personality copy system-wide, or npm distribution — those are Phase 8 and 9.

</domain>

<decisions>
## Implementation Decisions

### Activity Heatmap
- Full year (52 weeks) GitHub-style grid — displays on the Overview page, below existing sections
- Green color scale: 0 sessions = very light gray (visible empty cell), max intensity = dark green
- Each cell represents **session count** for that day (not cost or token volume)
- Hover tooltip: count + personality quip (e.g. "5 sessions — Why, Claude?! was busy!")
- The heatmap has its **own independent date range picker**, not tied to the global chart date picker
- Future: dedicated Activity page with click-through from the heatmap (deferred — see below)

### Cache Efficiency Score
- New StatCard on the Overview page, respects the global date range picker
- Two tab modes within the widget:
  - **Input coverage**: `cacheRead ÷ (input + cacheRead)` — "what fraction of input tokens came from cache?"
  - **Cache hit rate**: `cacheRead ÷ (cacheRead + cacheCreation)` — "of cached tokens, how many were reads vs writes?"
- Trend indicator: vs. prior equivalent period (same logic as cost TrendIndicator — consistent pattern)

### Subagent Analysis
- **Session list**: small badge on rows that contain subagent events (isSidechain = true), e.g. "Multi-agent" chip
- **Session detail**: summary split in the header — "Main: $X | Subagents: $Y" — shows main-thread vs subagent cost at a glance
- **Overview page**: new StatCard showing subagent share of total cost (e.g. "Subagent share: 42%")

### Git Branch Filter (Session List)
- Each session row in the session list displays its associated git branch
- A branch filter dropdown on the Sessions page lets users narrow to a specific branch — mirrors the existing project filter pattern
- `gitBranch` is already returned in `/api/v1/sessions/:id`; the `/api/v1/sessions` list endpoint needs to expose it per row and support a `?branch=` query param

### 24h / Hourly Chart Window
- "Hourly" added as a 4th bucket option in the CostBarChart toggle (alongside Daily / Weekly / Monthly)
- Timezone: user's **local timezone** (not UTC)
- X-axis labels: 24-hour format (e.g. 09:00, 14:00)
- Data representation: chronological hour-by-hour timeline (not hour-of-day aggregate)
- **Range guard**: when the selected date range is > 48 hours, the Hourly button is greyed out/disabled with a tooltip — "Select a range ≤ 48h for hourly view"

### Claude's Discretion
- Exact personality quip copy for heatmap hover (consistent with Phase 8 personality system approach)
- Badge/chip visual styling for subagent indicator
- Whether hourly gap-fill (zero-cost hours) is applied by default
- Month and weekday labels on the heatmap grid

</decisions>

<specifics>
## Specific Ideas

- "Peak Hours" hour-of-day aggregate feature (see Deferred Ideas) came up during 24h chart discussion — user articulated: "for the chart itself, chronological hour-by-hour is more honest and useful when the range is short"
- Heatmap should feel GitHub-familiar to developers; the full-year view gives a satisfying "year in review" at a glance

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CostBarChart.tsx` — existing Recharts bar chart with day/week/month bucket toggle; extend with `'hour'` bucket type and disable logic
- `TrendIndicator.tsx` — already exists, currently stubs null; the cache score's trend indicator can activate it for real
- `StatCard.tsx` — card with children slot; cache score and subagent share StatCards reuse this directly
- `SortableTable<T>` (`SortableTable.tsx`) — generic table powers session list; new branch column + badge render fit the existing `Column<T>` pattern
- `useDateRangeStore.ts` — Zustand store; the heatmap will need its own independent store or local state, not this one
- `useProjects.ts` pattern — the branch filter dropdown in Sessions mirrors how the project filter already works

### Established Patterns
- Date range filtering: `?from=ISO&to=ISO` query params on all API routes — new endpoints follow this
- `assignProjectNames()` in `api.ts` — project display name utility, already reused across routes
- `isSidechain: boolean` and `agentId: string` — already in `NormalizedEvent` schema, parsed and available in `state.costs`
- `gitBranch: string` — already in `NormalizedEvent` and returned by `/api/v1/sessions/:id`; not yet exposed in the list endpoint
- Recharts with CSS custom properties (`var(--color-bar)`, `var(--color-grid)`) — heatmap can follow the same token pattern

### Integration Points
- `Overview.tsx` — receives 3 new sections: cache score StatCard, subagent share StatCard, activity heatmap
- `Sessions.tsx` — receives branch column and branch filter dropdown (mirrors project filter at line 73–87)
- `SessionDetail.tsx` — summary header gets main/subagent cost split
- `api.ts` (`/api/v1/sessions`) — needs `gitBranch` per row + `?branch=` filter param
- `api.ts` (`/api/v1/cost-over-time`) — needs `hour` bucket support with local-timezone bucketing
- New API endpoint needed: `/api/v1/summary` may need a `cacheEfficiency` field, or a dedicated `/api/v1/cache-stats` route

</code_context>

<deferred>
## Deferred Ideas

- **Dedicated Activity page** — full-page heatmap view with richer controls; clicking heatmap on Overview navigates here — future phase
- **"Peak Hours" stat card** — hour-of-day aggregate showing typical usage pattern (e.g. "2 PM is your peak hour") — future phase; distinct from the chronological hourly chart
- **Heatmap on its own nav route** with expanded analytics — user wants this eventually, but Overview placement is sufficient for Phase 7

</deferred>

---

*Phase: 07-differentiator-features*
*Context gathered: 2026-03-01*
