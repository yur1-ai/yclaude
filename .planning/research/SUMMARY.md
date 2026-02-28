# Project Research Summary

**Project:** yclaude
**Domain:** Local-first AI coding analytics dashboard distributed via npm CLI
**Researched:** 2026-02-28
**Milestone:** Dashboard/Visualization (Phases 4-8)
**Confidence:** HIGH

## Executive Summary

yclaude has a solid foundation from Phases 1-3: a streaming JSONL parser with UUID deduplication, a full cost calculation engine with cache tier pricing, a privacy filter, a Hono HTTP server, and a React SPA shell with four placeholder pages. The research for this milestone covers everything needed to transform those placeholders into a fully functional analytics dashboard — charts, session explorer, activity heatmap, dark mode, and a humorous personality layer. The recommended approach is a five-phase execution (Phases 4-8) that builds from foundational data infrastructure outward to progressively richer views, ending with polish and differentiators that no competitor ships.

The central architectural decision is to keep aggregation server-side. Route handlers should receive pre-computed `AppState` indexes (timeline, byModel, byProject, sessions, heatmap) computed once at CLI startup from `CostEvent[]`, rather than aggregating per-request or sending raw events to the frontend. This pattern is already established by `computeCosts()` and needs only to be extended into a new `src/aggregation/` module. The frontend communicates via typed API endpoints using TanStack Query hooks keyed on the Zustand date range store, ensuring that changing the global date picker re-fetches all views simultaneously without any manual coordination.

The dominant risk for this milestone is not the data pipeline — that is already built and validated — but the charting integration. Recharts v3 is the correct choice, but shadcn/ui's `chart` component still wraps Recharts v2 as of February 2026 (PR #8486 is unmerged). The resolution is to use a community-maintained drop-in `chart.tsx` replacement targeting v3. A second risk is dark mode: Tailwind v4 requires `@custom-variant dark` in CSS (not `darkMode: 'class'` in a config file, which does not exist in v4), and chart colors must use CSS variables rather than hex literals or they will not respond to theme toggling. Both risks are clearly bounded and preventable with the patterns documented in the research.

## Key Findings

### From STACK.md — New Dependencies for This Milestone

The base stack (React 19, Tailwind 4, Vite 7, Hono 4.12, TypeScript 5.7, React Router v7) is installed and stable. New additions for Phases 4-8:

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| recharts | 3.7.x | All charts (area, bar, pie/donut) | React 19 peer dep fix: `overrides.react-is` in package.json |
| react-activity-calendar | 3.0.x | GitHub-style activity heatmap | v3 released Nov 2025; replaces unmaintained react-calendar-heatmap |
| @tanstack/react-table | 8.21.x | Session list table with sorting/filtering | Official shadcn/ui recommendation; headless |
| @tanstack/react-query | 5.x | API data fetching with cache keyed on date range | Required before Phase 2 cloud; good to add now |
| zustand | 5.x | Global filter state (date range) + theme store | 1.2KB; use `persist` middleware for theme store |
| @hono/zod-validator | latest | Query param validation on new API endpoints | Install in root package.json |
| date-fns | 4.1.x | Date bucketing for chart x-axis | Already confirmed in stack |

**Critical note:** shadcn/ui chart wrapper targets Recharts v2, not v3. Use the community gist `noxify/92bc410cc2d01109f4160002da9a61e5` as a drop-in v3-compatible `chart.tsx` instead of the default `npx shadcn add chart` output. This is the recommended Option A — battle-tested with 87 upvotes on the pending PR.

**Dark mode:** No extra library needed. Use a custom `ThemeProvider` (~40 LOC) following the shadcn/ui Vite dark mode guide. `next-themes` is Next.js-specific and should not be used.

**What NOT to add:** D3.js (conflicts with Recharts), Nivo (200KB+), Victory (no shadcn integration), AG Grid (enterprise bloat), Framer Motion (chart animations are built into Recharts), react-table v7 (deprecated), CSS-in-JS (conflicts with Tailwind v4).

### From FEATURES.md — Feature Set for Phases 4-8

All features consume from `CostEvent[]` via typed API endpoints. No new parsing work is required.

**Table stakes — users expect these (must ship in v1.0):**

