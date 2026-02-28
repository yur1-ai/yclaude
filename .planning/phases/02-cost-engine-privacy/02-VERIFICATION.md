---
phase: 02-cost-engine-privacy
verified: 2026-02-28T04:43:00Z
status: gaps_found
score: 7/9 must-haves verified
re_verification: false
gaps:
  - truth: "Server binds exclusively to 127.0.0.1 — not accessible from other machines on the network"
    status: failed
    reason: "No server exists in Phase 2 scope. Server is a Phase 3 deliverable. ROADMAP Phase 2 Success Criterion 3 is listed here but the two Phase 2 plans do not cover it."
    artifacts:
      - path: "src/"
        issue: "No server module exists; no 127.0.0.1 binding anywhere in src/"
    missing:
      - "Descope this criterion from Phase 2 OR create a gap record noting it carries to Phase 3"
  - truth: "CSP headers block all external network requests from the served pages"
    status: failed
    reason: "No server exists in Phase 2 scope. CSP headers are a Phase 3 server concern. ROADMAP Phase 2 Success Criterion 5 is listed here but neither plan covers it."
    artifacts:
      - path: "src/"
        issue: "No HTTP server module; no Content-Security-Policy header logic anywhere in src/"
    missing:
      - "Descope this criterion from Phase 2 OR create a gap record noting it carries to Phase 3"
human_verification:
  - test: "Run full pipeline smoke test against real JSONL data"
    expected: "Events count non-zero, total estimated cost is a positive number, unknown model count 0 or small, no crash"
    why_human: "Requires real ~/.claude JSONL data; cannot mock in CI. 02-02-SUMMARY.md records this as approved."
  - test: "Confirm no 'message' field leaks after applyPrivacyFilter against real data"
    expected: "Zero events with message/content/text fields after filtering"
    why_human: "Requires real JSONL passthrough data to confirm real-world field names are covered. 02-02-SUMMARY.md records this as approved."
---

# Phase 2: Cost Engine & Privacy — Verification Report

**Phase Goal:** User sees trustworthy cost estimates in a secure, privacy-respecting environment
**Verified:** 2026-02-28T04:43:00Z
**Status:** gaps_found (scope discrepancy — two ROADMAP success criteria belong to Phase 3)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

Derived from ROADMAP Phase 2 Success Criteria and PLAN must_haves. Items 1-2 come from
02-01-PLAN.md must_haves; items 3-5 from 02-02-PLAN.md must_haves; items 6-7 from the
ROADMAP Phase 2 success criteria that map to the server (Phase 3 scope).

| #   | Truth                                                                                       | Status      | Evidence                                                               |
| --- | ------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| 1   | Every cost value is typed as EstimatedCost, not a bare number                              | VERIFIED    | `toEstimatedCost()` is the sole constructor; unique symbol brand       |
| 2   | Cost calculated for all Claude models with correct cache tier pricing                       | VERIFIED    | 19 model entries in MODEL_PRICING; cache multipliers verified by test  |
| 3   | Unrecognized model IDs get zero cost + unknownModel: true + debugLog warning                | VERIFIED    | engine.ts:34-36; engine.test.ts covers all three outcomes              |
| 4   | Events with no token data get zero cost without crashing                                    | VERIFIED    | engine.ts:28-30; engine.test.ts line 19-25                             |
| 5   | Cache token double-counting avoided (baseInput = max(0, input - cacheCreation - cacheRead)) | VERIFIED    | engine.ts:45; cache math test at engine.test.ts:52-76                  |
| 6   | No conversation content reaches downstream after applyPrivacyFilter()                       | VERIFIED    | privacy.ts strips message/content/text; 9 tests confirm all cases      |
| 7   | applyPrivacyFilter() is standalone pure function independent of cost engine                 | VERIFIED    | privacy.ts has no import from engine.ts or pricing.ts                  |
| 8   | Server binds exclusively to 127.0.0.1                                                       | FAILED      | No server exists in Phase 2; this is a Phase 3 deliverable             |
| 9   | CSP headers block all external network requests                                             | FAILED      | No server exists in Phase 2; CSP is a Phase 3 deliverable              |

**Score:** 7/9 truths verified

