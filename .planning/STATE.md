---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Multi-Provider Analytics
status: defining_requirements
last_updated: "2026-03-07"
last_activity: 2026-03-07 — Milestone v1.2 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-07 after v1.2 milestone start)

**Core value:** Give developers full visibility into their AI coding spend — locally first, with no friction.
**Current focus:** Defining requirements for multi-provider support (Cursor, OpenCode, Ollama)

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-07 — Milestone v1.2 started

## Accumulated Context

### Decisions Carrying Forward

- Hash routing (`createHashRouter`) — keep using for SPA; no server catch-all needed
- API routes registered before `serveStatic` — enforce in all future route additions
- `webDistPath` via `fileURLToPath(new URL(..., import.meta.url))` — required for npx correctness
- UTC Date methods throughout bucketing — never use local methods with ISO timestamps
- Zustand for global filters (not URL params) — revisit only if shareable links requested
- All aggregation is server-side — frontend never receives raw `CostEvent[]` arrays
- Tier-reference pricing: 7 named const tier objects referenced by 19 model ID entries
- `--show-messages` gates all conversation content — server-side 403 enforcement
- tsup prod config uses banner require injection for ESM/CJS compat (fragile — revisit)
- dist/ is unified build output directory — dist/web/ for frontend, dist/server/ for server JS

### Open Blockers

None

### Pending Todos

None — starting fresh milestone
