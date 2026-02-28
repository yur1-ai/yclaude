---
phase: 01-jsonl-parser-data-pipeline
plan: 02
subsystem: api
tags: [typescript, jsonl, parser, dedup, nodejs22, glob, readline]

# Dependency graph
requires:
  - 01-01 (project scaffold, NormalizedEvent type, Zod schemas)
provides:
  - debug.ts: global debug flag singleton (enableDebug/disableDebug/isDebugEnabled/debugLog)
  - reader.ts: discoverJSONLFiles() with three-level override hierarchy + streamJSONLFile() async generator
  - normalizer.ts: raw JSONL event -> NormalizedEvent transformation
  - dedup.ts: DedupAccumulator UUID deduplication with insertion-order preservation
  - index.ts: parseAll() public API wiring all five modules together
affects:
  - 01-jsonl-parser-data-pipeline (plan 03 integration tests)
  - 02-cost-engine (consumes parseAll() and NormalizedEvent)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Native Node 22 fs/promises glob() for file discovery — zero third-party deps"
    - "readline createInterface with crlfDelay: Infinity for cross-platform JSONL streaming"
    - "Three-level override hierarchy: overrideDir > CLAUDE_CONFIG_DIR > defaults (mirrors Claude Code behavior)"
    - "DedupAccumulator Map-based streaming dedup — insertion order preserved, O(1) lookup"
    - "Unknown field passthrough in normalizer via extractUnknownFields() — future-proof for new Claude Code versions"

key-files:
  created:
    - src/shared/debug.ts
    - src/parser/reader.ts
    - src/parser/normalizer.ts
    - src/parser/dedup.ts
    - src/index.ts
    - src/parser/__tests__/debug.test.ts
    - src/parser/__tests__/reader.test.ts
    - src/parser/__tests__/normalizer.test.ts
    - src/parser/__tests__/dedup.test.ts
    - src/parser/__tests__/index.test.ts
  modified: []

key-decisions:
  - "CLAUDE_CONFIG_DIR is an exclusive override (not appended to defaults) — mirrors Claude Code's own behavior"
  - "overrideDir (--dir flag) overrides both defaults AND CLAUDE_CONFIG_DIR — highest priority"
  - "cwd field is ground truth for project path; slug decoding intentionally omitted (broken for dirs with dashes)"
  - "streamJSONLFile() never throws on malformed lines — skips with debugLog, always completes normally"
  - "DedupAccumulator first-seen wins; Map preserves insertion order for deterministic output"

patterns-established:
  - "TDD: test RED -> feat GREEN -> fix TS errors as auto-deviations within same cycle"
  - "noUncheckedIndexedAccess requires ?. optional chaining on array index access in tests"

requirements-completed: [CORE-01]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 1 Plan 2: Parser Modules Implementation Summary

**Five parser modules implementing complete JSONL pipeline: debug singleton, native Node 22 file discovery, line-by-line JSONL streaming, raw-to-NormalizedEvent normalization, and UUID deduplication wired into a public parseAll() API**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T07:18:23Z
- **Completed:** 2026-02-28T07:21:42Z
- **Tasks:** 2 (each with TDD RED + GREEN commits)
- **Files created:** 10 (5 implementation + 5 test)

## Accomplishments

- debug.ts singleton with process.argv/env initialization and stderr-only output when enabled
- reader.ts uses native `node:fs/promises` `glob()` (Node 22 built-in) — no third-party glob library needed
- discoverJSONLFiles() implements three-level exclusivity: `overrideDir > CLAUDE_CONFIG_DIR > defaults`, silently skips missing directories
- streamJSONLFile() readline-based async generator handles blank lines, malformed JSON, and Windows CRLF without throwing
- normalizer.ts extracts all six token fields from assistant events; uses `cwd` (not `slug`) for project path
- DedupAccumulator uses Map for O(1) dedup with insertion-order preservation via Map iteration
- parseAll() single entry point tested end-to-end with real temp files
- 51 tests passing across 6 test files; `tsc --noEmit` exits 0; `npm run build` produces dist/index.js

## Task Commits

Each TDD cycle committed in two phases:

