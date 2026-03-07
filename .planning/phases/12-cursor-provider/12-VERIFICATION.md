---
phase: 12-cursor-provider
verified: 2026-03-07T15:27:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 12: Cursor Provider Verification Report

**Phase Goal:** Users with Cursor installed can see full session analytics, cost data, and agent mode breakdown from their local state.vscdb
**Verified:** 2026-03-07T15:27:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

Truths combined from Plan 01 (9 truths) and Plan 02 (4 adapter truths, excluding regression/human-verify truths that are covered by test suite run).

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Cursor workspace storage directories are discovered with correct platform paths for macOS and Linux | VERIFIED | `paths.ts:18-33` returns correct dirs for darwin/linux, empty for win32. 7 passing path tests. |
| 2 | state.vscdb is opened read-only with SQLITE_BUSY fallback to temp copy | VERIFIED | `db.ts:38-51` opens with `readOnly: true`, catches BUSY and calls `openFromTempCopy`. 9 DB tests pass. |
| 3 | Composer heads are read from workspace DBs with workspace path correlation | VERIFIED | `parser.ts:46-81` reads workspace DBs, parses `composer.composerData`, enriches with `workspacePath`. |
| 4 | Bubbles are read from global DB and joined to composers by composerId | VERIFIED | `parser.ts:126` reads `bubbleId:<composerId>:` prefix entries from `cursorDiskKV`. Two-database join working. |
| 5 | v2 and v3 bubble timestamps are unified into ISO strings | VERIFIED | `parser.ts:253-268` checks `createdAt` (v3 ISO), then `timingInfo.clientRpcSendTime` (v2 epoch ms -> ISO), with fallback chain. Parser tests cover both. |
| 6 | costInCents is extracted from usageData and converted to costUsd | VERIFIED | `parser.ts:273-293` sums `costInCents` across usage entries, `parser.ts:160-162` converts to USD. Cost tests pass. |
| 7 | isAgentic is derived from composer unifiedMode | VERIFIED | `parser.ts:165-166` checks `head.unifiedMode ?? composerData?.unifiedMode === 'agent'`. Agent mode tests pass for agent/chat/edit modes. |
| 8 | Empty composers (zero bubbles) are excluded | VERIFIED | `parser.ts:143-147` returns `[]` for zero bubbles, `parser.ts:152-156` returns `[]` for zero AI bubbles. Tested. |
| 9 | Corrupt JSON produces parse-error markers, not crashes | VERIFIED | `parser.ts:57-61` catches corrupt workspace JSON, `parser.ts:120-122` catches corrupt composer JSON, `parser.ts:137-140` catches corrupt bubble JSON. All wrapped in try/catch with debugLog. Tests verify no crashes on corrupt data. |
| 10 | CursorAdapter.detect() returns true when Cursor state.vscdb exists on the system | VERIFIED | `adapter.ts:28-47` iterates data dirs, checks global DB via `fs.access()`. 3 adapter detect tests pass. |
| 11 | CursorAdapter.load() returns UnifiedEvent[] from all detected workspaces | VERIFIED | `adapter.ts:53-90` discovers workspaces, calls `parseCursorData`. 12 adapter integration tests pass including full round-trip. |
| 12 | Schema version is logged to stderr for startup banner display | VERIFIED | `adapter.ts:147-153` writes `[yclaude] Cursor: schema v${version}` to stderr. Visible in test output. |
| 13 | All existing tests still pass (zero regression) | VERIFIED | 249/249 tests pass across 21 test files. Full suite run confirmed. |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/providers/cursor/types.ts` | Internal Cursor types (min 40 lines) | VERIFIED | 105 lines. Exports ComposerHead, ComposerFullData, RawBubble, ParsedSession, ParseError, SchemaVersion. |
| `src/providers/cursor/schema.ts` | Zod schemas with safeParse wrappers (min 40 lines) | VERIFIED | 135 lines. BubbleSchema, ComposerFullDataSchema, ComposerHeadSchema all with `.passthrough()`. Three safeParse wrappers exported. |
| `src/providers/cursor/paths.ts` | Platform path resolution | VERIFIED | 49 lines. Exports getCursorDataDirs, getGlobalDbPath, getWorkspaceStoragePath. Pure functions. |
| `src/providers/cursor/db.ts` | SQLite access with read-only + BUSY fallback | VERIFIED | 178 lines. Exports openCursorDb, readKvEntry, readKvEntries, detectSchemaVersion, closeCursorDb. Table allowlist validation. |
| `src/providers/cursor/parser.ts` | Composer/bubble parsing into UnifiedEvent[] | VERIFIED | 318 lines. Exports parseCursorData. Internal helpers: getBubbleTimestamp, extractCostFromComposer, deriveModel. |
| `src/providers/cursor/__tests__/fixtures.ts` | Synthetic SQLite fixture factory | VERIFIED | 147 lines. Exports createTestDir, createTestWorkspaceDb, createTestGlobalDb, sampleComposerHead, sampleBubble, sampleComposerFullData, cleanupTestDir. |
| `src/providers/cursor/__tests__/parser.test.ts` | Parser unit tests (min 100 lines) | VERIFIED | 869 lines. 27 tests covering sessions, costs, agent mode, resilience, content. |
| `src/providers/cursor/adapter.ts` | CursorAdapter implementing ProviderAdapter (min 60 lines) | VERIFIED | 212 lines. Exports CursorAdapter with detect() and load(). Workspace discovery, multi-root support, URI decoding. |
| `src/providers/cursor/__tests__/adapter.test.ts` | Integration tests for adapter (min 80 lines) | VERIFIED | 417 lines. 12 integration tests with synthetic fixtures. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `parser.ts` | `db.ts` | openCursorDb, readKvEntry, readKvEntries | WIRED | Imported at line 12, used at lines 35, 48, 49, 110, 126. Both import and active use confirmed. |
| `parser.ts` | `schema.ts` | safeParse for bubble/composer validation | WIRED | Imported at line 13, safeParseBubble at 132, safeParseComposerData at 114, safeParseComposerHead at 65. |
| `parser.ts` | `types.ts` | produces UnifiedEvent[] | WIRED | Imported at line 10, used as return type and in event construction at lines 31, 33, 105, 186, 222. |
| `adapter.ts` | `paths.ts` | getCursorDataDirs, getGlobalDbPath, getWorkspaceStoragePath | WIRED | Imported at line 13, used at lines 30, 33, 58, 63, 96, 97. |
| `adapter.ts` | `parser.ts` | parseCursorData | WIRED | Imported at line 15, called at line 161. |
| `adapter.ts` | `db.ts` | openCursorDb, detectSchemaVersion | WIRED | Imported at line 14, used at lines 149-150. |
| `registry.ts` | `adapter.ts` | CursorAdapter in KNOWN_ADAPTERS | WIRED | Imported at line 2, instantiated at line 12 as `new CursorAdapter()`. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| CURS-01 | 12-01, 12-02 | User can view Cursor session list with tokens, models, timestamps, and duration parsed from state.vscdb | SATISFIED | Parser extracts sessions from two-database architecture; adapter wires to registry. 27 parser tests + 12 adapter tests cover tokens, models, timestamps, duration. v2/v3 timestamps unified. Schema version detection working. |
| CURS-02 | 12-01, 12-02 | User can view accurate Cursor cost data from usageData.costInCents | SATISFIED | `extractCostFromComposer` sums costInCents, converts to USD, distributes across AI bubbles. costSource='reported'. Note: recent Cursor versions have empty usageData (accepted data limitation). 5 cost-specific tests pass. |
| CURS-03 | 12-01, 12-02 | User can see Cursor agent mode vs manual mode analytics | SATISFIED | `isAgentic` derived from `unifiedMode === 'agent'`. Chat, edit, debug modes correctly set `isAgentic=false`. Edit-mode composers included (not filtered). 4 agent-mode-specific tests pass. |

No orphaned requirements. All 3 CURS requirements mapped to Phase 12 in REQUIREMENTS.md are claimed by plans and implemented.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | - |

No TODOs, FIXMEs, placeholders, console.logs, or stub implementations found. All `return null`/`return []` instances are legitimate defensive returns for "not found" or "no data" edge cases.

### Human Verification Required

### 1. Dashboard Visual Display with Real Cursor Data

**Test:** Run `npx yclaude --debug` on a machine with Cursor installed. Verify sessions appear in the dashboard with session list, timestamps, model names, token counts, and duration.
**Expected:** Cursor sessions listed alongside Claude sessions (if both providers present). Schema version banner appears in stderr output.
**Why human:** Visual rendering and real Cursor data layout cannot be verified programmatically. Synthetic fixtures confirm parser correctness but not dashboard display integration.

### 2. Cost Data Display Accuracy

**Test:** Inspect Cursor sessions in dashboard for cost data display.
**Expected:** Cost shows as $0.00 with "reported" source label (known data limitation with recent Cursor versions where usageData is empty). If older Cursor data exists, costs should display as non-zero.
**Why human:** Cost display formatting and "reported" vs "estimated" labeling is a UI concern.

### 3. Agent Mode Breakdown

**Test:** Check that agent-mode and non-agent sessions are visually distinguishable in the dashboard.
**Expected:** Sessions with `isAgentic=true` (agent mode) vs `isAgentic=false` (chat/edit mode) are filterable or visually labeled.
**Why human:** Agent mode segmentation at the UI level depends on dashboard rendering logic outside this phase's scope.

### Gaps Summary

No gaps found. All 13 observable truths verified against the actual codebase. All 9 artifacts exist, are substantive (well above minimum line counts), and are fully wired. All 7 key links confirmed with both import and active usage. All 3 requirements (CURS-01, CURS-02, CURS-03) satisfied. Full test suite of 249 tests passes with zero regressions. TypeScript compiles cleanly. Production build succeeds.

The phase goal -- "Users with Cursor installed can see full session analytics, cost data, and agent mode breakdown from their local state.vscdb" -- is achieved at the data extraction and provider integration level. Human verification items relate to visual dashboard rendering which depends on downstream phases.

---

_Verified: 2026-03-07T15:27:00Z_
_Verifier: Claude (gsd-verifier)_