**Note on gaps:** Truths 8 and 9 correspond to ROADMAP Phase 2 Success Criteria 3 and 5. Both are server-layer concerns — the Phase 2 plans (02-01 and 02-02) make no claim to implement a server. Neither plan's `success_criteria` block nor `must_haves` includes server binding or CSP. These criteria appear to have been written into the ROADMAP Phase 2 section prematurely; they belong to Phase 3. REQUIREMENTS.md marks CORE-04 as "Complete," but the full CORE-04 definition includes "server binds to 127.0.0.1 exclusively" and "CSP headers blocking external requests," which are unimplemented.

---

## Required Artifacts

| Artifact                              | Expected                                    | Status     | Details                                              |
| ------------------------------------- | ------------------------------------------- | ---------- | ---------------------------------------------------- |
| `src/cost/types.ts`                   | EstimatedCost branded type + CostEvent type | VERIFIED   | 33 lines; exports EstimatedCost, toEstimatedCost, CostEvent |
| `src/cost/pricing.ts`                 | MODEL_PRICING covering all Claude models    | VERIFIED   | 116 lines; 19 model entries; satisfies Record<string, ModelPricing> |
| `src/cost/engine.ts`                  | computeCosts() pure function                | VERIFIED   | 55 lines; full cache tier math; all field spread preserved |
| `src/cost/__tests__/pricing.test.ts`  | Tests for pricing structure                 | VERIFIED   | 6 tests; key models, cache multipliers, full model list |
| `src/cost/__tests__/engine.test.ts`   | Tests for computeCosts()                    | VERIFIED   | 7 tests covering all edge cases per plan behavior    |
| `src/cost/__tests__/types.test.ts`    | Tests for EstimatedCost and CostEvent       | VERIFIED   | 5 tests; constructor, zero, JSON serialization, spread |
| `src/cost/privacy.ts`                 | applyPrivacyFilter() pure function          | VERIFIED   | 35 lines; Set-based blacklist; pure, non-mutating    |
| `src/cost/__tests__/privacy.test.ts`  | Tests for privacy filter behavior           | VERIFIED   | 9 tests; empty, safe fields, strip each content field |
| `src/index.ts`                        | Public re-exports for Phase 3 consumers     | VERIFIED   | Exports applyPrivacyFilter, computeCosts, CostEvent, EstimatedCost |

All 9 plan-declared artifacts exist and are substantive. No stubs found.

---

## Key Link Verification

### Plan 02-01 Key Links

| From               | To                    | Via                               | Status  | Details                                                       |
| ------------------ | --------------------- | --------------------------------- | ------- | ------------------------------------------------------------- |
| `src/cost/engine.ts` | `src/cost/pricing.ts` | `MODEL_PRICING[event.model]`    | WIRED   | engine.ts:2 imports MODEL_PRICING; engine.ts:32 uses it as lookup |
| `src/cost/engine.ts` | `src/cost/types.ts`   | `toEstimatedCost()` wraps cost  | WIRED   | engine.ts:4 imports; lines 29, 36, 54 all call toEstimatedCost() |
| `src/cost/engine.ts` | `src/shared/debug.ts` | `debugLog()` for unknown model  | WIRED   | engine.ts:6 imports; engine.ts:35 calls on unknown model path |

### Plan 02-02 Key Links

| From                    | To                    | Via                                | Status  | Details                                                       |
| ----------------------- | --------------------- | ---------------------------------- | ------- | ------------------------------------------------------------- |
| `src/index.ts`          | `src/cost/privacy.ts` | re-export applyPrivacyFilter       | WIRED   | index.ts:11 `export { applyPrivacyFilter } from './cost/privacy.js'` |
| `src/index.ts`          | `src/cost/engine.ts`  | re-export computeCosts             | WIRED   | index.ts:12 `export { computeCosts } from './cost/engine.js'` |
| Phase 3 server          | `src/index.ts`        | import applyPrivacyFilter+computeCosts | N/A | Phase 3 not implemented yet — cannot verify; tracked as human check |

All implemented key links are WIRED.

---

## Requirements Coverage

