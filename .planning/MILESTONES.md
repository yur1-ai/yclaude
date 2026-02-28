# Milestones: yclaude

## Overview

This file documents the milestone structure for yclaude. Phases are numbered continuously across milestones — phase numbers never restart.

## v1.0 Local MVP

**Goal:** Complete the full local dashboard experience — cost analytics, breakdowns, session explorer, differentiator features, and personality polish. Distributed as `npx yclaude` with zero installation required.

**Status:** In progress

**Phases:**

| Phase | Name | Status | Completed |
|-------|------|--------|-----------|
| 1 | JSONL Parser & Data Pipeline | Complete | 2026-02-28 |
| 2 | Cost Engine & Privacy | Complete | 2026-02-28 |
| 3 | Server, CLI & App Shell | Complete | 2026-02-28 |
| 4 | Cost Analytics Dashboard | Not started | - |
| 5 | Model & Project Breakdowns | Not started | - |
| 6 | Session Explorer | Not started | - |
| 7 | Differentiator Features | Not started | - |
| 8 | Dark Mode & Personality | Not started | - |

**Foundation shipped (Phases 1-3):**

Phases 1-3 were completed on 2026-02-28 and form the validated foundation for Phases 4-8:

- Phase 1 delivered: streaming JSONL parser with UUID deduplication, per-line error handling, multi-path detection (`~/.claude`, `~/.config/claude`, `CLAUDE_CONFIG_DIR`), and `<persisted-output>` handling
- Phase 2 delivered: full cache tier pricing engine (5-min write 1.25x, 1-hour write 2x, read 0.1x), `EstimatedCost` branded type, `applyPrivacyFilter()` in the library layer (not UI)
- Phase 3 delivered: Hono server bound to 127.0.0.1 with CSP headers, `npx yclaude` CLI with `--dir`/`--port`/`--no-open` flags, React 19 + Tailwind v4 + React Router v7 SPA shell auto-served and auto-opened in browser

**Remaining work (Phases 4-8):** See `.planning/ROADMAP.md` for full phase details and success criteria.

## v1.1 Message Viewer (planned)

**Goal:** Opt-in conversation content display behind a `--show-messages` startup flag. Privacy-first: messages never synced to cloud without explicit consent.

**Requirements:** MSGS-01 through MSGS-04 (see REQUIREMENTS.md)

**Status:** Planned — not started

## v2.0 Cloud & Distribution (planned)

**Goal:** Web-deployable version with optional cloud sync, user accounts, and team features.

**Status:** Planned — not started. See PROJECT.md for full scope.

---
*Created: 2026-02-28*
