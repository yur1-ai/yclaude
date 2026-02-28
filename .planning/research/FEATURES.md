# Feature Research: Dashboard/Analytics Features

**Domain:** AI coding tool usage analytics dashboard
**Researched:** 2026-02-28
**Milestone scope:** Adding charting, data visualization, session browsing, and personality polish to existing React SPA app
**Overall Confidence:** HIGH

---

## Context: What Is Already Built

Phases 1–3 are complete. The following components exist and are solid:

- `parseAll()` — JSONL reader + normalizer + deduplicator (all assistant event fields parsed: uuid, type, timestamp, sessionId, tokens, model, requestId, isSidechain, agentId, gitBranch, cwd, durationMs)
- `computeCosts()` — per-event EstimatedCost engine with full cache tier pricing (5m 1.25x, 1h 2x, read 0.1x) for all current and deprecated Claude models
- `applyPrivacyFilter()` — strips all conversation content, returns metadata-only events
- `src/server/routes/api.ts` — `/api/v1/summary` endpoint (totalCost, totalTokens, eventCount); stub `/api/v1/events` and `/api/v1/sessions`
- React SPA shell — 4 placeholder pages (Overview, Models, Projects, Sessions) with left sidebar nav
- `AppState` — carries `costs: CostEvent[]` in-memory (NormalizedEvents already enriched with costUsd)

All new features in this milestone consume from `CostEvent[]`. This is the single data dependency that gates everything.

---

## Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete vs. competitors.

| Feature | Why Expected | Complexity | Existing Dependency | Notes |
|---------|--------------|------------|---------------------|-------|
| **ANLT-01: Total cost display** | ccusage, Claud-ometer, Anthropic Console all show this first. "How much did I spend?" is question #1. | LOW | `computeCosts()` + `/api/v1/summary` (already returns `totalCost`) | Two numbers: all-time total + selected-period total. Both labeled "estimated". The all-time value comes straight from the existing summary endpoint. Period total requires date filtering on the same data. |
| **ANLT-02: Token breakdown by type** | Every competitor shows input/output/cache as separate metrics. Cache tokens are 10x cheaper — users want to see the split. | LOW | `NormalizedEventSchema.tokens` (input, output, cacheCreation, cacheRead all parsed) | Four labeled metrics. Show as stat cards or a grouped bar. Do not show raw large numbers without formatting (use "1.2M tokens" not "1200000"). |
| **ANLT-03: Cost-over-time chart** | ccusage has daily/monthly table views. Claud-ometer has line charts. Users expect trends, not just totals. | LOW | `CostEvent[].timestamp` + `CostEvent[].costUsd` | Area or line chart with day/week/month toggle. Use Recharts `AreaChart` with `ResponsiveContainer`. X-axis is time, Y-axis is cumulative or daily cost. Toggle changes bucket size — aggregate by `date-fns` `startOfDay/startOfWeek/startOfMonth`. |
| **ANLT-06: Global date range picker** | ccusage has `--since`/`--until`. Universal dashboard pattern. Without it, users with months of history cannot focus on recent data. | LOW | Filter applied client-side against `CostEvent[].timestamp` | Preset + custom pattern: offer "Last 7 days", "Last 30 days", "Last 90 days", "This month", "All time", plus custom date range calendar. Presets cover 80% of use cases. Filter state lives in Zustand (or React context) and is consumed by all views. Use shadcn's DateRangePicker composition (Popover + Calendar) or the johnpolacek community component. |
| **SESS-01: Session list** | Claud-ometer has session browser. ccusage has session mode. Users want to browse and compare sessions. | MEDIUM | `CostEvent[].sessionId` + `cwd` + `gitBranch` + `timestamp` + `durationMs` | Sortable table: project, model, estimated cost, timestamp, duration. Paginate at 25 rows. Sort by any column (click header). Filter by project and model. Good default sort: newest first. |
| **SESS-02: Session detail** | Claud-ometer has full conversation replay. Users expect drill-down. yclaude's version is privacy-safe: metadata only. | MEDIUM | Session events grouped by sessionId; per-turn token breakdown from `CostEvent[]` | Per-turn table: timestamp, model, tokens (input/output/cache), estimated cost per turn. Show cumulative cost timeline as small sparkline or area chart. No conversation content ever — only metadata. |
| **CLI-03: Dark mode** | Industry standard for developer tools in 2026. 60%+ prefer dark themes. Missing = feels amateur. | LOW | Tailwind CSS v4 dark mode via `dark:` variant | System preference via `window.matchMedia('(prefers-color-scheme: dark)')`. Manual toggle stored in localStorage. Apply `dark` class on `<html>`. Use Tailwind's `dark:` variant throughout. No flash of wrong theme — read localStorage before first render. |