| Feature ID | Feature | Complexity | API Needed |
|------------|---------|------------|------------|
| ANLT-01 | Total cost display | LOW | `/api/v1/summary` (already exists, extend with date params) |
| ANLT-02 | Token breakdown by type | LOW | Extend summary response |
| ANLT-03 | Cost-over-time chart (day/week/month toggle) | LOW | `/api/v1/timeline` (new) |
| ANLT-06 | Global date range picker | LOW | Client-side Zustand state |
| SESS-01 | Session list with sort/filter | MEDIUM | `/api/v1/sessions` (stub exists) |
| SESS-02 | Session detail (per-turn breakdown) | MEDIUM | `/api/v1/sessions/:id` (new) |
| CLI-03 | Dark mode (system + manual override) | LOW | None |

**Differentiators — these win against competitors:**

| Feature ID | Feature | Value Proposition | Complexity |
|------------|---------|------------------|------------|
| PRSL-01 | Humorous personality copy | Memorable, shareable, no competitor has it | LOW |
| ANLT-07 | Cache efficiency score | No competitor surfaces this as first-class metric | LOW-MEDIUM |
| ANLT-04 | Per-model donut chart | Adds interactivity + personality annotations | LOW |
| ANLT-05 | Per-project cost breakdown | `cwd` decoded to project name; standard expectation | MEDIUM |
| ANLT-08 | Activity heatmap | react-activity-calendar reduces effort; personality tooltips differentiate | LOW-MEDIUM |
| SESS-03 | Subagent/sidechain flagging | Unique: no competitor surfaces `isSidechain` data | MEDIUM |
| SESS-04 | Git branch display and filtering | Unique: no competitor uses `gitBranch` field | MEDIUM |

**Anti-features — explicitly do not build in this milestone:**
- Conversation content display (privacy liability; `applyPrivacyFilter()` already enforces the boundary)
- Real-time file watching (different product category; serve "data as of startup" with manual refresh)
- Natural language query (breaks local-first promise)
- CSV/JSON export (v1.x, not MVP)
- Cost projections (v1.x)

**Proposed phase-to-feature mapping:**
- Phase 4: ANLT-01, ANLT-02, ANLT-03, ANLT-06 (core cost analytics dashboard)
- Phase 5: ANLT-04, ANLT-05 (model and project breakdowns)
- Phase 6: SESS-01, SESS-02 (session explorer)
- Phase 7: ANLT-07, ANLT-08, SESS-03, SESS-04 (differentiators)
- Phase 8: CLI-03, PRSL-01 (dark mode + personality — full-app pass)

### From ARCHITECTURE.md — Integration Patterns

The existing code is read directly and confirms the baseline. Key architectural decisions for Phases 4-8:

**Aggregation layer:** Create `src/aggregation/` with pure functions (`buildTimelineIndex`, `buildModelIndex`, `buildProjectIndex`, `buildSessionIndex`, `buildHeatmapData`) called once in `src/server/cli.ts` before `createApp()`. `AppState` grows additively — no breaking changes to existing structure.

**Frontend state:** Zustand store in `web/src/store/filters.ts` holds the global date range. TanStack Query hooks include `dateRange.from.toISOString()` and `dateRange.to.toISOString()` in their `queryKey` arrays, so changing the date picker automatically re-fetches all views. Set `staleTime: 5 * 60 * 1000` — data is loaded at startup and will not change.

**New API endpoints (by phase):**
- Phase 4: `GET /api/v1/summary?from&to`, `GET /api/v1/timeline?bucket=day|week|month&from&to`
- Phase 5: `GET /api/v1/models?from&to`, `GET /api/v1/projects?from&to`
- Phase 6: `GET /api/v1/sessions?from&to&project&sort&order`, `GET /api/v1/sessions/:id`
- Phase 7: `GET /api/v1/cache-efficiency?from&to`, `GET /api/v1/heatmap?year`

**Dark mode architecture:** `@custom-variant dark (&:where(.dark, .dark *))` in `web/src/index.css`. Zustand `persist` store in `web/src/store/theme.ts`. FOUC prevention via inline `<script>` in `web/index.html` that reads `localStorage['yclaude-theme']` and applies `.dark` class before React mounts. Chart CSS variables defined in `index.css` under `.dark` selector.

**Files touched vs. untouched:** Parser (`src/parser/`), cost engine (`src/cost/engine.ts`), and privacy filter are complete and stable — do not modify them. Server (`src/server/server.ts`, `routes/api.ts`, `cli.ts`) and all SPA pages get additions per phase.

**Scalability:** In-memory aggregation is correct for Phase 1 scale. A typical heavy user has 500-5,000 JSONL events; aggregation of 5K events takes under 100ms. No database, no pagination at the server level, no lazy loading needed until Phase 2 cloud.

### From PITFALLS.md — Top Pitfalls for This Milestone

Fourteen pitfalls were documented. The most critical for Phases 4-8:

