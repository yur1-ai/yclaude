---
phase: 05-model-project-breakdowns
plan: "01"
status: complete
completed: "2026-03-01"
subsystem: server/api
tags: [api, aggregation, hono, models, projects]
dependency_graph:
  requires: []
  provides: [GET /api/v1/models, GET /api/v1/projects, assignProjectNames]
  affects: [src/server/routes/api.ts]
tech_stack:
  added: []
  patterns: [Map-based aggregation, collision detection via frequency map, parseDate + filter pattern]
key_files:
  created: []
  modified:
    - src/server/routes/api.ts — added /models and /projects Hono routes, lastSegment and assignProjectNames helpers
decisions:
  - Single commit for both routes — both tasks modify same file and form one coherent unit
  - lastSegment extracted as named helper for clarity and testability
metrics:
  duration: "~10 minutes"
  completed: "2026-03-01"
  tasks: 2
  files_modified: 1
---

# Phase 05 Plan 01: Model and Project Breakdown API Routes

## One-liner

Server-side aggregation routes grouping CostEvents by model and by project cwd, with collision-safe display name resolution.

## What Was Built

Two new Hono GET routes added to `src/server/routes/api.ts`:

**GET /api/v1/models** — aggregates `state.costs` (CostEvent[]) by model name. Events with undefined model are grouped as `'Unknown'`. Accumulates `costUsd`, `eventCount`, and all four token sub-types (input, output, cacheCreation, cacheRead) with safe `?? 0` guards. Rows are sorted by `costUsd` descending. Supports `?from=ISO` and `?to=ISO` date filtering with 400 on invalid params.

**GET /api/v1/projects** — aggregates by `cwd` (nullable). Events with undefined cwd are grouped as `"Unknown project"` with `cwd: null`. Before emitting the response, calls `assignProjectNames()` which builds a frequency map of last path segments across all unique cwds — any two distinct cwds that share the same last segment both display as `"parent/name"` format. Rows sorted by `costUsd` descending, same date filtering.

Two helper functions added above `apiRoutes`:
- `lastSegment(cwd)` — extracts the last non-empty path segment
- `assignProjectNames(cwds)` — returns a `Map<string|null, string>` with collision-resolved display names

## Key Files

### Created

None.

### Modified

- `src/server/routes/api.ts` — added `lastSegment`, `assignProjectNames` helper functions and two new routes: `app.get('/models', ...)` and `app.get('/projects', ...)`

## Commits

| Hash    | Description                                                    |
| ------- | -------------------------------------------------------------- |
| 1fde848 | feat(05-01): add GET /api/v1/models and /api/v1/projects aggregation routes |

## Self-Check: PASSED

- GET /api/v1/models route exists in `src/server/routes/api.ts` at line 177
- GET /api/v1/projects route exists at line 229 with `assignProjectNames` helper at line 28
- TypeScript compiles without errors (`npx tsc --noEmit` — clean output)
- SUMMARY.md created in `.planning/phases/05-model-project-breakdowns/`
- Changes committed atomically (commit 1fde848)

## Decisions Made

- Both tasks (models + projects) committed in a single atomic commit since they modify the same file and helper functions are shared context.
- `assignProjectNames` takes `(string | null)[]` so the null-cwd case is handled uniformly inside the helper rather than at the call site.
- `names.get(cwd) ?? 'Unknown project'` fallback in the row mapper is defensive only — the helper always sets a value for every input cwd including null.

## Deviations from Plan

None — plan executed exactly as written. Both aggregation loops, helper implementations, and response shapes match the plan's specified code verbatim.

## Issues Encountered

None. TypeScript compilation passed on first attempt.
