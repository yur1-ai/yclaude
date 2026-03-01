# Milestones: yclaude

## Overview

This file documents the milestone structure for yclaude. Phases are numbered continuously across milestones — phase numbers never restart.

---

## ✅ v1.0 Local MVP — SHIPPED 2026-02-28

**Goal:** Deliver a working local analytics dashboard for Claude Code usage — zero-install via `npx yclaude`, privacy-first, with accurate cost estimates and a cost-over-time chart with global date filtering.

**Phases:** 1–4 | **Plans:** 11 | **Files changed:** 95 | **LOC:** ~3,017 TypeScript

**Timeline:** 2026-02-28 (single day)

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 1 | JSONL Parser & Data Pipeline | 3/3 | 2026-02-28 |
| 2 | Cost Engine & Privacy | 2/2 | 2026-02-28 |
| 3 | Server, CLI & App Shell | 3/3 | 2026-02-28 |
| 4 | Cost Analytics Dashboard | 3/3 | 2026-02-28 |

**Delivered:**

`npx yclaude` opens a local web dashboard showing estimated AI coding costs with breakdown by token type, a daily/weekly/monthly cost-over-time chart, and a global date range picker — all served from a CSP-hardened 127.0.0.1-only server with no conversation content ever exposed.

**Key accomplishments:**

1. Resilient JSONL parser — 56 tests, per-line error handling, UUID deduplication, multi-path detection (`~/.claude`, `~/.config/claude`, `CLAUDE_CONFIG_DIR`), `<persisted-output>` tag handling
2. Cost engine covering 19 Claude models with full cache tier pricing (5-min 1.25x, 1-hour 2x, read 0.1x); `EstimatedCost` branded type enforces "estimated" label at compile time
3. Privacy filter (`applyPrivacyFilter()`) strips all conversation content before any route sees data — zero leakage path
4. Hono server + Commander CLI — CSP headers, 127.0.0.1-only binding, `--dir`/`--port`/`--no-open` flags, 102 tests passing
5. Full-stack integration — Vite-built React SPA served via `serveStatic`; single `npx yclaude` binary auto-opens browser
6. Cost analytics dashboard — StatCard, TrendIndicator, TokenBreakdown, CostBarChart, DateRangePicker wired to TanStack Query + Zustand global date range store

**Archive:** `milestones/v1.0-ROADMAP.md` | `milestones/v1.0-REQUIREMENTS.md` | `milestones/v1.0-MILESTONE-AUDIT.md`

**Known Gaps (accepted as tech debt):**
- TrendIndicator shows null % — prior-period query deferred to Phase 5+ (ANLT-09+)
- Proportional cost per token type is approximate — exact per-type rates deferred to Phase 5+
- `KnownModel` type not re-exported from public API surface
- `--debug` not declared as Commander option (auto-detects via process.argv)

---

## 🚧 v1.1 Analytics Completion + Distribution (next)

**Goal:** Complete the full local analytics experience (model/project breakdowns, session explorer, differentiators, dark mode) and publish to npm with a CI/CD pipeline.

**Phases:** 5–8 + distribution phase | **Status:** Planning

| Phase | Name | Status |
|-------|------|--------|
| 5 | Model & Project Breakdowns | Not started |
| 6 | Session Explorer | Not started |
| 7 | Differentiator Features | Not started |
| 8 | Dark Mode & Personality | Not started |
| 9 | npm Distribution & CI/CD | Not started |

**Requirements:** ANLT-04, ANLT-05, SESS-01–04, ANLT-07–08, CLI-03, PRSL-01, ANLT-09, DIST-01, DIST-02, CHAT-01 (low priority)

---

## 📋 v2.0 Cloud & Teams (planned)

**Goal:** Web-deployable version with optional cloud sync, user accounts, and team features.

**Status:** Planned — not started. See PROJECT.md for full scope.

---
*Created: 2026-02-28 | Updated: 2026-02-28 — v1.0 shipped*