**Pitfall 7 — Chart colors break dark mode (hardcoded hex vs CSS variables):** Never pass `stroke="#..."` or `fill="#..."` hex literals to Recharts props — they are immune to CSS theme toggling. All chart colors must use `var(--color-*)` CSS variable references. Create a single `chartTheme.ts` module. Test both themes. Prevention: establish the CSS variable pattern before writing the first chart component, not after.

**Pitfall 8 — Date filter causes client-side N+1 re-aggregation:** The naive approach sends all `CostEvent[]` to the frontend and re-aggregates in React on every filter change. With 50K+ events, this freezes the UI thread. Prevention: aggregation is always server-side; route handlers accept `?from&to` params, filter the pre-built index, and return summary objects — never raw event arrays.

**Pitfall 9 — Dark mode with Tailwind v4 requires different setup than v3:** `darkMode: 'class'` in `tailwind.config.js` does not exist in v4 and is silently ignored. The correct approach is `@custom-variant dark (&:where(.dark, .dark *))` in `index.css`. Theme class must be applied before React mounts (blocking `<script>` in `index.html`) to prevent flash of wrong theme.

**Pitfall 10 — Activity heatmap UTC/local timezone mismatch:** Timestamp fields in JSONL are UTC. Bucketing by `new Date(ts).toISOString().slice(0, 10)` produces wrong calendar days for users in negative UTC offsets. Use `toLocaleDateString('en-CA')` client-side or `Intl.DateTimeFormat` with user timezone server-side.

**Pitfall 11 — Session list unresponsive with large datasets:** 500-2,000 sessions rendered as DOM nodes causes jank. Use server-side pagination at `GET /api/v1/sessions?page=N&limit=50` with TanStack Table for the current page. Add `@tanstack/react-virtual` only if profiling shows it is needed.

**Pitfall 12 — Cache efficiency score double-counts tokens:** `input_tokens` in JSONL already includes `cache_creation` and `cache_read` subtypes as a gross total. The correct formula is `cacheRead / input` (not `cacheRead / (input - cacheRead)`). Compute in the server route handler, not in React components, and guard against division by zero.

**Pitfall 13 — Humorous copy becomes annoying through repetition:** Static copy that appears on every load is irritating after 50 visits. Use rotating pools of quips (at least 5 per metric context) keyed to a seed (e.g., week number). Reserve premium humor for milestone moments (first $1, first $100). Data always leads; personality follows adjacent, never replacing data labels.

**Pitfall 14 — Global date filter without URL sync:** ARCHITECTURE.md recommends Zustand (not URL params) because yclaude is local-only and state shareability is not a Phase 1 requirement. This conflicts with PITFALLS.md, which recommends URL params. The resolution: for Phase 4, use Zustand as the source of truth (simpler, no URL pollution) and defer URL sync to v1.x when user feedback confirms it is needed.

## Implications for Roadmap

### Suggested Phase Structure

**Phase 4: Cost Analytics Dashboard**
- Rationale: Foundational data infrastructure (aggregation layer, API endpoints, global date filter, TanStack Query setup) must exist before any views can be built. This phase is prerequisites + the most critical page.
- Delivers: Overview page with total cost cards, cost-over-time area chart (day/week/month toggle), token breakdown, and the global date range picker that all subsequent phases inherit.
- New server code: `src/aggregation/timeline.ts`, extend `AppState`, add `/api/v1/timeline` route, extend `/api/v1/summary` with date params
- New frontend code: Zustand filter store, TanStack Query hooks, `web/src/lib/api.ts`, `StatCard`, `DateRangePicker`, `CostAreaChart`, full `Overview.tsx` implementation
- Critical ordering: Zustand store and TanStack Query must be set up before any page components. Chart CSS variable pattern must be established before writing the first chart.
- Pitfalls to avoid: Pitfall 7 (hex chart colors), Pitfall 8 (client-side aggregation), Pitfall 9 partial (@custom-variant directive must be added to index.css now, even if dark mode toggle is Phase 8)
- Research flag: Standard patterns, no additional research needed

**Phase 5: Model and Project Breakdowns**
- Rationale: Builds directly on Phase 4's filter store, TanStack Query setup, and aggregation pattern. Two new aggregation indexes (byModel, byProject), two new routes, two placeholder pages replaced.
- Delivers: Models page with donut chart + companion table; Projects page with sortable cost breakdown table.
- New server code: `src/aggregation/by-model.ts`, `src/aggregation/by-project.ts`, extend `AppState`, add `/api/v1/models` and `/api/v1/projects` routes
- New frontend code: `DonutChart.tsx`, replace `Models.tsx` and `Projects.tsx`
- Note: Project display name uses `path.basename(cwd)` or last 2 path segments — not slug decoding (cwd is the ground truth field, confirmed in Phase 1)
- Research flag: Standard patterns, no additional research needed

