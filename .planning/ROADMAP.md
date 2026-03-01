# Roadmap: yclaude

## Overview

yclaude delivers a local-first analytics dashboard for Claude Code usage, distributed via `npx yclaude`. v1.0 shipped the foundation (parser, cost engine, privacy, basic dashboard). v1.1 completes the full analytics experience and publishes to npm.

## Milestones

- ✅ **v1.0 Local MVP** — Phases 1–4 (shipped 2026-02-28)
- 🚧 **v1.1 Analytics Completion + Distribution** — Phases 5–9 (in progress)
- 📋 **v2.0 Cloud & Teams** — Phases 10+ (planned)

## Phases

<details>
<summary>✅ v1.0 Local MVP (Phases 1–4) — SHIPPED 2026-02-28</summary>

- [x] Phase 1: JSONL Parser & Data Pipeline (3/3 plans) — completed 2026-02-28
- [x] Phase 2: Cost Engine & Privacy (2/2 plans) — completed 2026-02-28
- [x] Phase 3: Server, CLI & App Shell (3/3 plans) — completed 2026-02-28
- [x] Phase 4: Cost Analytics Dashboard (3/3 plans) — completed 2026-02-28

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Analytics Completion + Distribution (Active)

**Phase Numbering:**
- Integer phases (5, 6, 7…): Planned milestone work
- Decimal phases (5.1, 6.1…): Urgent insertions (marked INSERTED)

- [x] **Phase 5: Model & Project Breakdowns** - Per-model donut chart and table, per-project cost breakdown with decoded directory names
- [ ] **Phase 6: Session Explorer** - Browsable session list with drill-down detail view showing per-turn token breakdown
- [ ] **Phase 7: Differentiator Features** - Cache efficiency score, activity heatmap, sidechain/subagent analysis, git branch filtering, 24h/hourly chart window
- [ ] **Phase 8: Dark Mode & Personality** - System-aware dark mode toggle and humorous personality copy woven throughout all views
- [ ] **Phase 9: npm Distribution & CI/CD** - Manual npm publish (DIST-01) then automated GitHub Actions pipeline on tag push (DIST-02)

## Phase Details

### Phase 5: Model & Project Breakdowns
**Goal**: User can see exactly which models and projects are driving their spend
**Depends on**: Phase 4
**Requirements**: ANLT-04, ANLT-05
**Success Criteria** (what must be TRUE):
  1. A donut chart shows estimated cost broken down by model, with a companion sortable table below it
  2. A per-project cost breakdown page displays human-readable project names derived from the `cwd` path field — not raw directory slugs
  3. Both views respond to the global date range picker: selecting a new range re-fetches and re-renders both pages without a full page reload
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md — Hono API routes: GET /api/v1/models and GET /api/v1/projects with aggregation and project name decoding
- [x] 05-02-PLAN.md — Shared SortableTable<T> component and donut color CSS variables
- [x] 05-03-PLAN.md — useModels/useProjects hooks and Models/Projects page implementations

### Phase 6: Session Explorer
**Goal**: User can browse their sessions and drill into individual session details to understand per-session spend
**Depends on**: Phase 4
**Requirements**: SESS-01, SESS-02
**Success Criteria** (what must be TRUE):
  1. Session list page displays all sessions with project name, model, estimated cost, timestamp, and duration — columns are sortable and the list supports filtering by project
  2. Clicking a session opens a detail view showing full token breakdown per conversation turn (input / output / cache creation / cache read) and a cumulative cost timeline
  3. No conversation text appears anywhere in the session list or detail views — only metadata, token counts, and cost estimates
  4. Session list uses server-side pagination (50 sessions per page) so the UI stays responsive for users with 500+ sessions
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Hono API routes: GET /api/v1/sessions (paginated list) and GET /api/v1/sessions/:id (per-turn detail with cumulative cost)
- [x] 06-02-PLAN.md — useSessions hook and Sessions list page with project filter, pagination, and sortable table
- [ ] 06-03-PLAN.md — useSessionDetail hook, SessionDetail page (summary header + turn table + cumulative cost chart), and App.tsx route registration

### Phase 7: Differentiator Features
**Goal**: User gets insights no competing tool provides — cache efficiency scoring, activity patterns, subagent analysis, git branch context, and intraday spend visibility
**Depends on**: Phase 5, Phase 6
**Requirements**: ANLT-07, ANLT-08, ANLT-09, SESS-03, SESS-04
**Success Criteria** (what must be TRUE):
  1. A cache efficiency score (percentage of input tokens served from cache) is displayed prominently with a trend indicator showing whether the rate is improving or declining over time
  2. A GitHub-style activity heatmap renders on the Overview page showing daily usage intensity; hovering a peak day shows a personality-copy annotation using local timezone bucketing
  3. Sessions using subagents are flagged with a distinct badge in the session list, and the session detail view breaks out subagent token cost separately from the main-thread session cost
  4. Each session row in the session list displays its associated git branch, and a branch filter dropdown lets users narrow the session list to a specific branch
  5. A 24h time window option on the cost-over-time chart renders hourly buckets with adjusted x-axis tick labels
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
  3. Humorous, personality-driven copy appears in stat callouts, empty states, loading states, milestone labels, and high-spend moments — at least 5 rotating quips per context
  4. Personality copy never replaces data labels — humor appears adjacent to data, not in place of it
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: npm Distribution & CI/CD
**Goal**: yclaude is published to npm and future releases ship automatically on tag push
**Depends on**: Phase 8
**Requirements**: DIST-01, DIST-02
**Success Criteria** (what must be TRUE):
  1. `npm publish` from local produces a working tarball: pre-built web assets bundled, no source maps, correct `main`/`bin`/`files` fields, `.npmignore` excluding dev artifacts, `yclaude` name confirmed available
  2. A polished README with install instructions, feature screenshots, and badge is live on npmjs.com
  3. A GitHub Actions workflow runs lint, typecheck, tests, build, and `npm publish` automatically on git tag push — no manual steps required for future releases
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

## Progress

**Execution Order:**
v1.1: 5 → 6 → (parallel with 5 if capacity) → 7 → 8 → 9
(Phases 5 and 6 can execute in parallel — both depend on Phase 4, not each other)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. JSONL Parser & Data Pipeline | v1.0 | 3/3 | Complete | 2026-02-28 |
| 2. Cost Engine & Privacy | v1.0 | 2/2 | Complete | 2026-02-28 |
| 3. Server, CLI & App Shell | v1.0 | 3/3 | Complete | 2026-02-28 |
| 4. Cost Analytics Dashboard | v1.0 | 3/3 | Complete | 2026-02-28 |
| 5. Model & Project Breakdowns | v1.1 | 3/3 | Complete | 2026-03-01 |
| 6. Session Explorer | v1.1 | 2/3 | In progress | - |
| 7. Differentiator Features | v1.1 | 0/TBD | Not started | - |
| 8. Dark Mode & Personality | v1.1 | 0/TBD | Not started | - |
| 9. npm Distribution & CI/CD | v1.1 | 0/TBD | Not started | - |