| Requirement | Source Plan | Description                                                    | Status        | Evidence                                                        |
| ----------- | ----------- | -------------------------------------------------------------- | ------------- | --------------------------------------------------------------- |
| CORE-02     | 02-01       | Accurate cost estimates with full cache tier pricing           | SATISFIED     | MODEL_PRICING (19 models); cache tiers: 1.25x/2x/0.1x; all tests pass |
| CORE-03     | 02-01       | All cost figures labeled "estimated"                           | SATISFIED     | EstimatedCost branded type enforces estimate label at type system level |
| CORE-04     | 02-02       | Conversation data private: no content displayed, 127.0.0.1, CSP | PARTIAL   | Privacy filter (no content) confirmed. Server/CSP not in Phase 2 scope. |

**CORE-04 Scope Analysis:**

CORE-04 as defined in REQUIREMENTS.md has four components:
1. Server binds to 127.0.0.1 exclusively — NOT IMPLEMENTED (Phase 3 work)
2. Zero telemetry — NOT VERIFIABLE (no server exists yet; no telemetry calls found in src/)
3. CSP headers blocking external requests — NOT IMPLEMENTED (Phase 3 work)
4. No conversation content displayed anywhere — SATISFIED by applyPrivacyFilter()

The REQUIREMENTS.md traceability table marks CORE-04 as "Complete" but this is premature: two of its four components require the Phase 3 server. The privacy filter component is complete; the server-layer components carry forward to Phase 3.

**Orphaned requirements:** None. CORE-02, CORE-03, and CORE-04 all appear in plan frontmatter. No Phase 2 requirements in REQUIREMENTS.md are unclaimed.

---

## Anti-Patterns Found

| File                  | Line | Pattern | Severity | Impact |
| --------------------- | ---- | ------- | -------- | ------ |
| None                  | —    | —       | —        | —      |

No TODO/FIXME/placeholder comments found. No empty implementations. No stub patterns. No console.log-only implementations.

---

## Test Suite Results

- **Total tests:** 85 (10 test files)
- **Passing:** 85 / 85
- **Phase 1 tests:** Intact — no regression
- **Phase 2 new tests:** 28 (types: 5, pricing: 6, engine: 7, privacy: 9, plus types.test.ts included in Plan 01 count but created in execution)
- **`npm run typecheck`:** Exit 0, zero TypeScript errors

---

## Human Verification Required

### 1. Full Pipeline Smoke Test

**Test:** Run the pipeline script from the 02-02-PLAN.md human checkpoint against real Claude Code JSONL data.
**Expected:** Non-zero event count, positive total estimated cost, unknown model count ideally 0, no crash.
**Why human:** Requires real ~/.claude JSONL data. 02-02-SUMMARY.md records this as human-approved (checkpoint approved during execution).

### 2. Privacy Leak Check Against Real JSONL

**Test:** Run the content field leak check from 02-02-PLAN.md against real data.
**Expected:** Zero events with message/content/text fields after applyPrivacyFilter.
**Why human:** Real passthrough field names must be confirmed against live data. 02-02-SUMMARY.md records this as approved.

---

## Gaps Summary

Two ROADMAP Phase 2 Success Criteria (SC3: server 127.0.0.1; SC5: CSP headers) are server-layer concerns that are not in scope for either Phase 2 plan. The plans do not claim to implement a server. No server module exists in `src/`. Both items are Phase 3 deliverables.

The REQUIREMENTS.md traceability table prematurely marks CORE-04 as "Complete." The privacy filter component of CORE-04 is complete. The server-binding and CSP components of CORE-04 must be picked up during Phase 3 planning.

**Recommended action:** When creating Phase 3 plans, ensure CORE-04 server-layer components (127.0.0.1 binding, CSP headers) are explicitly included in the Phase 3 `requirements` list and `must_haves`. The REQUIREMENTS.md traceability table should note CORE-04 as "Partial" until Phase 3 is complete.

The core Phase 2 deliverables — cost engine, privacy filter, and public API — are fully implemented, tested, and wired. The phase goal ("user sees trustworthy cost estimates in a privacy-respecting environment") is achieved at the library layer. The server-layer security hardening simply hasn't been built yet because the server hasn't been built yet.

---

*Verified: 2026-02-28T04:43:00Z*
*Verifier: Claude (gsd-verifier)*