1. **Task 1 RED: Failing tests for debug + reader** - `62e5bef` (test)
2. **Task 1 GREEN: Implement debug module and JSONL reader** - `8ccd310` (feat)
3. **Task 2 RED: Failing tests for normalizer, dedup, parseAll** - `0fb7946` (test)
4. **Task 2 GREEN: Implement normalizer, dedup, public API** - `8d83e30` (feat)

## Files Created

- `/Users/ishevtsov/ai-projects/yclaude/src/shared/debug.ts` - Global debug flag singleton
- `/Users/ishevtsov/ai-projects/yclaude/src/parser/reader.ts` - File discovery + JSONL streaming
- `/Users/ishevtsov/ai-projects/yclaude/src/parser/normalizer.ts` - Raw event normalization
- `/Users/ishevtsov/ai-projects/yclaude/src/parser/dedup.ts` - UUID deduplication accumulator
- `/Users/ishevtsov/ai-projects/yclaude/src/index.ts` - Public parseAll() API entry point
- `/Users/ishevtsov/ai-projects/yclaude/src/parser/__tests__/debug.test.ts` - 6 tests
- `/Users/ishevtsov/ai-projects/yclaude/src/parser/__tests__/reader.test.ts` - 10 tests
- `/Users/ishevtsov/ai-projects/yclaude/src/parser/__tests__/normalizer.test.ts` - 11 tests
- `/Users/ishevtsov/ai-projects/yclaude/src/parser/__tests__/dedup.test.ts` - 6 tests
- `/Users/ishevtsov/ai-projects/yclaude/src/parser/__tests__/index.test.ts` - 5 tests (integration)

## Decisions Made

- Used native `node:fs/promises` `glob()` instead of any third-party library — Node 22 built-in handles `**` recursion including subagent paths
- `CLAUDE_CONFIG_DIR` is exclusive override matching Claude Code's own behavior (not appended to defaults)
- `cwd` field used for project path — slug decoding intentionally NOT implemented (slugs break for directory names with dashes like `ai-projects`)
- DedupAccumulator Map-based approach chosen over Set + array for O(1) lookup with guaranteed insertion order

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript strict array indexing in test files**
- **Found during:** Task 1 and Task 2 GREEN phase (TypeScript verification)
- **Issue:** `tsc --noEmit` reported `Object is possibly 'undefined'` for array index access (`spy.mock.calls[0][0]`, `results[0].uuid`, `events[0].uuid`). TypeScript's `noUncheckedIndexedAccess` (implied by strict + NodeNext) requires optional chaining.
- **Fix:** Changed direct array indexing to optional chaining (`results[0]?.uuid`, `events[0]?.uuid`, `firstCall?.[0]`)
- **Files modified:** `src/parser/__tests__/debug.test.ts`, `src/parser/__tests__/dedup.test.ts`, `src/parser/__tests__/index.test.ts`
- **Commit:** Included in feat commits (8ccd310 and 8d83e30)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: TypeScript strict mode array indexing). No architectural deviations.

## Issues Encountered

- TypeScript's strict mode (via NodeNext) enforces `noUncheckedIndexedAccess` which requires optional chaining for array index access in tests. Fixed inline without changing implementation files.

## User Setup Required

None.

## Next Phase Readiness

- Plan 03 (integration tests) can now test against real JSONL corpus using discoverJSONLFiles() with default paths
- Phase 2 (Cost Engine) can import `parseAll` and `NormalizedEvent` from `dist/index.js`
- All five parser modules export their documented interfaces; dist/index.d.ts provides full type declarations

## Self-Check: PASSED

- FOUND: src/shared/debug.ts
- FOUND: src/parser/reader.ts
- FOUND: src/parser/normalizer.ts
- FOUND: src/parser/dedup.ts
- FOUND: src/index.ts
- FOUND: src/parser/__tests__/debug.test.ts
- FOUND: src/parser/__tests__/reader.test.ts
- FOUND: src/parser/__tests__/normalizer.test.ts
- FOUND: src/parser/__tests__/dedup.test.ts
- FOUND: src/parser/__tests__/index.test.ts
- FOUND: dist/index.js
- FOUND commit: 62e5bef (test RED Task 1)
- FOUND commit: 8ccd310 (feat GREEN Task 1)
- FOUND commit: 0fb7946 (test RED Task 2)
- FOUND commit: 8d83e30 (feat GREEN Task 2)

---
*Phase: 01-jsonl-parser-data-pipeline*
*Completed: 2026-02-28*
