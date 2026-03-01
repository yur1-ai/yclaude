---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Analytics Completion + Distribution
status: ready
last_updated: "2026-03-01"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 13
  completed_plans: 2
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28 after v1.0 milestone)

**Core value:** Give developers full visibility into their AI coding spend — locally first, with no friction.
**Current focus:** v1.1 Phase 5 — Model & Project Breakdowns

## Current Position

Phase: 05-model-project-breakdowns (Wave 1 complete)
Plan: 05-02 complete — SortableTable component + donut CSS vars
Status: Executing — Wave 1 done (05-01 API routes, 05-02 shared components); Wave 2 (05-03 Models + Projects pages) ready
Last activity: 2026-03-01 — Completed 05-02 (SortableTable<T> generic component, 6 donut CSS vars)

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

### Open Blockers for v1.1

- **Phase 7**: Subagent token accounting — confirm whether `isSidechain` events are additive to parent session totals or separately tracked before implementing sidechain aggregation
- **Phase 7**: `react-activity-calendar` + Tailwind v4 CSS vars — `getComputedStyle` pattern needs proof-of-concept before Phase 7 heatmap implementation
- **Phase 9**: Verify `yclaude` name availability on npm before Phase 9 publish

### Pending Todos

(none — pre-v1.1 cleanups complete)
