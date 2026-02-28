# Roadmap: yclaude

## Overview

yclaude delivers a local-first analytics dashboard for Claude Code usage, distributed via `npx yclaude`. The roadmap builds from data foundation (parser, cost engine, privacy) through a complete CLI-served web dashboard (cost views, breakdowns, sessions) to differentiator features (cache efficiency, heatmap, sidechains, git branches) and polish (dark mode, personality copy). Each phase delivers a verifiable capability that the next phase builds on — parser before cost engine, cost engine before dashboard, dashboard before advanced analytics.

## Milestones

- 🚧 **v1.0 Local MVP** — Phases 1-8 (in progress — Phases 1-3 complete)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>Phases 1-3: Foundation (complete 2026-02-28)</summary>

- [x] **Phase 1: JSONL Parser & Data Pipeline** - Resilient parser that reads Claude Code JSONL data with per-line error handling, deduplication, and multi-path detection (completed 2026-02-28)
- [x] **Phase 2: Cost Engine & Privacy** - Accurate cost estimation with full cache tier pricing, estimate labeling, and localhost-only security hardening (completed 2026-02-28)
- [x] **Phase 3: Server, CLI & App Shell** - Hono server serving a React SPA shell, launched via `npx yclaude` with CLI flags and auto-open browser (completed 2026-02-28)

</details>

- [ ] **Phase 4: Cost Analytics Dashboard** - Core dashboard views showing total cost, token breakdown, cost-over-time chart, and global date range filtering
- [ ] **Phase 5: Model & Project Breakdowns** - Per-model donut chart and table, per-project cost breakdown with decoded directory names
- [ ] **Phase 6: Session Explorer** - Browsable session list with drill-down detail view showing per-turn token breakdown
- [ ] **Phase 7: Differentiator Features** - Cache efficiency score, activity heatmap, sidechain/subagent analysis, and git branch filtering
- [ ] **Phase 8: Dark Mode & Personality** - System-aware dark mode toggle and humorous personality copy woven throughout all views

## Phase Details

<details>
<summary>Phase 1: JSONL Parser & Data Pipeline (complete)</summary>

### Phase 1: JSONL Parser & Data Pipeline
**Goal**: User's local Claude Code data can be reliably parsed into structured, deduplicated events regardless of Claude Code version or data quirks
**Depends on**: Nothing (first phase)
**Requirements**: CORE-01
**Success Criteria** (what must be TRUE):
  1. Parser reads all JSONL files from `~/.claude/projects/**/*.jsonl` and produces structured event objects with type, tokens, model, session, project, and timestamp
  2. A malformed or corrupted JSONL line is skipped with a warning — it never crashes the parser or corrupts other records
  3. Duplicate events (same UUID) are deduplicated so token counts are not inflated
  4. Parser detects data in `~/.claude`, `~/.config/claude`, and respects `CLAUDE_CONFIG_DIR` environment variable
  5. Lines wrapped in `<persisted-output>` tags are handled gracefully (parsed or skipped, never crash)
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold (package.json, tsconfig, tsup, vitest) + NormalizedEvent type contracts and Zod schemas
- [x] 01-02-PLAN.md — Parser core modules: debug, file discovery, JSONL streaming, normalizer, deduplication, and public parseAll() API
- [x] 01-03-PLAN.md — Integration test suite covering all CORE-01 success criteria + human verification against real JSONL data

</details>

<details>
<summary>Phase 2: Cost Engine & Privacy (complete)</summary>

### Phase 2: Cost Engine & Privacy
**Goal**: User sees trustworthy cost estimates in a secure, privacy-respecting environment
**Depends on**: Phase 1
**Requirements**: CORE-02, CORE-03, CORE-04
**Success Criteria** (what must be TRUE):
  1. Cost estimates are calculated for all current Claude models using correct per-token pricing including cache tier complexity (5-min write 1.25x, 1-hour write 2x, cache read 0.1x)
  2. Every cost figure displayed anywhere in the application includes the word "estimated" or an equivalent indicator
  3. No conversation content (user messages, assistant responses) is ever displayed in the UI — only metadata and token counts
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — EstimatedCost branded type + MODEL_PRICING constants + computeCosts() engine with tests
- [x] 02-02-PLAN.md — applyPrivacyFilter() module + src/index.ts public exports + human verification against real JSONL data

</details>

<details>
<summary>Phase 3: Server, CLI & App Shell (complete)</summary>

### Phase 3: Server, CLI & App Shell
**Goal**: User can run a single command and have a working web application open in their browser
**Depends on**: Phase 2
**Requirements**: CLI-01, CLI-02, CORE-04
**Success Criteria** (what must be TRUE):
  1. Running `npx yclaude` starts the server and automatically opens a browser tab to the dashboard
  2. The `--dir <path>` flag overrides the default data directory, `--port <n>` sets a custom port, and `--no-open` prevents browser auto-open
  3. The browser shows a functioning SPA shell (navigation, layout, loading states) served by the Hono server
  4. API endpoints under `/api/v1/*` return parsed and aggregated data from the data pipeline
  5. Server binds exclusively to 127.0.0.1 — it is not accessible from other machines on the network
  6. CSP headers block all external network requests from the served pages
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Hono server factory (createApp), /api/v1/summary endpoint, CLI binary with --dir/--port/--no-open flags, 127.0.0.1 binding, CSP headers
- [x] 03-02-PLAN.md — Vite + React + Tailwind v4 + React Router v7 SPA shell: left sidebar layout, 4 placeholder pages, builds to web-dist/
- [x] 03-03-PLAN.md — Full-stack integration: serveStatic wired to web-dist/, build scripts updated, human-verified in browser