**Phase 6: Session Explorer**
- Rationale: Requires the most complex aggregation (`buildSessionIndex` must group `CostEvent[]` by `sessionId`, compute turn-level breakdowns, and derive session duration). Depends on Phase 4 filter infrastructure but not on Phase 5 breakdowns.
- Delivers: Sessions list page with sortable/filterable table; Session Detail page with per-turn cost breakdown and cumulative sparkline; new `/sessions/:sessionId` route.
- New server code: `src/aggregation/sessions.ts`, extend `AppState`, add `/api/v1/sessions` (list) and `/api/v1/sessions/:id` (detail) routes
- New frontend code: new `sessions/:sessionId` route in App.tsx, `SessionTable.tsx`, replace `Sessions.tsx`, new `SessionDetail.tsx`
- Note: Session duration = `endTime - startTime` derived from events; `durationMs` from parser is from system events and not always present.
- Pitfalls to avoid: Pitfall 11 (session list performance — use server-side pagination from the start)
- Research flag: Session aggregation logic (grouping by sessionId, turn ordering, sidechain handling) warrants a dedicated plan step to nail the data shapes before building

**Phase 7: Differentiator Features**
- Rationale: These are the features that separate yclaude from all competitors. They build on Phase 5 (model data for cache efficiency) and Phase 6 (sessions for sidechain flagging). Deliberately deferred until the core is solid.
- Delivers: Activity heatmap on Overview, cache efficiency score, sidechain/subagent analysis in session views, git branch column and filter in session list.
- New server code: `src/aggregation/heatmap.ts`, add `/api/v1/heatmap` and `/api/v1/cache-efficiency` routes, extend sessions endpoints with `isSidechain` and `gitBranch`
- New frontend code: `Heatmap.tsx` (react-activity-calendar), `CacheEfficiencyScore.tsx`, updates to Overview/Sessions/SessionDetail pages
- Pitfalls to avoid: Pitfall 10 (UTC/local timezone for heatmap bucketing), Pitfall 12 (cache efficiency formula — gross denominator, guard zero division)
- Research flag: react-activity-calendar theming integration with Tailwind v4 CSS variables needs a proof-of-concept before full implementation

**Phase 8: Dark Mode and Personality**
- Rationale: This is a full-app pass that should happen after all pages exist so the dark mode variants and personality copy can be applied comprehensively rather than page by page. No new backend code needed.
- Delivers: System-aware dark mode with manual toggle and no flash of wrong theme; humorous personality copy throughout all states (empty states, loading, spend thresholds, model commentary, heatmap peak annotations).
- New frontend code: `web/src/store/theme.ts` (Zustand persist), FOUC prevention script in `web/index.html`, dark mode toggle in Layout, dark: variants added across all pages/components, `web/src/lib/copy.ts` personality module
- Pitfalls to avoid: Pitfall 9 (Tailwind v4 dark mode setup), Pitfall 13 (personality copy rotation — minimum 5 quips per context, data leads, humor follows)
- Research flag: Standard patterns. shadcn/ui Vite dark mode guide is authoritative. No additional research needed.

### Phase Ordering Rationale

- Phase 4 before all others: The aggregation infrastructure (Zustand, TanStack Query, AppState indexes, API endpoint pattern with date params) is a prerequisite for every subsequent phase. Building it first means Phases 5-8 compose naturally on top.
- Phase 5 and 6 can be parallelized: They share no dependencies on each other. If two developers are available, they can proceed simultaneously after Phase 4.
- Phase 7 after 5 and 6: Cache efficiency needs per-model data (Phase 5); sidechain flagging needs session infrastructure (Phase 6).
- Phase 8 last: All pages must exist before dark mode and personality can be applied comprehensively.

### Research Flags

