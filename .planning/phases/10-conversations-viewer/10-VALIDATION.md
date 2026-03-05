---
phase: 10
slug: conversations-viewer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | `web/vitest.config.ts` + `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | CHAT-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | CHAT-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | CHAT-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 2 | CHAT-01 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for CLI flag parsing (`--show-messages`)
- [ ] Test stubs for 403 gating on `/api/v1/chats` endpoints
- [ ] Test stubs for message content extraction from JSONL events
- [ ] Test stubs for privacy filter conditional bypass

*Note: Task IDs will be finalized after plan creation. This is the initial strategy.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Markdown renders correctly (code blocks, GFM) | CHAT-01 | Visual rendering quality | Open chat detail, verify code blocks have syntax highlighting, tables render, inline code styled |
| Dark mode theme follows app mode | CHAT-01 | CSS visual verification | Toggle dark mode, verify syntax highlighting theme switches |
| Chat card layout matches design spec | CHAT-01 | Visual layout | Compare card layout against spec: 2-line card, expand/collapse, cost right-aligned |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
