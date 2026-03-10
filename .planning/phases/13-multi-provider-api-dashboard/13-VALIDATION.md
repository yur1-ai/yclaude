---
phase: 13
slug: multi-provider-api-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/server/__tests__/api-provider-filter.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/server/__tests__/api-provider-filter.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | PROV-04 | unit | `npx vitest run src/server/__tests__/api-provider-filter.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | PROV-03 | unit | `npx vitest run src/server/__tests__/api.test.ts -t "config"` | ✅ partial | ⬜ pending |
| 13-02-01 | 02 | 2 | CROSS-01 | unit | `npx vitest run src/server/__tests__/api.test.ts -t "summary"` | ✅ partial | ⬜ pending |
| 13-02-02 | 02 | 2 | CROSS-02 | unit | `npx vitest run src/server/__tests__/api.test.ts -t "models"` | ✅ partial | ⬜ pending |
| 13-02-03 | 02 | 2 | CROSS-03 | unit | `npx vitest run src/server/__tests__/api.test.ts -t "activity"` | ❌ W0 | ⬜ pending |
| 13-03-01 | 03 | 2 | PROV-05 | manual-only | Manual: verify quip text per provider tab | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/server/__tests__/api-provider-filter.test.ts` — stubs for PROV-04 (provider filtering on all endpoints)
- [ ] Extend `src/server/__tests__/api.test.ts` — add ?provider= test cases for summary, models, activity endpoints (CROSS-01, CROSS-02, CROSS-03)

*Frontend testing note: The project has no frontend test infrastructure. All React component changes are verified manually. This is an existing project-wide gap, not Phase 13 specific.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Provider-specific personality copy renders correctly | PROV-05 | Copy/voice quality is subjective; no testable invariant | 1. Switch to Claude tab → verify Claude-specific quips on Overview. 2. Switch to Cursor → verify Cursor-specific quips. 3. Switch to All → verify generic AI quips. |
| Provider tabs render only with 2+ providers | PROV-03 | Requires visual verification of sidebar layout | 1. Load with 1 provider → confirm no tabs visible. 2. Load with 2+ providers → confirm [All] [Claude] [Cursor] tabs appear. |
| Stacked area chart visual correctness | CROSS-01 | Chart rendering is visual; API data shape is tested | 1. Navigate to All-view Overview. 2. Confirm stacked area chart with distinct provider colors. 3. Hover to verify tooltip shows per-provider breakdown. |
| Provider badges display correctly | CROSS-02 | Visual rendering of colored dots + text | 1. Navigate to Sessions in All-view → confirm colored dot + provider name per row. 2. Navigate to Models → confirm provider column. |
| Unified heatmap tooltip breakdown | CROSS-03 | Tooltip content is visual | 1. Navigate to All-view Overview. 2. Hover on heatmap day with mixed providers. 3. Confirm tooltip shows "N Claude, M Cursor" breakdown. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