- Phase 4: No additional research needed — standard patterns with high-confidence documentation.
- Phase 5: No additional research needed — aggregation pattern established in Phase 4.
- Phase 6: Session aggregation logic warrants a plan step (not full research-phase) to nail `SessionSummary` data shapes and the `buildSessionIndex` contract before implementation.
- Phase 7: Heatmap theming integration (react-activity-calendar + Tailwind v4 CSS variables) warrants a proof-of-concept before full implementation. Consider a spike in the plan.
- Phase 8: No additional research needed — shadcn/ui Vite dark mode guide is authoritative; copy module is straightforward.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Sources are npm registry data, official GitHub releases, and official docs. Recharts v3 / shadcn chart v2 discrepancy is documented with primary source (shadcn author's X post). |
| Features | HIGH | Feature landscape validated against live competitors (ccusage, Claud-ometer). `CostEvent[]` data shapes confirmed by reading actual Phase 1-3 source code. |
| Architecture | HIGH | Architecture research read the actual `src/` and `web/src/` directories directly. Patterns drawn from official Hono, TanStack Query, Zustand, and Tailwind v4 docs. |
| Pitfalls | HIGH | All critical pitfalls backed by specific GitHub issue numbers or npm publish date verification. Dark mode pitfalls verified against Tailwind v4 migration docs. |

**Overall confidence:** HIGH

**Tension to resolve — Pitfall 14 vs. Architecture recommendation:**
PITFALLS.md recommends URL search params for the date filter (state persists across refreshes, bookmarkable). ARCHITECTURE.md recommends Zustand (simpler, no URL pollution, yclaude is local-only). The resolution: use Zustand for Phase 4 as designed, and add URL sync as a v1.x enhancement once user feedback confirms whether bookmarking/sharing date ranges is actually needed. Document this decision explicitly in the Phase 4 plan.

### Gaps to Address

- **Recharts v3 + community chart.tsx validation:** The community gist replacing shadcn's chart.tsx needs a hands-on proof-of-concept to confirm it works without regression before Phase 4 commits to it.
- **react-activity-calendar dark mode + Tailwind v4 theming:** The library accepts a `theme` prop with hex/oklch color arrays. Deriving these from Tailwind CSS variables at runtime via `getComputedStyle` needs to be validated in the actual Vite + Tailwind v4 environment.
- **Session duration computation:** `durationMs` in NormalizedEvent is from system events and may not be present on all events. The fallback of computing `endTime - startTime` from first/last event timestamps needs to be confirmed as sufficient before Phase 6 aggregation code is written.
- **Sub-agent token accounting:** `isSidechain: true` events are grouped by `sessionId` in the parser. Whether sub-agent token usage is additive to the parent session or separately tracked needs confirmation before Phase 7 sidechain analysis is built.

## Sources

### Primary (HIGH confidence)
- Phase 1-3 source code (`src/`, `web/src/`) — read directly; ground truth for current architecture
- [shadcn/ui chart docs](https://ui.shadcn.com/docs/components/radix/chart) — chart patterns, Recharts integration
- [shadcn/ui data table docs](https://ui.shadcn.com/docs/components/radix/data-table) — TanStack Table integration
- [shadcn/ui dark mode Vite guide](https://ui.shadcn.com/docs/dark-mode/vite) — custom ThemeProvider for Vite SPA
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — v4 integration notes
- [shadcn/ui PR #8486](https://github.com/shadcn-ui/ui/pull/8486) — Recharts v3 upgrade, open as of Feb 2026
- [shadcn author on X confirming recharts v2](https://x.com/shadcn/status/1943312755412365530) — "Still working on v3"
- [Recharts npm registry](https://www.npmjs.com/package/recharts) — v3.7.0 confirmed
- [react-activity-calendar npm](https://www.npmjs.com/package/react-activity-calendar) — v3.0.5, 19,789 weekly downloads
- [TanStack Table docs](https://tanstack.com/table/latest) — sorting, filtering, pagination APIs
- [Tailwind CSS dark mode docs](https://tailwindcss.com/docs/dark-mode) — @custom-variant approach in v4
- [ccusage GitHub](https://github.com/ryoppippi/ccusage) — competitor features, issue tracker (pitfall evidence)
- [Claud-ometer GitHub](https://github.com/deshraj/Claud-ometer) — competitor dashboard feature reference

### Secondary (MEDIUM confidence)
- [shadcn/ui Recharts v3 community gist](https://gist.github.com/noxify/92bc410cc2d01109f4160002da9a61e5) — drop-in v3-compatible chart.tsx
- [shadcn date range picker (johnpolacek)](https://github.com/johnpolacek/date-range-picker-for-shadcn) — preset date picker
- [Zustand + TanStack Query pattern](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m) — integration pattern
- [Dark mode implementation guide 2025](https://medium.com/design-bootcamp/the-ultimate-guide-to-implementing-dark-mode-in-2025-bbf2938d2526) — prefers-color-scheme, localStorage pattern
- Filter UX design patterns — preset + custom range, global filter positioning

---
*Research completed: 2026-02-28*
*Milestone: Dashboard/Visualization (Phases 4-8)*
*Ready for roadmap: yes*