</details>

### Phase 4: Cost Analytics Dashboard
**Goal**: User can see their total AI coding spend and how it changes over time, filtered to any date range
**Depends on**: Phase 3
**Requirements**: ANLT-01, ANLT-02, ANLT-03, ANLT-06
**Success Criteria** (what must be TRUE):
  1. Dashboard displays all-time total estimated cost and a selected-period total side by side at a glance — both clearly labeled "estimated"
  2. Token usage is broken down by type (input, output, cache creation, cache read) with clear labels and a visual indicator of relative share
  3. A cost-over-time area chart renders with daily, weekly, and monthly toggle options and correct x-axis bucketing
  4. A global date range picker filters all views on the page simultaneously — changing the picker triggers a coordinated re-fetch via TanStack Query
  5. All chart colors use CSS variable references (`var(--color-*)`) so dark mode toggled in Phase 8 requires no chart rewrites
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Model & Project Breakdowns
**Goal**: User can see exactly which models and projects are driving their spend
**Depends on**: Phase 4
**Requirements**: ANLT-04, ANLT-05
**Success Criteria** (what must be TRUE):
  1. A donut chart shows estimated cost broken down by model, with a companion sortable table below it
  2. A per-project cost breakdown page displays human-readable project names derived from the `cwd` path field — not raw directory slugs
  3. Both views respond to the global date range picker: selecting a new range re-fetches and re-renders both pages without a full page reload
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Session Explorer
**Goal**: User can browse their sessions and drill into individual session details to understand per-session spend
**Depends on**: Phase 4
**Requirements**: SESS-01, SESS-02
**Success Criteria** (what must be TRUE):
  1. Session list page displays all sessions with project name, model, estimated cost, timestamp, and duration — columns are sortable and the list supports filtering by project
  2. Clicking a session opens a detail view showing full token breakdown per conversation turn (input / output / cache creation / cache read) and a cumulative cost timeline
  3. No conversation text appears anywhere in the session list or detail views — only metadata, token counts, and cost estimates
  4. Session list uses server-side pagination (50 sessions per page) so the UI stays responsive for users with 500+ sessions
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: Differentiator Features
**Goal**: User gets insights no competing tool provides — cache efficiency scoring, activity patterns, subagent analysis, and git branch context
**Depends on**: Phase 5, Phase 6
**Requirements**: ANLT-07, ANLT-08, SESS-03, SESS-04
**Success Criteria** (what must be TRUE):
  1. A cache efficiency score (percentage of input tokens served from cache) is displayed prominently with a trend indicator showing whether the rate is improving or declining over time
  2. A GitHub-style activity heatmap renders on the Overview page showing daily usage intensity; hovering a peak day shows a personality-copy annotation (e.g., "47 sessions on March 3 — what were you building?") using local timezone bucketing
  3. Sessions using subagents are flagged with a distinct badge in the session list, and the session detail view breaks out subagent token cost separately from the main-thread session cost
  4. Each session row in the session list displays its associated git branch, and a branch filter dropdown lets users narrow the session list to a specific branch
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Dark Mode & Personality
**Goal**: The application feels distinctive, polished, and on-brand with the "Why, Claude?!" personality throughout every screen
**Depends on**: Phase 7
**Requirements**: CLI-03, PRSL-01
**Success Criteria** (what must be TRUE):
  1. Dark mode activates automatically when the user's system preference is dark, with no flash of the wrong theme on page load
  2. A toggle in the navigation bar lets the user manually switch between light and dark mode; the preference persists across browser sessions via localStorage
  3. Humorous, personality-driven copy appears in stat callouts, empty states, loading states, milestone labels (first $1, first $100), and high-spend moments across all dashboard pages — at least 5 rotating quips per context so repeat visits feel fresh
  4. Personality copy never replaces data labels — humor appears adjacent to data, not in place of it
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

## Progress

**Execution Order:**
Phases execute in this order: 1 -> 2 -> 3 -> 4 -> (5 parallel with 6) -> 7 -> 8
(Phases 5 and 6 can execute in parallel — both depend on Phase 4, not each other)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. JSONL Parser & Data Pipeline | 3/3 | Complete | 2026-02-28 |
| 2. Cost Engine & Privacy | 2/2 | Complete | 2026-02-28 |
| 3. Server, CLI & App Shell | 3/3 | Complete | 2026-02-28 |
| 4. Cost Analytics Dashboard | 0/0 | Not started | - |
| 5. Model & Project Breakdowns | 0/0 | Not started | - |
| 6. Session Explorer | 0/0 | Not started | - |
| 7. Differentiator Features | 0/0 | Not started | - |
| 8. Dark Mode & Personality | 0/0 | Not started | - |
