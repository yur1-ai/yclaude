---
phase: 11
slug: provider-abstraction-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run typecheck` + `npm run build:prod`
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | PROV-01 | unit | `npx vitest run src/providers/__tests__/types.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | PROV-01 | unit | `npx vitest run src/providers/claude/__tests__/adapter.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | PROV-01, PROV-02 | unit | `npx vitest run src/providers/__tests__/registry.test.ts` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | PROV-01 | regression | `npx vitest run src/providers/claude/__tests__/` | ❌ W0 (migrated) | ⬜ pending |
| 11-02-02 | 02 | 1 | PROV-01 | integration | `npx vitest run src/server/__tests__/` | ✅ (migrated) | ⬜ pending |
| 11-03-01 | 03 | 2 | PROV-02 | unit | `npx vitest run src/server/__tests__/cli.test.ts -t "banner"` | ❌ W0 | ⬜ pending |
| 11-03-02 | 03 | 2 | PROV-02 | unit | `npx vitest run src/server/__tests__/cli.test.ts -t "exclude"` | ❌ W0 | ⬜ pending |
| 11-03-03 | 03 | 2 | PROV-02 | unit | `npx vitest run src/providers/__tests__/registry.test.ts -t "error"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/providers/__tests__/types.test.ts` — UnifiedEvent type validation (PROV-01)
- [ ] `src/providers/__tests__/registry.test.ts` — loadProviders, detect, error handling (PROV-01, PROV-02)
- [ ] `src/providers/claude/__tests__/adapter.test.ts` — ClaudeAdapter interface compliance (PROV-01)
- [ ] Migrate 11 test files from `src/parser/__tests__/` and `src/cost/__tests__/` to `src/providers/claude/__tests__/`
- [ ] Update 4 test files in `src/server/__tests__/` to use UnifiedEvent instead of CostEvent/NormalizedEvent

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Startup banner shows provider status icons | PROV-02 | Visual formatting | Run `npx yclaude` and confirm provider table in terminal |
| `npx yclaude` shows same analytics as v1.1 | PROV-01 | End-to-end regression | Compare dashboard output visually against v1.1 baseline |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
