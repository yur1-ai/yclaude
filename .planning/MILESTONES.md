# Milestones: yclaude

## Overview

This file documents the milestone structure for yclaude. Phases are numbered continuously across milestones — phase numbers never restart.

---

## ✅ v1.1 Analytics Completion + Distribution — SHIPPED 2026-03-05

**Goal:** Complete the full local analytics experience (model/project breakdowns, session explorer, differentiators, dark mode, conversations viewer) and publish to npm with a CI/CD pipeline.

**Phases:** 5–10 (incl. 9.1, 9.2) | **Plans:** 25 | **Commits:** 146 | **Files changed:** 85 | **LOC:** ~8,264 TypeScript

**Timeline:** 5 days (2026-02-28 → 2026-03-05)

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 5 | Model & Project Breakdowns | 3/3 | 2026-03-01 |
| 6 | Session Explorer | 3/3 | 2026-03-01 |
| 7 | Differentiator Features | 4/4 | 2026-03-01 |
| 8 | Dark Mode & Personality | 3/3 | 2026-03-01 |
| 9 | npm Distribution & CI/CD | 4/4 | 2026-03-01 |
| 9.1 | Cost Accuracy & Pricing Refactor | 3/3 | 2026-03-04 |
| 9.2 | Tech Debt Cleanup & Date Range Presets | 2/2 | 2026-03-05 |
| 10 | Conversations Viewer | 3/3 | 2026-03-05 |

**Delivered:**

Full analytics dashboard with 7 pages (Overview, Models, Projects, Sessions, Session Detail, Chats, Chat Detail), dark mode, personality copy, and automated npm publishing — all privacy-first with opt-in conversation viewing via `--show-messages`.

**Key accomplishments:**

1. Per-model donut chart and per-project cost breakdowns with human-readable project names decoded from directory paths
2. Browsable session explorer with paginated list, drill-down detail view showing per-turn token breakdown and cumulative cost timeline
3. Differentiator features no competitor has: cache efficiency score with trend, GitHub-style activity heatmap, subagent cost analysis, git branch filtering, 24h hourly chart buckets
4. System-aware dark mode with manual toggle (persisted via localStorage) and humorous "Why, Claude?!" personality copy woven throughout all views
5. Published to npm as `yclaude` with automated GitHub Actions CI/CD pipeline — tag push triggers lint, typecheck, tests, build, and npm publish
6. Tier-reference pricing architecture with info tooltips explaining API-equivalent pricing, unknown model warnings, and PRICING_LAST_UPDATED metadata
7. Conversations viewer with `--show-messages` opt-in gating, server-side 403 enforcement, markdown rendering with syntax highlighting, collapsible tool blocks

**Requirements:** 18/18 satisfied (13 original + 4 Phase 9.1 + CHAT-01)
**Tests:** 174 passing across 14+ test files, 0 failures

**Archive:** `milestones/v1.1-ROADMAP.md` | `milestones/v1.1-REQUIREMENTS.md` | `milestones/v1.1-MILESTONE-AUDIT.md`

**Known Gaps (accepted as tech debt):**
- INT-01: `/api/v1/chats/:id` missing subagent cost split fields (low severity — conditional safely suppresses)
- `useThemeStore.ts:20-26` — module-level media listener references store before full export
- `Layout.tsx:65` — version label `v1.1.0` hardcoded
- `api.test.ts:269-273` — pre-existing TS errors (`body` typed as `unknown`)
- REQUIREMENTS.md traceability table staleness for 9.1/9.2 requirements (archived as-is)

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

## 📋 v2.0 Cloud & Teams (planned)

**Goal:** Web-deployable version with optional cloud sync, user accounts, and team features.

**Status:** Planned — not started. See PROJECT.md for full scope.

---
*Created: 2026-02-28 | Updated: 2026-03-05 — v1.1 shipped*
