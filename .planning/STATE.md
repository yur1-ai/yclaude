---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Analytics Completion + Distribution
status: in_progress
last_updated: "2026-03-01T22:57:00Z"
progress:
  total_phases: 9
  completed_phases: 8
  total_plans: 25
  completed_plans: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28 after v1.0 milestone)

**Core value:** Give developers full visibility into their AI coding spend — locally first, with no friction.
**Current focus:** v1.1 Phase 9 — npm Distribution & CI/CD

## Current Position

Phase: 09-npm-distribution-ci-cd
Plan: 09-01 ✅ — complete
Status: 09-01 ✅ — Phase 9 Plan 1 complete
Last activity: 2026-03-01 — 09-01 complete; unified dist/ output, prod tsup bundle, Biome at exit 0, package.json publish-ready

## Accumulated Context

### Decisions Carrying Forward

- Hash routing (`createHashRouter`) — keep using for SPA; no server catch-all needed
- API routes registered before `serveStatic` — enforce in all future route additions
- `webDistPath` via `fileURLToPath(new URL(..., import.meta.url))` — required for npx correctness; critical for Phase 9 (npm distribution)
- UTC Date methods throughout bucketing — never use local `getDay()`/`setDate()` with ISO timestamps
- Zustand for global filters (not URL params) — revisit only if shareable links requested
- `queryKey` must use serialized store values, not `new Date()` — prevents infinite refetch loops
- All chart colors use `var(--color-*)` CSS vars — never hardcode hex in Recharts components
- All aggregation is server-side — frontend never receives raw `CostEvent[]` arrays
- Token tooltip (CSS-only hover) lives in consuming page render prop, not inside SortableTable — keeps component generic
- Row key uses array index in SortableTable — rows have no stable identity key in API shape
- ModelRow/ProjectRow must extend Record<string, unknown> for SortableTable generic constraint — add to all future row interfaces
- Recharts Tooltip formatter receives `number | undefined` — always guard against undefined value
- Session aggregation: collect ALL events into Map by sessionId, then filter token-bearing at field-level for token sums/model arrays
- durationMs for sessions: Math.max across ALL events (not just token-bearing) — system/turn_duration events may carry larger values
- Explicit field construction in TurnRow/SessionSummary — never spread raw CostEvent to prevent prose leakage
- SessionRow extends Record<string, unknown> — consistent with ModelRow/ProjectRow generic constraint pattern
- ProjectLink extracted as named component — column render props cannot use hooks; must wrap in named component for useNavigate
- setPage exposed from useSessions return value — allows Sessions.tsx useEffect to reset pagination on filter change
- TurnRow extends Record<string, unknown> — consistent with ModelRow/ProjectRow/SessionRow generic constraint pattern
- Multiple SortableTable columns can share the same `key: keyof T` value for display-only non-sortable columns; use render prop to differentiate; column React keys use index suffix to prevent duplicate-key warnings
- Detail page layout: page-header (back + title), summary-card, chart-card, table-card (chart before table) with space-y-6 outer wrapper
- Error state for detail pages: check error.message === 'Session not found' to distinguish 404 from other failures
- SortableTable onRowClick: pass callback to make full row clickable; do NOT use button inside td (nested interactivity); column render for navigation should be plain text
- SortableTable null sort: null values always sort to bottom regardless of direction (guard before numeric/string comparison)
- Cost display: always toFixed(2) in all FE cost renders — never toFixed(4) or toFixed(6); label as "est." for API-key context
- Donut chart: use CSS rule `.recharts-wrapper svg *:focus { outline: none }` to suppress browser focus border on click
- Subagent cost split: mainCostUsd = sum(!isSidechain events), subagentCostUsd = sum(isSidechain===true events); costUsd === mainCostUsd + subagentCostUsd always (backward compat preserved)
- gitBranch on session list/detail = first sorted event's gitBranch that is truthy; null if none
- ?branch= filter on /sessions applied at event level before grouping (mirrors ?project= filter pattern)
- hour bucket in /cost-over-time does NOT gap-fill — consistent with week/month behavior; only day bucket gap-fills
- Intl.DateTimeFormat('en-CA') locale for local date strings: produces YYYY-MM-DD guaranteed, no manual zero-padding
- /activity counts distinct sessionIds per local date (not event count) — measures session density not API call volume
- branchFilter lives only in Sessions.tsx local state (not Zustand) — prevents filter from leaking into Overview stats
- SessionSummary new fields (mainCostUsd, subagentCostUsd, hasSubagents) typed as optional for backward safety
- SubagentBadge rendered in model column render prop (not separate column) — contextually linked to model info, avoids table width creep
- react-activity-calendar v3: named import only { ActivityCalendar }; default export removed; hex-only colors in theme prop (CSS vars not supported)
- Heatmap tooltip: browser-native title attribute via cloneElement — no third-party tooltip library needed
- usePriorSummary: enabled=false when from/to undefined; prior period = [from - duration, from]; queryKey uses ISO strings
- CacheEfficiencyCard local mode state (inputCoverage|cacheHitRate) — does NOT affect global date range store
- ActivityHeatmap holds local year state only — does NOT import useDateRangeStore (orthogonal to global date filter)
- SubagentStatCard inline in Overview.tsx (no separate component); only renders when subagentCostUsd > 0 (prevents 0% confusion for non-subagent users)
- /summary now returns subagentCostUsd and mainCostUsd; SummaryData gains optional fields for backward safety
- HH:00 label uses dateStr.slice(11,13) not new Date(dateStr) — backend returns 'YYYY-MM-DDTHH' (non-ISO); new Date() would produce 'Invalid Date'
- LOCAL_TZ computed once at module load (Intl.DateTimeFormat().resolvedOptions().timeZone) — not per-render
- ?tz= always sent on all /cost-over-time requests regardless of bucket — backend ignores for non-hour buckets; simplifies client logic
- Hourly bucket in CostBarChart disabled when from/to undefined or range > 48h; tooltip via CSS-only group-hover (no JS state)
- from/to passed as props to CostBarChart (not imported from store) — keeps component testable and decoupled
- localStorage key 'yclaude-theme' matches Zustand persist name field exactly — mismatch causes FOUC on reload
- FOUC script reads { state: { theme }, version } Zustand persist wrapper shape, not raw string
- OS preference listener at module level (not per-render) re-calls applyTheme only when stored theme is 'system'
- ThemeToggle cycles between 'light' and 'dark' only — 'system' is initial default, cannot be toggled back via button
- --color-axis-tick added to @theme block with .dark override — available for chart axis label theming in Plan 03
- @layer base .dark block for CSS var overrides — consistent with Tailwind v4 @custom-variant dark pattern
- quip renders AFTER children in StatCard (commentary reads last, after trend indicators)
- pickSpendQuip returns null for exact zero — no quip shown for blank/zero-spend state
- spend_any catches fractional spend (0 < x < $1) to avoid gap before first dollar milestone
- StatCard dark mode tokens: border=#30363d, bg=#161b22, label text=#8b949e, value text=#e6edf3
- QUIPS satisfies Record<string, string[]> — type-safe at compile time without losing key specificity
- web/src/lib/ directory created in Phase 8 (did not exist before 08-02)
- computeP90 guards against false heatmap peaks: peak requires count >= p90 AND count >= 2
- Models donut center text uses var(--color-axis-tick) (same CSS var as chart axes) — avoids hardcoded #0f172a
- emptyMessage quip called at render time (not hoisted to module scope) — random per page load, no React state needed
- Token breakdown bar track uses #1e242c in dark mode — midpoint between card bg (#161b22) and raised surface (#21262d) for correct depth hierarchy
- Cache-read bar color changed from grey to purple in dark mode — improved contrast and visual distinction from other token types
- tsup prod config uses banner require injection (not external list) to fix dynamic require() inside CJS packages bundled with noExternal in ESM output — createRequire from node:module overrides the broken __require shim
- noArrayIndexKey rule disabled globally in biome.json — rows have no stable identity key (existing SortableTable decision); inline biome-ignore ineffective for JSX attribute-level rules in Biome 1.9.0
- dist/ is unified build output directory — web-dist/ is obsolete; dist/web/ for frontend assets, dist/server/ for server JS
- Dynamic CLI version: createRequire('../../package.json') reads version field at runtime from bundled package.json path

### Open Blockers for v1.1

- **Phase 9**: Verify `yclaude` name availability on npm before Phase 9 publish

### Pending Todos

- **Phase 9.1 (deferred)**: Cost accuracy for Pro/Max users — full spec in ROADMAP.md Phase 9.1
  section. Tldr: current "est." numbers use API pay-per-token pricing and overstate spend for
  Pro/Max subscribers. Needs investigation of JSONL fields, relabelling strategy, and
  pricing.ts refactor (extract tier constants from model-ID map).
