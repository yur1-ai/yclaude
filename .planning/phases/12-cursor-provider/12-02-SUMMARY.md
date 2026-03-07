---
phase: 12-cursor-provider
plan: 02
subsystem: providers
tags: [cursor, adapter, provider-adapter, integration, state-vscdb, workspace-discovery]

# Dependency graph
requires:
  - phase: 12-cursor-provider/plan-01
    provides: Cursor types, Zod schemas, platform paths, SQLite DB access, parser pipeline
  - phase: 11-provider-abstraction
    provides: ProviderAdapter interface, provider registry, UnifiedEvent type
provides:
  - Complete CursorAdapter implementing ProviderAdapter interface (detect + load)
  - Workspace discovery with workspace.json and multi-root workspace support
  - Schema version logging to stderr for startup banner
  - End-to-end Cursor provider: installed Cursor -> UnifiedEvent[] in dashboard
affects: [13-multi-provider-api, provider-registry, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [workspace discovery with directory scanning, file URI decoding, vscode-remote URI filtering]

key-files:
  created:
    - src/providers/cursor/__tests__/adapter.test.ts
    - tsup.config.prod.ts
  modified:
    - src/providers/cursor/adapter.ts
    - src/providers/cursor/parser.ts
    - src/providers/cursor/__tests__/parser.test.ts
    - src/providers/claude/__tests__/index.test.ts
    - tsup.config.ts

key-decisions:
  - "Constructor-injected testDataDirs for deterministic adapter tests without mocking os.homedir"
  - "Multi-root workspace support: read .code-workspace files to resolve workspace paths from workspace.json entries"
  - "vscode-remote:// URIs gracefully skipped as non-file URIs (remote SSH workspaces have no local cwd)"
  - "Zero-token bubbles (v3 tokenCount {inputTokens:0, outputTokens:0}) treated as undefined to avoid false 0-token display"
  - "Cursor cost $0.00 is a data limitation (usageData is empty in recent versions) -- not fixable at parser level"
  - "tsup prod config with banner injection to preserve node:sqlite import in ESM build output"

patterns-established:
  - "Adapter integration tests using synthetic SQLite fixtures with constructor-injected data dirs"
  - "tsup.config.prod.ts for production builds with node:sqlite banner injection workaround"

requirements-completed: [CURS-01, CURS-02, CURS-03]

# Metrics
duration: 15min
completed: 2026-03-07
---

# Phase 12 Plan 02: CursorAdapter Integration Summary

**Full CursorAdapter wiring: workspace discovery, multi-root support, schema banner logging, and end-to-end verification with 249 passing tests across 21 test files**

## Performance

- **Duration:** ~15 min (across sessions with human verification checkpoint)
- **Started:** 2026-03-07T17:07:38Z
- **Completed:** 2026-03-07T20:22:24Z
- **Tasks:** 2 (1 TDD implementation + 1 verification checkpoint)
- **Files modified:** 7

## Accomplishments
- CursorAdapter fully implements ProviderAdapter interface with detect() and load() methods
- 12 adapter integration tests covering detection, loading, content gating, error handling, and full round-trip
- Workspace discovery handles standard, multi-root (.code-workspace), and remote URI workspaces
- Data quality fixes for zero-token v3 bubbles, remote URI filtering, and multi-root workspace path resolution
- All 249 tests pass across 21 test files with zero regressions from v1.1 baseline

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement CursorAdapter and integration tests (TDD)**
   - RED: `12444b2` (test) - 12 failing adapter integration tests
   - GREEN: `82166e0` (feat) - full CursorAdapter implementation
   - FIX: `449f096` (fix) - tsup build preserving node:sqlite import
   - FIX: `4691515` (fix) - data quality: zero-token, multi-root workspace, remote URI handling

2. **Task 2: Verify Cursor provider end-to-end** - checkpoint (human-verify)
   - User smoke-tested dashboard, identified data quality issues
   - Issues fixed in commit `4691515` before approval
   - Final verification: 249 tests pass, tsc clean, build succeeds

## Files Created/Modified
- `src/providers/cursor/adapter.ts` - Full CursorAdapter: detect(), load(), workspace discovery, schema banner
- `src/providers/cursor/__tests__/adapter.test.ts` - 12 integration tests with synthetic SQLite fixtures
- `src/providers/cursor/parser.ts` - Zero-token v3 bubble fix (treat {inputTokens:0, outputTokens:0} as undefined)
- `src/providers/cursor/__tests__/parser.test.ts` - Added tests for zero-token bubble handling
- `src/providers/claude/__tests__/index.test.ts` - Updated to work with CursorAdapter in registry
- `tsup.config.ts` - Added node:sqlite banner injection for dev builds
- `tsup.config.prod.ts` - New prod build config with node:sqlite ESM compatibility

## Decisions Made
- Constructor-injected `testDataDirs` parameter for adapter tests instead of mocking `os.homedir()` -- simpler, more deterministic
- Multi-root workspace support: when workspace.json has `workspace` key (not `folder`), read the .code-workspace file for folder list
- vscode-remote:// URIs gracefully skipped rather than erroring -- remote SSH workspaces have no local project directory
- Zero-token bubbles in v3 format reported as undefined tokens (not 0) to avoid misleading "0 in, 0 out" display
- Cursor cost showing $0.00 accepted as a data limitation -- usageData is empty `{}` in recent Cursor versions
- Separate tsup.config.prod.ts created for production builds to handle node:sqlite ESM banner injection

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tsup build stripping node:sqlite import**
- **Found during:** Task 1 (GREEN phase, build verification)
- **Issue:** tsup was replacing `require("node:sqlite")` with an invalid reference, breaking the production build
- **Fix:** Created tsup.config.prod.ts with banner injection to prepend `const require = ...` for ESM/CJS compat
- **Files modified:** tsup.config.ts, tsup.config.prod.ts
- **Verification:** `npm run build` succeeds
- **Committed in:** `449f096`

**2. [Rule 1 - Bug] v3 bubbles reporting zero tokens**
- **Found during:** Task 2 (human verification checkpoint)
- **Issue:** v3 bubbles have tokenCount `{inputTokens: 0, outputTokens: 0}` when no real data exists, parser was using these zeros literally
- **Fix:** Parser now checks if both input and output tokens are 0 and treats as undefined
- **Files modified:** src/providers/cursor/parser.ts, src/providers/cursor/__tests__/parser.test.ts
- **Verification:** Dashboard no longer shows "0 in, 0 out" for sessions
- **Committed in:** `4691515`

**3. [Rule 1 - Bug] Multi-root workspace paths not resolving**
- **Found during:** Task 2 (human verification checkpoint)
- **Issue:** workspace.json entries with `workspace` key (multi-root workspaces) returned undefined path instead of reading the .code-workspace file
- **Fix:** Adapter now reads .code-workspace files to extract folder paths for multi-root workspaces
- **Files modified:** src/providers/cursor/adapter.ts
- **Verification:** Projects no longer show "Unknown project" for multi-root workspaces
- **Committed in:** `4691515`

**4. [Rule 1 - Bug] vscode-remote:// URIs causing invalid cwd**
- **Found during:** Task 2 (human verification checkpoint)
- **Issue:** Remote SSH workspace URIs were being decoded as file paths, producing invalid cwd values
- **Fix:** Adapter now checks URI scheme and skips non-file:// URIs gracefully
- **Files modified:** src/providers/cursor/adapter.ts
- **Verification:** Remote workspaces no longer produce invalid paths
- **Committed in:** `4691515`

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. Data quality issues discovered during human verification checkpoint -- exactly as the plan intended. No scope creep.

## Issues Encountered
- Cursor cost data showing $0.00 is a genuine Cursor data limitation (usageData is `{}` in recent versions). This cannot be fixed at the parser level and was accepted by the user. Future Cursor updates may populate this field again.
- Claude adapter test needed updates to accommodate CursorAdapter appearing in registry alongside Claude adapter -- minor test adjustment.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Cursor provider complete: detect + load + parse + display working end-to-end
- Phase 12 fully done: both Plan 01 (extraction pipeline) and Plan 02 (adapter integration) complete
- Ready for Phase 13: Multi-Provider API & Dashboard (provider-tabbed navigation, API filtering)
- Two working providers (Claude Code + Cursor) available for Phase 13 multi-provider testing

## Self-Check: PASSED

- All 7 files verified present on disk
- All 4 commits verified in git log (12444b2, 82166e0, 449f096, 4691515)
- 249/249 tests passing across 21 test files
- 0 TypeScript errors

---
*Phase: 12-cursor-provider*
*Completed: 2026-03-07*
