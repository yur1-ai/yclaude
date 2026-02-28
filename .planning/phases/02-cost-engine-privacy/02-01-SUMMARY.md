---
phase: 02-cost-engine-privacy
plan: 01
subsystem: api
tags: [typescript, branded-types, cost-engine, pricing, vitest]

# Dependency graph
requires:
  - phase: 01-jsonl-parser-data-pipeline
    provides: NormalizedEvent type with six token sub-fields (input, output, cacheCreation, cacheRead, cacheCreation5m, cacheCreation1h)
provides:
  - EstimatedCost branded type (unique symbol brand, phantom, JSON-serializes as plain number)
  - toEstimatedCost() constructor — sole way to produce an EstimatedCost
  - CostEvent type (NormalizedEvent & { costUsd: EstimatedCost; unknownModel?: true })
  - MODEL_PRICING: complete pricing table for 19 Claude model entries (current + legacy + deprecated)
  - computeCosts(NormalizedEvent[]): CostEvent[] pure function with correct cache tier math
affects: [03-server, 04-dashboard, 05-cli, 06-session-aggregation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Branded type with unique symbol: number & { readonly [__brand]: 'EstimatedCost' } — phantom brand, zero runtime cost"
    - "Pure function cost mapping: computeCosts() returns CostEvent[] with all original fields preserved via spread"
    - "Cache double-counting avoidance: baseInput = max(0, input - cacheCreation - cacheRead), then bill 5m/1h tiers separately"
    - "Unknown model tolerance: zero cost + unknownModel=true flag + debugLog warning, never throws"

key-files:
  created:
    - src/cost/types.ts
    - src/cost/pricing.ts
    - src/cost/engine.ts
    - src/cost/__tests__/types.test.ts
    - src/cost/__tests__/pricing.test.ts
    - src/cost/__tests__/engine.test.ts

key-decisions:
  - "unique symbol brand for EstimatedCost (not string literal) — prevents structural satisfaction by external code"
  - "MODEL_PRICING includes both dated snapshot IDs and non-dated aliases (e.g., claude-haiku-4-5-20251001 + claude-haiku-4-5) to cover all real-world JSONL model ID variants"
  - "computeCosts() uses cacheCreation (total) for baseInput subtraction and the split fields (cacheCreation5m, cacheCreation1h) for per-tier billing — avoids double-counting"
  - "unknownModel: true ships in this phase (not deferred) — enables Phase 3 monitoring of pricing gaps against real JSONL"

patterns-established:
  - "Branded type pattern: unique symbol brand in separate types.ts, sole constructor function toEstimatedCost()"
  - "Pricing constants: typed Record<string, ModelPricing> with source URL comment and fetch date"
  - "TDD for pure functions: write failing tests first, implement minimal passing code, no refactor pass needed (code was already clean)"

requirements-completed: [CORE-02, CORE-03]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 2 Plan 1: Cost Engine — Types, Pricing, and Engine Summary

**EstimatedCost branded type + MODEL_PRICING table (19 Claude models) + computeCosts() pure function with two-tier cache pricing and zero-cost unknown model tolerance**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-28T09:17:57Z
- **Completed:** 2026-02-28T09:20:22Z
- **Tasks:** 2
- **Files modified:** 6 (all new)

## Accomplishments

- EstimatedCost phantom brand type using `unique symbol` — zero runtime cost, JSON-serializes as plain number, enforces estimate label at the type system level (CORE-03)
- Complete MODEL_PRICING table covering all 19 Claude model entries from official Anthropic pricing docs (2026-02-28), including both dated and alias IDs, with correct 5-min/1-hour cache write tier multipliers (CORE-02)
- computeCosts() pure function with cache double-counting avoidance, zero-cost unknown model handling with unknownModel=true flag and debugLog warning, all NormalizedEvent fields preserved

## Task Commits

Each task was committed atomically:

1. **Task 1: Define EstimatedCost branded type and CostEvent** - `c11675c` (feat)
2. **Task 2: Implement pricing constants table and cost engine** - `123c8d9` (feat)

## Files Created/Modified

- `src/cost/types.ts` - EstimatedCost branded type, toEstimatedCost() constructor, CostEvent type
- `src/cost/pricing.ts` - MODEL_PRICING: 19 model entries with inputPerMTok, outputPerMTok, cacheWrite5mPerMTok, cacheWrite1hPerMTok, cacheReadPerMTok
- `src/cost/engine.ts` - computeCosts(NormalizedEvent[]): CostEvent[] pure function
- `src/cost/__tests__/types.test.ts` - 5 tests: constructor, zero, JSON serialization, CostEvent spread, unknownModel flag
- `src/cost/__tests__/pricing.test.ts` - 6 tests: key model entries, cache multipliers, full model list coverage
- `src/cost/__tests__/engine.test.ts` - 8 tests: empty array, no tokens, no model, pure input, cache math, unknown model, field preservation, type check

## Decisions Made

- **unique symbol brand:** Using `declare const __brand: unique symbol` rather than a string literal brand (`{ __brand: 'EstimatedCost' }`) closes the structural subtyping loophole — external code cannot accidentally produce an EstimatedCost without calling `toEstimatedCost()`
- **Both alias forms in MODEL_PRICING:** Dated snapshot IDs and non-dated aliases are included (e.g., `claude-haiku-4-5-20251001` + `claude-haiku-4-5`) because real-world Claude Code JSONL logs may use either form
- **unknownModel field ships now:** Not deferred — enables Phase 3 server to surface model pricing gaps when running against real JSONL data
- **Cache math:** `baseInput = max(0, input - cacheCreation - cacheRead)` with per-tier billing using split fields (`cacheCreation5m`, `cacheCreation1h`) avoids the double-counting pitfall identified in research

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `computeCosts()` is ready for Phase 3 server endpoints to call after `applyPrivacyFilter(parseAll())`
- `EstimatedCost` type flows through to Phase 3+ consumers — they receive `CostEvent[]` with proper type safety
- `unknownModel: true` events can be monitored during Phase 2 human verification to detect JSONL model ID gaps

---
*Phase: 02-cost-engine-privacy*
*Completed: 2026-02-28*

## Self-Check: PASSED

All files verified present:
- FOUND: src/cost/types.ts
- FOUND: src/cost/pricing.ts
- FOUND: src/cost/engine.ts
- FOUND: src/cost/__tests__/types.test.ts
- FOUND: src/cost/__tests__/pricing.test.ts
- FOUND: src/cost/__tests__/engine.test.ts

All commits verified:
- FOUND: c11675c (feat(02-01): define EstimatedCost branded type and CostEvent)
- FOUND: 123c8d9 (feat(02-01): implement MODEL_PRICING constants and computeCosts() engine)
