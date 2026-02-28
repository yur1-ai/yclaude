---
phase: 02-cost-engine-privacy
plan: "02"
subsystem: cost
tags: [privacy, filtering, typescript, zod, tdd]

# Dependency graph
requires:
  - phase: 02-01
    provides: computeCosts(), CostEvent, EstimatedCost branded type, MODEL_PRICING
  - phase: 01-jsonl-parser-data-pipeline
    provides: parseAll(), NormalizedEvent type, passthrough schema
provides:
  - applyPrivacyFilter() pure function stripping message/content/text fields
  - Public src/index.ts re-exports for applyPrivacyFilter, computeCosts, CostEvent, EstimatedCost
  - CORE-04 privacy guarantee enforced at library boundary
  - Complete end-to-end pipeline: parseAll -> applyPrivacyFilter -> computeCosts
affects:
  - 03-dashboard-shell (imports the public API from src/index.ts)
  - 04-project-stats-aggregation (uses CostEvent, EstimatedCost)
  - Any future phase that handles conversation data

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Privacy-by-design: filter at library boundary so UI layer cannot accidentally bypass"
    - "Pure function over immutable transformation: stripContentFields returns new objects, never mutates"
    - "Set-based field blacklist: CONTENT_FIELDS = new Set(['message', 'content', 'text']) — O(1) lookup"
    - "Unsafe cast with documented invariant: filtered as NormalizedEvent is safe because required fields never overlap CONTENT_FIELDS"

key-files:
  created:
    - src/cost/privacy.ts
    - src/cost/__tests__/privacy.test.ts
  modified:
    - src/index.ts

key-decisions:
  - "Privacy filter placed in library (not UI layer) — Phase 3 cannot accidentally bypass it"
  - "CONTENT_FIELDS uses Set for O(1) lookup; named constant makes intent clear"
  - "Return type is NormalizedEvent[] (same as input) — filter is transparent to callers, no type explosion"
  - "toEstimatedCost intentionally not re-exported from index.ts — it is an internal constructor"
  - "KnownModel union type exported (code review fix) — satisfies Record<string, ModelPricing> provides compile-time safety on MODEL_PRICING entries"

patterns-established:
  - "Privacy filter pattern: explicit Set-based field blacklist, pure map transform, cast-with-comment"
  - "Public API boundary: src/index.ts is the single import point; internal src/cost/* not for external use"

requirements-completed: [CORE-04]

# Metrics
duration: ~20min (including checkpoint wait for human verification)
completed: 2026-02-28
---

# Phase 2 Plan 02: Privacy Filter & Public API Summary

**applyPrivacyFilter() pure function stripping message/content/text from NormalizedEvent arrays, with full public API (parseAll + applyPrivacyFilter + computeCosts) exported from src/index.ts and human-verified against real JSONL data**

## Performance

- **Duration:** ~20 min (including checkpoint approval wait)
- **Started:** 2026-02-28T09:20:00Z (approx)
- **Completed:** 2026-02-28T09:40:00Z (approx)
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 5 (privacy.ts, privacy.test.ts, index.ts, engine.ts, pricing.ts)

## Accomplishments

- Privacy filter module implemented as pure function with Set-based O(1) field blacklist
- src/index.ts extended with Phase 2 public API (applyPrivacyFilter, computeCosts, CostEvent, EstimatedCost)
- Full pipeline human-verified against real Claude Code JSONL data: non-zero cost totals, zero content field leakage
- Code review fixes applied: MODEL_PRICING now uses `satisfies Record<string, ModelPricing>` with KnownModel export, cache math comment clarified, JSDoc added to computeCosts
- All 85 tests pass; typecheck clean

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing privacy tests** - `55376c8` (test)
2. **Task 1: GREEN — implement applyPrivacyFilter and extend public index exports** - `59cd665` (feat)
3. **Code review fixes (post-checkpoint)** - `653ffe4` (refactor — applied before checkpoint completion)

_Note: TDD tasks have multiple commits (test RED → feat GREEN). The refactor commit was made between checkpoint pause and continuation._

## Files Created/Modified

- `src/cost/privacy.ts` - applyPrivacyFilter() pure function; CONTENT_FIELDS Set blacklist; stripContentFields inner helper
- `src/cost/__tests__/privacy.test.ts` - 9 behavior cases: empty array, safe fields preserved, message/content/text stripped, immutability check
- `src/index.ts` - Phase 2 additions: re-exports applyPrivacyFilter, computeCosts, CostEvent, EstimatedCost
- `src/cost/engine.ts` - Cache math comment clarified; @param/@returns added to computeCosts JSDoc
- `src/cost/pricing.ts` - MODEL_PRICING now uses `satisfies Record<string, ModelPricing>`; exports KnownModel union type

## Decisions Made

- **Privacy at library boundary:** Filter is in src/cost/privacy.ts (library), not the future UI layer — Phase 3 cannot bypass it by accident. This is the CORE-04 enforcement point.
- **Return type stays NormalizedEvent[]:** No new type for filtered events — keeps the pipeline simple and avoids a parallel type hierarchy. The privacy guarantee is a runtime property, not a type distinction.
- **toEstimatedCost not re-exported:** It is an internal constructor for the cost engine. Exporting it would invite misuse (wrapping arbitrary numbers as EstimatedCost).
- **KnownModel type export (code review):** `satisfies Record<string, ModelPricing>` on MODEL_PRICING catches malformed entries at compile time; KnownModel union type is derived automatically — no maintenance burden.

## Deviations from Plan

None - plan executed exactly as written. The code review refactor commit (653ffe4) was a planned post-checkpoint cleanup, not an unplanned deviation.

## Issues Encountered

None. TDD flow was clean: RED tests failed as expected, GREEN implementation made them pass on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 (Dashboard Shell) can import `{ parseAll, applyPrivacyFilter, computeCosts }` from `'yclaude'` (or `'./src/index.js'` in dev) — the complete pipeline is available
- CORE-04 privacy guarantee is met and verified against real data
- KnownModel type available if Phase 3 needs to display model names or filter by model
- No blockers for Phase 3

## Self-Check: PASSED

- FOUND: src/cost/privacy.ts
- FOUND: src/cost/__tests__/privacy.test.ts
- FOUND: src/index.ts
- FOUND: .planning/phases/02-cost-engine-privacy/02-02-SUMMARY.md
- FOUND commit: 55376c8 (test RED)
- FOUND commit: 59cd665 (feat GREEN)
- FOUND commit: 653ffe4 (refactor code review fixes)
- 85 tests pass, typecheck clean

---
*Phase: 02-cost-engine-privacy*
*Completed: 2026-02-28*