---

## Differentiators (Features That Win)

These are what make yclaude better than ccusage and Claud-ometer. Ordered by impact vs. effort ratio.

| Feature | Value Proposition | Complexity | Existing Dependency | Notes |
|---------|-------------------|------------|---------------------|-------|
| **PRSL-01: Humorous personality copy** | No competitor has personality. "You burned 847K tokens this week. We don't judge. (We judge a little.)" — makes the tool memorable, shareable, on-brand. LOW effort, HIGH brand impact. | LOW | None — pure copy layer | Copy system: a `personality.ts` module with message arrays keyed by context (empty state, spend thresholds, model choices, loading). Rotate randomly or select based on current data. Contexts to cover: (1) empty states for each page, (2) loading state messages, (3) spend threshold callouts (under $1, $1-10, $10-50, $50+, $100+), (4) model choice commentary (heavy Opus use = "Living dangerously"), (5) cache efficiency commentary, (6) high-spend day annotations on heatmap. Keep all strings in one file — easy to iterate copy without touching components. |
| **ANLT-07: Cache efficiency score** | No competitor surfaces this as a first-class metric. Claude Code's caching saves ~90% on cached tokens. Showing a score teaches users and saves money. | LOW-MEDIUM | `CostEvent[].tokens.cacheRead` + `cacheCreation` + `input` | Formula: `cacheRead / (cacheRead + cacheCreation + input)`. Display as a percentage with a trend arrow (up = improving). Add personality threshold messages: <20% "Your cache is barely trying", 20-50% "Getting warmer", 50-75% "Nice!", 75%+ "Cache god". Trend requires comparing current period's efficiency to prior period. |
| **ANLT-04: Per-model donut chart** | Every competitor shows this but yclaude can add personality + interactivity. | LOW | `CostEvent[].model` + `costUsd` | Recharts `PieChart` with `innerRadius` > 0 for donut shape. Center label shows total. Clicking a slice highlights it and filters the companion table. Legend below the chart. Tooltip shows model name, cost, percentage. Companion sortable table shows model, cost, token counts, session count. |
| **ANLT-05: Per-project cost breakdown** | ccusage has `--project`. Claud-ometer has full Projects view. Users working across repos need this. | MEDIUM | `CostEvent[].cwd` (actual path, not slug — parser already stores `cwd`) | Decode `cwd` to readable project name (last path segment: `/Users/alex/work/myapp` → `myapp`). Group and sum by decoded name. Show as sortable table: project name, estimated cost, token count, session count. Bar chart variant for visual comparison. Note: the parser stores the actual `cwd` path directly — no slug decoding needed. Just use `path.basename(cwd)` or last non-empty segment. |
| **ANLT-08: Activity heatmap** | Claud-ometer has this but yclaude can add personality annotations. Visual at-a-glance usage intensity over months. | LOW-MEDIUM | `CostEvent[].timestamp` aggregated by date | Use `react-activity-calendar` (30K weekly downloads, MIT, SSR-compatible, supports dark mode, tooltips, click handlers, custom colors). Data shape: `{ date: string, count: number, level: 0-4 }`. Map daily cost or token count to intensity levels. Annotate the highest-spend day with personality copy in tooltip: "Your most expensive Tuesday ever." Clicking a day filters the session list to that date. |
| **SESS-03: Subagent/sidechain flagging** | No competitor surfaces `isSidechain` data. "32% of your tokens went to sub-agents you never saw" is a unique insight. | MEDIUM | `CostEvent[].isSidechain` (parsed and in NormalizedEvent) | In session list: badge "has subagents" on sessions with isSidechain events. In session detail: separate section "Subagent activity" with its own token/cost breakdown. Summary stat: "X% of this session's cost was from subagents." On the overview: total subagent cost as a stat card. |
| **SESS-04: Git branch display and filtering** | No competitor uses `gitBranch` data. Connecting AI spend to actual feature branches is a unique insight. | MEDIUM | `CostEvent[].gitBranch` (parsed and in NormalizedEvent) | In session list: show git branch column (may be null/empty for non-git or ungit'd projects). Add branch filter — free-text search or dropdown of unique branches. In session detail header: show "Branch: feature/auth-refactor". On the Models/Projects page: consider a "Top branches by cost" table in v1.x. Edge case: multiple branches within one session (user switched mid-session) — show "Multiple" or the first/most frequent branch. |

---

## Feature Dependencies on Existing Code

```
CostEvent[] (from computeCosts() on NormalizedEvent[])
  |
  |-- ANLT-01: totalCost (sum of costUsd) — /api/v1/summary already has this
  |-- ANLT-02: token breakdown (tokens.input/output/cacheCreation/cacheRead)
  |-- ANLT-03: cost-over-time (group CostEvent by timestamp bucket)
  |-- ANLT-04: per-model donut (group by model, sum costUsd)
  |-- ANLT-05: per-project (group by basename(cwd), sum costUsd)
  |-- ANLT-06: global date filter (filter CostEvent[] by timestamp range — client-side)
  |-- ANLT-07: cache efficiency (tokens.cacheRead / total input tokens — ratio)
  |-- ANLT-08: activity heatmap (group by date(timestamp), sum cost or tokens)
  |-- SESS-01: session list (group by sessionId, aggregate metadata)
  |     |-- SESS-02: session detail (filter to sessionId, per-event breakdown)
  |     |-- SESS-03: sidechain flagging (filter by isSidechain within sessionId)
  |     |-- SESS-04: git branch (gitBranch field per event, branch per session)
  |
  |-- CLI-03: dark mode (CSS/Tailwind, no data dependency)
  |-- PRSL-01: personality copy (data-driven thresholds, no new API needed)
```

**Critical path:** The `/api/v1/summary` endpoint already exists and returns `totalCost + totalTokens + eventCount`. New API endpoints needed are:
- `/api/v1/timeline?groupBy=day|week|month&since=...&until=...` → time-bucketed cost data
- `/api/v1/sessions` → session list with aggregated metadata (stub already exists)
- `/api/v1/sessions/:id` → per-turn session detail
- `/api/v1/projects` → per-project breakdown
- `/api/v1/models` → per-model breakdown

All endpoints aggregate from the same `CostEvent[]` that is already in `AppState`. No new parsing or data pipeline work is needed.

---

## Anti-Features (Explicitly Do NOT Build)

| Feature | Why Requested | Why NOT to Build | What to Do Instead |
|---------|---------------|-------------------|--------------------|
| **Conversation content display** | "Show me what I said in that session." Claud-ometer shows full replay. | Privacy liability — displaying conversation text in a tool with cloud roadmap raises the security bar dramatically. The existing `applyPrivacyFilter()` already enforces this boundary. Breaking it now creates technical debt before cloud is built. | Show per-turn metadata (tokens, model, cost, timestamp) without any text. Link to the raw JSONL file path for users who want the content. The privacy-safe boundary IS a feature — market it as trust. |
| **Real-time file watching** | "Auto-update while Claude is running." Claude Code Usage Monitor does this. | Requires `chokidar`/`fs.watch`, WebSocket or SSE connection, partial re-parse logic. yclaude is a historical dashboard, not a live monitor. This is a different product category. | Show "Data as of [startup time]" label. Add a manual refresh button that re-reads and re-parses. Auto-refresh on a 60s interval if technically simple. Defer to a future "live mode" feature. |
| **Natural language query ("ask about my usage")** | "Chat with your data." Trendy AI-in-AI feature. | Requires LLM API calls (breaks local-first privacy promise) or shipping a model (adds 100MB+). Marginal value vs. well-designed filters. | Good filter UX + the personality copy layer already makes the dashboard feel "smart" without actual AI. Pre-built insight cards answer the 5 most common questions. |
| **CSV/JSON export** | "Take my data into a spreadsheet." Reasonable request. | Not needed to make v1 compelling. Adds API surface area and download UI without advancing the core MVP. | Build it in v1.x once core views are validated. The data is already structured in a clean JSON API — export is a thin wrapper. |
| **Cost projections** | "How much will I spend this month?" Useful future feature. | Requires rolling average calculation, remaining-days projection, confidence intervals. Medium-complexity feature for an unproven dashboard. | Defer to v1.x. The cost-over-time chart already visually implies the trend. Add "projected end-of-month" as a single stat card in v1.x once the chart is solid. |
| **Insights/recommendations panel** | "Tell me how to save money." Valuable coaching feature. | Requires analyzing patterns across all dimensions and generating contextual tips. High complexity, hard to make non-obvious. Medium risk of being annoying if wrong. | Defer to v1.x. The personality copy layer provides lightweight "insights" without a formal rule engine. A well-done personality callout ("You used Opus for 67% of messages") is lighter and still teaches. |
| **Shareable session snapshots** | "Share my usage stats with my team/Twitter." | Requires generating self-contained HTML, excluding conversation content carefully, download/share flow. Medium-high complexity for v1. | Defer to v1.x. Screenshots of the dashboard itself serve the immediate sharing need. |
| **Budget alerts / notifications** | "Tell me when I hit $50." | Requires a persistent background process or cloud service. yclaude v1 is an on-demand dashboard launched by `npx`. | Show a budget progress bar on the overview page ("$47 of $50 budget"). Manual threshold entry. No push notifications in v1. |

---

## UX Patterns for This Domain

### Date Range Picker (ANLT-06)

**Pattern: Presets + Custom Calendar**

- LEFT column: preset buttons ("Today", "Last 7 days", "Last 30 days", "Last 90 days", "This month", "All time")
- RIGHT column: two-month calendar for custom range when presets don't cover the need
- Trigger: a button in the top-right of every page showing the current range ("Last 30 days ▾")
- Scope: the selected range is GLOBAL — it filters every chart and table on every page simultaneously
- State: store in Zustand + URL search params (allows bookmarking a time range)
- "All time" is the recommended default for new users (they want to see everything first)
- Clear filter: always accessible; "Clear" returns to "All time" default
- Source: [shadcn date range picker community component](https://github.com/johnpolacek/date-range-picker-for-shadcn) (MIT, presets included)

**Edge cases:**
- Empty data for the selected range → show empty state with personality copy, not a broken chart
- Range narrower than 1 day → "daily" grouping is the only sensible option
- Single-event days → still render on the chart, just a short bar/line

### Cost-Over-Time Chart (ANLT-03)

**Pattern: Area chart with granularity toggle**

- Default view: line or area chart, daily granularity
- Toggle buttons: Day / Week / Month — change bucket size, not the date range
- X-axis: dates formatted contextually (Jan 15, Week of Jan 13, January 2026)
- Y-axis: USD with smart formatting ($0.12, $1.40, $23.50 — not $0.1200)
- Tooltip on hover: show bucket label + cost for that period
- Zero-value days: render as 0, not omitted (gaps in the line suggest missing data)
- Recharts `AreaChart` with `ResponsiveContainer` — SVG-based, handles typical data volumes (< 365 data points per view)
- shadcn chart wrapper provides the visual style out of the box

### Per-Model Donut Chart (ANLT-04)

**Pattern: Donut + companion table**

- Donut chart: Recharts `PieChart` with `innerRadius` gap; center shows total estimated cost
- Clicking a slice highlights it and cross-filters the table below
- Legend to the right of or below the donut, not inside it
- Table columns: Model, Estimated Cost, % of Total, Input Tokens, Output Tokens, Cache Tokens
- Table is sortable by any column; default sort: cost descending
- Models with < 1% share collapsed into "Other" (prevents noise from rare models)
- Unknown models (not in pricing table) shown as "Unknown model" with cost flagged as 0 and a tooltip explaining

**Edge case: single model** — render a full circle (no donut hole needed) or suppress the chart in favor of a single stat card.

### Activity Heatmap (ANLT-08)

**Pattern: GitHub-style calendar with personality tooltips**

- Component: `react-activity-calendar` (v3.1.1, MIT, 30K weekly downloads, dark mode native, click handlers, tooltip support)
- Data: one entry per day with `date` (ISO string), `count` (total tokens that day or number of sessions), `level` (0–4 intensity bucket)
- Intensity mapping: compute 20th/40th/60th/80th percentile of daily values, map to levels 1–4; level 0 = no activity
- Color theme: single-hue gradient (cool blue for low activity, accent color for high activity) matching the app's brand; respects dark/light mode
- Tooltips: date + daily cost + daily token count; for the highest-spend day in the dataset, append a personality line ("Your most expensive day of the year")
- Click a day: filter the session list to sessions on that day
- Year view is standard; consider a "rolling 52 weeks" view so it always shows a full year
- Show "X days active" and "X total sessions this year" as summary stats below the calendar
- Empty state (no data): show a greyed-out calendar grid with personality copy ("Run Claude Code first. Then come back. We'll be here.")

**Edge cases:**
- Very new user (< 2 weeks of data): still render the calendar; recent days will be filled, older days empty (level 0). This is fine — shows how recently they started.
- Extremely high-spend day: cap intensity at level 4 so a single outlier doesn't wash out the rest of the calendar.

### Session List (SESS-01)

**Pattern: Sortable, filterable table with project + model filters**

- Columns: Project (decoded from `cwd`), Git Branch, Model, Estimated Cost, Turns (message count), Duration, Timestamp
- Default sort: Timestamp descending (newest first)
- Sortable by: Cost, Turns, Duration, Timestamp (click column header; toggle asc/desc)
- Filters: Project (dropdown of unique project names), Model (dropdown), Git Branch (free text), and the global date range (inherited)
- Pagination: 25 rows per page; options for 50 and 100
- Row click: navigate to session detail
- Subagent indicator: small badge on rows where `isSidechain` events exist ("has subagents")
- Cost formatting: `$0.00` format, not raw numbers
- Duration formatting: "14m 30s" not "870000ms"
- Empty state with personality copy when filters match nothing

**Edge cases:**
- Sessions with no duration (durationMs null): show "—" or "N/A"
- Sessions spanning multiple git branches: show the most frequent or a "Multiple branches" indicator
- Sessions with unknown model: show model ID raw string (don't hide it)

### Session Detail (SESS-02)

**Pattern: Drill-down with per-turn table and cost sparkline**

- Header: Project, Git Branch, Model, Total Estimated Cost, Total Duration, Session ID (truncated + copy button)
- Turn table: Turn #, Timestamp, Model, Input Tokens, Output Tokens, Cache Tokens, Estimated Cost
- Small area chart above the table: cumulative cost over the session's turns (sparkline style)
- Subagent section (if isSidechain events exist): separate breakdown showing subagent turns, tokens, and cost vs. main session
- No conversation text — only metadata
- "Back to sessions" link/breadcrumb

**Edge cases:**
- Single-turn session: skip the sparkline (a chart of 1 point is useless), show a stat card instead
- Very long session (100+ turns): paginate the turn table (25 per page)
- Turns with `unknownModel?: true`: show model ID + "(unknown pricing)" note

### Personality Copy (PRSL-01)

**Pattern: Single-source copy module with context-keyed message arrays**

Architecture recommendation: one file `web/src/lib/personality.ts` exporting message arrays keyed by context. Components pick a message (random or deterministic based on data value) and render it in-place.

**Contexts and example copy:**

| Context | Example messages |
|---------|-----------------|
| Overview empty state | "Nothing here yet. Run `npx yclaude` again after asking Claude to do... anything." |
| Sessions empty state | "No sessions match your filters. Either your dates are too narrow, or you've been suspiciously productive today." |
| Loading state | "Counting your tokens… this may take a moment of shame." / "Parsing your life choices..." |
| Low spend (< $1) | "Wow, so frugal. Either you're efficient, or you haven't started yet." |
| Medium spend ($1–$10) | "Respectable. Claude has noticed." |
| High spend ($10–$50) | "Getting spicy. Worth it, probably." |
| Very high spend ($50–$100) | "We don't judge. (We judge a little.)" |
| Extreme spend ($100+) | "You burned $XXX. Somewhere, an Anthropic engineer bought a nice dinner." |
| Cache efficiency < 20% | "Your cache hit rate is [X]%. Your cache is barely trying." |
| Cache efficiency 75%+ | "Cache hit rate: [X]%. You're a prompt caching wizard." |
| Heavy Opus usage (>50%) | "67% Opus. Living dangerously." |
| Heatmap peak day tooltip | "Your most expensive [weekday] ever." |
| Subagent section | "Claude called in reinforcements. [X]% of this session's cost was sub-agents working in the shadows." |

**UX constraints:**
- Never replace a data label with personality copy — always append or place adjacent to data
- Keep messages short: 1–2 sentences maximum
- Avoid copy that could feel patronizing for professional users ("don't judge" works, "bad job" doesn't)
- All copy lives in one file — easy for future contributors to improve without touching components

### Dark Mode (CLI-03)

**Pattern: System-aware + manual override, no flash**

Implementation steps:
1. Read `localStorage.getItem('theme')` on initial mount BEFORE first render
2. If stored: apply it. If not stored: detect `window.matchMedia('(prefers-color-scheme: dark)').matches`
3. Apply `dark` class to `<html>` element
4. Use Tailwind `dark:` variant throughout all components
5. Listen to `window.matchMedia` change events to auto-update when system preference changes (only if user hasn't set a manual override)
6. Toggle button in the sidebar or top nav: shows sun/moon icon, stores preference in localStorage

**Edge case: Flash of Wrong Theme (FOWT)**
- Server-side: not applicable (this is a pure SPA loaded by Hono)
- But the React hydration can still flash on slow machines
- Mitigation: inline script in `<head>` of `index.html` that reads localStorage and applies the class before React mounts

---

## Feature Complexity Summary

| Feature ID | Name | Complexity | API Needed | Notes |
|------------|------|------------|------------|-------|
| ANLT-01 | Total cost display | LOW | `/api/v1/summary` (exists) | Just needs period filtering wired to existing endpoint |
| ANLT-02 | Token breakdown | LOW | `/api/v1/summary` (extend) | Add token fields to summary response |
| ANLT-03 | Cost-over-time chart | LOW | `/api/v1/timeline` (new) | Bucketing logic on server or client |
| ANLT-04 | Per-model donut | LOW | `/api/v1/models` (new) | Simple group-by on CostEvent[].model |
| ANLT-05 | Per-project breakdown | MEDIUM | `/api/v1/projects` (new) | cwd decoding to display name |
| ANLT-06 | Global date range picker | LOW | Client-side filter | Presets + custom calendar, Zustand state |
| ANLT-07 | Cache efficiency score | LOW-MEDIUM | `/api/v1/summary` (extend) | Ratio calculation + trend requires two-period comparison |
| ANLT-08 | Activity heatmap | LOW-MEDIUM | `/api/v1/timeline` (reuse) | react-activity-calendar library reduces effort |
| SESS-01 | Session list | MEDIUM | `/api/v1/sessions` (new) | Group by sessionId, aggregate metadata |
| SESS-02 | Session detail | MEDIUM | `/api/v1/sessions/:id` (new) | Per-turn aggregation from CostEvent[] |
| SESS-03 | Subagent flagging | MEDIUM | Extend sessions endpoints | isSidechain already parsed |
| SESS-04 | Git branch display/filter | MEDIUM | Extend sessions endpoints | gitBranch already parsed |
| CLI-03 | Dark mode | LOW | None | Tailwind dark: + localStorage |
| PRSL-01 | Personality copy | LOW | None | Copy module, no new API |

---

## MVP for This Milestone

**Phase 4 — Cost Analytics Dashboard:** ANLT-01, ANLT-02, ANLT-03, ANLT-06

**Phase 5 — Model & Project Breakdowns:** ANLT-04, ANLT-05

**Phase 6 — Session Explorer:** SESS-01, SESS-02

**Phase 7 — Differentiator Features:** ANLT-07, ANLT-08, SESS-03, SESS-04

**Phase 8 — Dark Mode & Personality:** CLI-03, PRSL-01

**Deferred to v1.x:**
- CSV/JSON export
- Cost projections
- Insights/recommendations panel
- Shareable snapshots
- Real-time file watching

---

## Implementation Notes for Phase Planning

### API endpoints to build (Phases 4–7)

The server-side work is straightforward aggregation over `AppState.costs: CostEvent[]`. All endpoints follow the same pattern: receive query params (date range, filters), filter the in-memory array, aggregate, return JSON.

New endpoints:
- `GET /api/v1/summary?since=&until=` — extend existing, add date filtering and period total
- `GET /api/v1/timeline?groupBy=day|week|month&since=&until=` — time-bucketed cost + token data
- `GET /api/v1/models?since=&until=` — per-model aggregated cost + token counts
- `GET /api/v1/projects?since=&until=` — per-project (decoded cwd) aggregated cost + session count
- `GET /api/v1/sessions?since=&until=&project=&model=&branch=` — session list with pagination
- `GET /api/v1/sessions/:sessionId` — per-turn detail for one session

### Date filtering approach

Apply date filtering on the server (in route handlers) rather than client-side to keep response payloads small. The global date range picker sends `since`/`until` ISO timestamps as query params with every API request.

### react-activity-calendar integration

Install: `npm install react-activity-calendar`

Data transformation: group `CostEvent[]` by `date-fns/startOfDay`, sum `costUsd` per day, map to intensity levels using percentile bucketing. Pass as `{ date: string, count: number, level: 0|1|2|3|4 }[]`.

The library handles SVG rendering, dark mode, tooltips, and click handlers natively. Low integration effort.

### Recharts charts

All charts use `recharts` (already in stack). Use shadcn's chart wrapper components for consistent styling. `ResponsiveContainer` on all charts. `AreaChart` for time series, `PieChart` with `innerRadius` for donut, custom `Tooltip` for personality annotations.

### Project name decoding

The `cwd` field in parsed events stores the actual working directory path (e.g., `/Users/alex/work/myapp`). Use `path.basename(cwd)` for the display name. For paths ending in `/`, use the second-to-last segment. Edge case: projects with the same basename but different full paths — show the full path in a tooltip.

---

## Sources

- [shadcn/ui date range picker (johnpolacek)](https://github.com/johnpolacek/date-range-picker-for-shadcn) — community component, MIT, preset support (HIGH confidence)
- [react-activity-calendar npm/GitHub](https://github.com/grubersjoe/react-activity-calendar) — 30K weekly downloads, MIT, v3.1.1 (HIGH confidence)
- [Filter UX design patterns — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering) — filter positioning, global filters, clear-all pattern (MEDIUM confidence)
- [Date filter UI patterns — Evolving Web](https://evolvingweb.com/blog/most-popular-date-filter-ui-patterns-and-how-decide-each-one) — preset + custom range pattern (MEDIUM confidence)
- [Data table design best practices — LogRocket](https://blog.logrocket.com/ux-design/data-table-design-best-practices/) — sortable columns, default pagination, drill-down (MEDIUM confidence)
- [Empty state UX writing — Contentphilic](https://contentphilic.com/empty-state-ux-writing-examples/) — personality copy in empty states, emotional hooks (MEDIUM confidence)
- [Microcopy best practices 2025 — Pippit](https://www.pippit.ai/resource/microcopy-best-practices-2025-guide-to-ux-writing) — whimsical copywriting guidelines, tone constraints (MEDIUM confidence)
- [Dark mode implementation guide 2025 — Medium/Design Bootcamp](https://medium.com/design-bootcamp/the-ultimate-guide-to-implementing-dark-mode-in-2025-bbf2938d2526) — prefers-color-scheme, localStorage pattern, React (HIGH confidence)
- [Recharts official documentation](https://recharts.github.io/en-US/api/) — AreaChart, PieChart, ResponsiveContainer API (HIGH confidence)
- [Claud-ometer GitHub](https://github.com/deshraj/Claud-ometer) — competitor feature reference: activity heatmap, cache metrics, session browser (HIGH confidence)
- [ccusage GitHub](https://github.com/ryoppippi/ccusage) — competitor feature reference: date filtering, project filtering, session mode (HIGH confidence)
- [Langfuse cost dashboard](https://research.aimultiple.com/agentic-monitoring/) — AI tool cost breakdown pattern reference (MEDIUM confidence)
- [Agent Session View GitHub](https://github.com/dotneet/agent-session-view) — session metadata display pattern: session ID, timestamp, cwd, git branch, model (MEDIUM confidence)
- [shadcn/ui chart components](https://ui.shadcn.com/docs/components/radix/chart) — Recharts wrappers, chart style (HIGH confidence)

---

*Feature research for: yclaude dashboard/analytics features (Milestone v1.0)*
*Researched: 2026-02-28*
*Scope: ANLT-01 through ANLT-08, SESS-01 through SESS-04, CLI-03, PRSL-01*
