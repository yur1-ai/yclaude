---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Multi-Provider Analytics
status: in-progress
stopped_at: Completed 12-01-PLAN.md (Cursor extraction pipeline)
last_updated: "2026-03-07T17:03:10Z"
last_activity: 2026-03-07 -- Completed Plan 01 (Cursor data extraction pipeline)
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 5
  completed_plans: 4
  percent: 80
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-07 after v1.2 milestone start)

**Core value:** Give developers full visibility into their AI coding spend -- locally first, with no friction.
**Current focus:** Phase 12 - Cursor Provider

## Current Position

Phase: 12 of 14 (Cursor Provider)
Plan: 1 of 2 complete
Status: In Progress
Last activity: 2026-03-07 -- Completed Plan 01 (Cursor data extraction pipeline)

Progress: [████████░░] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 8min
- Total execution time: 0.53 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 11 | 3 | 25min | 8min |
| 12 | 1 | 7min | 7min |

*Updated after each plan completion*

## Accumulated Context

### Decisions Carrying Forward

- Hash routing (`createHashRouter`) -- keep using for SPA
- API routes registered before `serveStatic` -- enforce in all future route additions
- UTC Date methods throughout bucketing -- never use local methods with ISO timestamps
- Zustand for global filters (not URL params)
- All aggregation is server-side -- frontend never receives raw `CostEvent[]` arrays
- Tier-reference pricing: 7 named const tier objects referenced by 19 model ID entries
- `--show-messages` gates all conversation content -- server-side 403 enforcement
- tsup prod config uses banner require injection for ESM/CJS compat (fragile -- revisit)
- Conditional spread pattern for optional UnifiedEvent fields (exactOptionalPropertyTypes compliance)
- EstimatedCost brand stripped in adapter; costSource tag replaces branded type
- Provider registry returns info for ALL adapters (including excluded/not-found)
- Chat endpoints filter state.events by message !== undefined instead of separate rawEvents array
- Chat responses include provider field in summary for multi-provider readiness
- Public API exports only loadProviders and types; parseAll/computeCosts are now internal
- Class-based vi.mock factories for constructor mocking in registry tests
- CLAUDE_CONFIG_DIR env var + projects/ subdirectory structure for provider integration test fixtures
- Startup banner with ANSI-colored status icons per provider (checkmark/dash/warning)
- node:sqlite DatabaseSync with readOnly:true for direct Cursor DB access, temp-copy fallback only on SQLITE_BUSY
- Zod schemas with .passthrough() for forward compatibility with future Cursor schema versions
- Cost distributed evenly across AI bubbles in a composer, raw costInCents preserved on first event
- Model name from usageData keys (prefer non-default) with modelConfig.modelName fallback
- isAgentic derived from composer head unifiedMode, not per-bubble isAgentic flag

### Pending Todos

None -- starting fresh milestone

### Blockers/Concerns

- Cursor state.vscdb format is undocumented and changes with Cursor updates (HIGH risk -- Phase 12)
- node:sqlite WAL mode compatibility with actively-running Cursor/OpenCode needs validation
- OpenCode cost field reliability unclear (session-level may be reliable, per-message often zero)

## Session Continuity

Last session: 2026-03-07T17:03:10Z
Stopped at: Completed 12-01-PLAN.md (Cursor data extraction pipeline)
Resume file: .planning/phases/12-cursor-provider/12-02-PLAN.md
