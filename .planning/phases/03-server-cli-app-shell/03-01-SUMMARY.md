---
phase: 03-server-cli-app-shell
plan: "01"
subsystem: api
tags: [hono, commander, node-server, csp, secure-headers, tdd]

# Dependency graph
requires:
  - phase: 02-cost-engine-privacy
    provides: computeCosts, applyPrivacyFilter, CostEvent, EstimatedCost
  - phase: 01-jsonl-parser-data-pipeline
    provides: parseAll, NormalizedEvent, ParseOptions

provides:
  - Hono app factory (createApp) with CSP middleware blocking all external requests
  - GET /api/v1/summary endpoint aggregating totalCost, totalTokens, eventCount
  - CLI binary (yclaude) with --dir, --port, --no-open flag parsing, 127.0.0.1 binding
  - Stub routes /api/v1/events and /api/v1/sessions for Phase 4+ without breaking changes

affects:
  - 03-02 (Vite SPA shell — registers serveStatic after API routes in server.ts)
  - 03-03 (Integration — CLI startup, browser open, full build pipeline)
  - 04-dashboard-api (all API routes mount on createApp's /api/v1 sub-router)

# Tech tracking
tech-stack:
  added:
    - hono ^4.12.3 (web framework with built-in test helper and secure-headers middleware)
    - "@hono/node-server ^1.19.9 (Node.js adapter for serve() with hostname binding)"
    - commander ^14.0.3 (CLI flag parsing with --no-open negation pattern)
    - open ^11.0.0 (cross-platform browser launcher)
  patterns:
    - TDD red-green-refactor for server/API layer
    - AppState pattern (pre-loaded events + costs passed to factory, not fetched on-demand)
    - API routes registered before serveStatic to prevent static catch-all blocking API
    - exactOptionalPropertyTypes-safe optional prop passing (conditional spread vs undefined)

key-files:
  created:
    - src/server/server.ts
    - src/server/routes/api.ts
    - src/server/cli.ts
    - src/server/__tests__/server.test.ts
    - src/server/__tests__/api.test.ts
    - src/server/__tests__/cli.test.ts
  modified:
    - package.json (bin, dependencies)
    - tsup.config.ts (CLI entry, dts scoped to library only)

key-decisions:
  - "secureHeaders CSP: default-src 'none', connect-src 'self' — all external domains blocked at browser level"
  - "127.0.0.1 binding enforced in serve() hostname option, not separately configurable"
  - "API routes registered before serveStatic (pitfall: static catch-all would block API if first)"
  - "dts: { entry: ['src/index.ts'] } — scopes .d.ts output to library only, avoids shebang-in-dts error"
  - "exactOptionalPropertyTypes: pass opts.dir conditionally (opts.dir !== undefined ? {dir} : {})"
  - "cli.test.ts uses standalone Commander instance, not importing cli.ts (side effects via parse())"
  - "toEstimatedCost imported from cost/types.ts (internal constructor, not re-exported from index)"

patterns-established:
  - "AppState pattern: all data pre-loaded at startup, passed to factory — no on-demand fetching"
  - "Stub routes with empty shapes enable Phase 4+ without breaking changes"
  - "Commander --no-open: declare only the negative form to get opts.open=true by default"

requirements-completed: [CLI-01, CLI-02, CORE-04]

# Metrics
duration: 5min
completed: 2026-02-28
---

# Phase 3 Plan 01: Hono Server Factory + CLI Entry + /api/v1/summary Summary

**Hono server factory with CSP-enforced security posture, loopback-only binding, Commander CLI with flag parsing, and /api/v1/summary aggregation — full TDD red-green cycle, 102 tests passing**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-28T15:30:43Z
- **Completed:** 2026-02-28T15:33:40Z
- **Tasks:** 3 (TDD: RED + GREEN + verify)
- **Files modified:** 8

## Accomplishments

- Hono app factory (`createApp`) with `secureHeaders` CSP middleware: `default-src 'none'`, `connect-src 'self'`, no external domains
- GET /api/v1/summary route aggregating totalCost (sum of costUsd), totalTokens (input/output/cacheCreation/cacheRead), eventCount across all CostEvents
- CLI binary (`yclaude`) parsing `--dir`, `--port`, `--no-open` flags; binds server exclusively to 127.0.0.1
- Stub routes for /api/v1/events and /api/v1/sessions to enable Phase 4+ without API breaks
- 17 new tests across 3 test files; full suite remains green (102 tests, 13 files)

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — Failing tests** - `de6edaf` (test)
2. **Task 2: GREEN — Implementation** - `bc83a86` (feat)
3. **Task 3: Verify + typecheck fixes** - `45d6896` (refactor)

_Note: TDD tasks have three commits: test (RED) → feat (GREEN) → refactor (typecheck fixes)_

## Files Created/Modified

- `src/server/server.ts` - createApp factory with CSP secureHeaders middleware, route ordering
- `src/server/routes/api.ts` - GET /api/v1/summary aggregation + stub routes
- `src/server/cli.ts` - Shebang, Commander option parsing, 127.0.0.1 serve(), browser open
- `src/server/__tests__/server.test.ts` - 7 tests: Hono instance, CSP headers, route registration
- `src/server/__tests__/api.test.ts` - 4 tests: summary aggregation (empty, totalCost, eventCount, totalTokens)
- `src/server/__tests__/cli.test.ts` - 6 tests: Commander option parsing isolation
- `package.json` - Added hono, @hono/node-server, commander, open; bin -> ./dist/server/cli.js
- `tsup.config.ts` - Added src/server/cli.ts to entry; dts scoped to src/index.ts only

## Decisions Made

- Used `dts: { entry: ['src/index.ts'] }` not `dts: true` to avoid shebang-in-dts TypeScript error (Research Pitfall 6)
- API routes registered before serveStatic placeholder to prevent static catch-all blocking API (Research Pitfall 4)
- Commander `--no-open` declared as negative form only — creates `opts.open=true` by default, `false` when passed (Research Pitfall 3)
- CLI test uses standalone Commander instance, not importing `cli.ts` directly (side effects from `program.parse()`)
- `toEstimatedCost` imported from `cost/types.ts` (not from `cost/engine.ts` which doesn't export it)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript exactOptionalPropertyTypes errors**
- **Found during:** Task 3 (typecheck)
- **Issue:** `opts.dir` typed as `string | undefined` not assignable to `ParseOptions.dir?: string` under `exactOptionalPropertyTypes: true`; `res.json()` typed as `unknown` requiring assertion for property access
- **Fix:** Conditional pass `opts.dir !== undefined ? { dir: opts.dir } : {}` in cli.ts; added `SummaryBody` type with `as SummaryBody` casts in api.test.ts
- **Files modified:** `src/server/cli.ts`, `src/server/__tests__/api.test.ts`
- **Verification:** `npm run typecheck` exits 0 with no errors; `npm test` still passes 102 tests
- **Committed in:** `45d6896` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type correctness)
**Impact on plan:** Fix required for correct TypeScript compilation under strict settings already established by prior phases. No scope creep.

## Issues Encountered

None beyond the auto-fixed typecheck issues above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Server and CLI foundation complete — Phase 3 Plan 02 (Vite SPA shell) can now register serveStatic after the API routes already in place
- The `TODO(03-03)` comment in server.ts marks the exact location for static middleware registration
- All CSP security posture is inherited by all future phases automatically via `createApp`
- Stub routes /api/v1/events and /api/v1/sessions provide landing points for Phase 4 dashboard API work

---
*Phase: 03-server-cli-app-shell*
*Completed: 2026-02-28*

## Self-Check: PASSED

All created files exist on disk. All task commits verified in git log.
- `de6edaf` test(03-01): RED tests - FOUND
- `bc83a86` feat(03-01): GREEN implementation - FOUND
- `45d6896` refactor(03-01): typecheck fixes - FOUND
