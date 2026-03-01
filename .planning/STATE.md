---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Analytics Completion + Distribution
status: ready
last_updated: "2026-03-01"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 13
  completed_plans: 6
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28 after v1.0 milestone)

**Core value:** Give developers full visibility into their AI coding spend — locally first, with no friction.
**Current focus:** v1.1 Phase 7 — Differentiator Features

## Current Position

Phase: 06-session-explorer ✅ COMPLETE (2026-03-01)
Plan: 06-03 ✅ COMPLETE (2026-03-01)
Status: Phase 6 complete — all 3 plans done; ready for Phase 7 (Subagent Accounting)
Last activity: 2026-03-01 — 06-03 complete; SessionDetail page with per-turn token table and cumulative cost Recharts line chart implemented

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

### Open Blockers for v1.1

- **Phase 7**: Subagent token accounting — confirm whether `isSidechain` events are additive to parent session totals or separately tracked before implementing sidechain aggregation
- **Phase 7**: `react-activity-calendar` + Tailwind v4 CSS vars — `getComputedStyle` pattern needs proof-of-concept before Phase 7 heatmap implementation
- **Phase 9**: Verify `yclaude` name availability on npm before Phase 9 publish

### Pending Todos

- **Phase 9.1 (deferred)**: Cost accuracy for Pro/Max users — full spec in ROADMAP.md Phase 9.1
  section. Tldr: current "est." numbers use API pay-per-token pricing and overstate spend for
  Pro/Max subscribers. Needs investigation of JSONL fields, relabelling strategy, and
  pricing.ts refactor (extract tier constants from model-ID map).
