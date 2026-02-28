# Phase 4: Cost Analytics Dashboard - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the core Overview page with four capabilities: all-time + period cost stat cards, token type breakdown, cost-over-time bar chart, and a global date range picker that filters all views via TanStack Query. All other pages (Models, Projects, Sessions) remain placeholder stubs — out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Date range picker
- Placement: top-right of the Overview page
- Presets: 7d (default on load) · 30d · 90d · All time · Custom date picker
- No 24h preset — deferred (see Deferred Ideas)
- When selected range exceeds available data: show available data silently, no warning
- Changing the picker triggers coordinated re-fetch via TanStack Query across all cards and chart

### Token breakdown visualization
- Layout: progress bars per token type (four rows: Input, Output, Cache write, Cache read)
- Each row shows: label · color-coded bar · token-share % · token count · estimated cost in $
- Bar width represents token share % (not cost share %)
- Semantic colors: blue=input, emerald=output, amber=cache write, slate=cache read
- Footer row: total tokens + total estimated cost (ties breakdown back to headline stats)

### Cost stat cards
- Style: big hero numbers — dollar amount is the visual anchor, label above
- Two cards side by side: "All-time est." and "Last [N]d est." (label reflects selected range)
- Period card includes trend indicator: arrow + % change vs prior equivalent period
- Trend arrows are neutral gray — no red/green color judgment on spend direction

### Cost-over-time chart
- Chart type: column bar chart (not area/line) — daily data is discrete, bars are honest
- Bar style: rounded top corners (2–4px radius), light gray gridlines behind bars
- Hover tooltip shows exact estimated cost for that day/week/month
- Toggle: Daily (default) · Weekly · Monthly
- Default bucketing: Daily
- X-axis label density: smart auto-thinning — never overlapping, adapts to range
  - 7d daily: every day label
  - 30d daily: every 5th day or week-start labels
  - 90d weekly: month name labels
- Zero-cost days: show as $0 bars (preserves timeline, makes inactivity visible)

### Claude's Discretion
- Chart library selection (Recharts recommended — mature React support, CSS var-compatible fills)
- Exact color values for semantic token type colors (must be defined as CSS vars for dark mode)
- TanStack Query setup and cache invalidation strategy
- Date picker component library selection
- Responsive layout breakpoints

</decisions>

<specifics>
## Specific Ideas

- Bar chart design reference: "subtle rounded top corners (2-4px), light gray gridlines, hover tooltip" — feels polished without being flashy
- The token cost column ($3.60 / $10.20 / $0.81 / $0.08) is intentionally prominent — it tells the "why cache matters" story: cache read is 10% of tokens but nearly free; output is 25% of tokens but most expensive
- Area chart noted as better fit for future weekly/monthly views or cumulative cost views — keep in mind for Phase 7/8

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `web/src/components/Layout.tsx`: Left sidebar + `<main className="flex-1 overflow-auto p-8">` — Overview page content goes inside main
- `web/src/pages/Overview.tsx`: Stub page (replace entirely in this phase)
- `/api/v1/summary`: Returns `{ totalCost, totalTokens: { input, output, cacheCreation, cacheRead }, eventCount }` — needs date filtering query params added

### Established Patterns
- Tailwind v4 (`@import "tailwindcss"`) — CSS vars for colors go in `index.css` as `@theme` or `:root` block
- React Router v7 (hash router) — all pages use `<Outlet />` pattern
- No TanStack Query installed yet — needs to be added to `web/package.json`
- No chart library installed yet — needs to be added
- No date picker library installed yet — needs to be added

### Integration Points
- API date filtering: `/api/v1/summary` needs `?from=` and `?to=` query params (ISO date strings)
- Server-side: `src/server/routes/api.ts` is where the filter logic goes
- CSS vars for chart colors: define in `web/src/index.css`, reference as `var(--color-input)` etc. in chart components — satisfies Phase 8 dark mode requirement

</code_context>

<deferred>
## Deferred Ideas

- **24h range + Hourly bucketing** — "Last 24 hours" preset with hourly bars. Deferred because 7d daily is more useful for cost patterns and 24h + daily = 1 useless bar. Add in a later phase when real user feedback suggests it's needed.
- **Auto-fit bucketing** — Chart auto-selects granularity based on range (24h→hourly, 7d→daily, 90d→weekly). More complex to implement and adds edge cases. Revisit after MVP.
- **Area/gradient chart variant** — Better fit for weekly/monthly trend views or cumulative cost views. Consider for Phase 7 or when adding multi-series stacked views (input + output + cache breakdown over time).

</deferred>

---

*Phase: 04-cost-analytics-dashboard*
*Context gathered: 2026-02-28*
