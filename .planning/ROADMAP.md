# Roadmap: yclaude

## Overview

yclaude delivers a local-first analytics dashboard for AI coding tool usage. v1.0 shipped the foundation (parser, cost engine, privacy, basic dashboard). v1.1 completed the full Claude Code analytics experience and published to npm. v1.2 expands from Claude Code-only to a universal multi-provider analytics dashboard supporting Cursor and OpenCode alongside existing Claude Code, with provider-tabbed navigation and cross-provider insights.

## Milestones

- ✅ **v1.0 Local MVP** -- Phases 1-4 (shipped 2026-02-28)
- ✅ **v1.1 Analytics Completion + Distribution** -- Phases 5-10 (shipped 2026-03-05)
- :construction: **v1.2 Multi-Provider Analytics** -- Phases 11-14 (in progress)
- :clipboard: **v2.0 Cloud & Teams** -- Phases 15+ (planned)

## Phases

<details>
<summary>v1.0 Local MVP (Phases 1-4) -- SHIPPED 2026-02-28</summary>

- [x] Phase 1: JSONL Parser & Data Pipeline (3/3 plans) -- completed 2026-02-28
- [x] Phase 2: Cost Engine & Privacy (2/2 plans) -- completed 2026-02-28
- [x] Phase 3: Server, CLI & App Shell (3/3 plans) -- completed 2026-02-28
- [x] Phase 4: Cost Analytics Dashboard (3/3 plans) -- completed 2026-02-28

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>v1.1 Analytics Completion + Distribution (Phases 5-10) -- SHIPPED 2026-03-05</summary>

- [x] Phase 5: Model & Project Breakdowns (3/3 plans) -- completed 2026-03-01
- [x] Phase 6: Session Explorer (3/3 plans) -- completed 2026-03-01
- [x] Phase 7: Differentiator Features (4/4 plans) -- completed 2026-03-01
- [x] Phase 8: Dark Mode & Personality (3/3 plans) -- completed 2026-03-01
- [x] Phase 9: npm Distribution & CI/CD (4/4 plans) -- completed 2026-03-01
- [x] Phase 9.1: Cost Accuracy & Pricing Refactor (3/3 plans) -- completed 2026-03-04
- [x] Phase 9.2: Tech Debt Cleanup & Date Range Presets (2/2 plans) -- completed 2026-03-05
- [x] Phase 10: Conversations Viewer (3/3 plans) -- completed 2026-03-05

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

### :construction: v1.2 Multi-Provider Analytics (In Progress)

**Milestone Goal:** Expand yclaude from Claude Code-only to a universal AI coding analytics dashboard -- supporting Cursor, OpenCode, and existing Claude Code with full feature parity where data allows and provider-tabbed navigation.

- [x] **Phase 11: Provider Abstraction Layer** - Unified data model and provider adapter pattern with Claude Code as reference implementation (completed 2026-03-07)
- [x] **Phase 12: Cursor Provider** - Full Cursor analytics from state.vscdb (sessions, costs, agent mode) (completed 2026-03-07)
- [ ] **Phase 13: Multi-Provider API & Dashboard** - Provider-tabbed navigation, API filtering, cross-provider analytics
- [ ] **Phase 14: OpenCode Provider** - Full OpenCode analytics from opencode.db (sessions, costs, code metrics, hierarchy)

## Phase Details

### Phase 11: Provider Abstraction Layer
**Goal**: All AI coding tool data flows through a unified provider interface, with existing Claude Code analytics working identically to v1.1
**Depends on**: Phase 10 (v1.1 complete)
**Requirements**: PROV-01, PROV-02
**Success Criteria** (what must be TRUE):
  1. User runs `npx yclaude` and sees the same Claude Code analytics as v1.1 -- zero regression
  2. User's installed AI tools (Claude Code, Cursor, OpenCode) are auto-detected on startup without any manual configuration
  3. All 174+ existing tests pass against the refactored provider-based code paths
  4. A new provider can be added by implementing a single ProviderAdapter interface without touching existing code
**Plans**: 3 plans

Plans:
- [x] 11-01-PLAN.md -- Provider types, file moves, Claude adapter, registry, stubs
- [x] 11-02-PLAN.md -- Server consumer rewrite (AppState, api.ts, index.ts) + server test migration
- [x] 11-03-PLAN.md -- CLI rewrite with provider banner + parser/cost test migration + new provider tests

### Phase 12: Cursor Provider
**Goal**: Users with Cursor installed can see full session analytics, cost data, and agent mode breakdown from their local state.vscdb
**Depends on**: Phase 11
**Requirements**: CURS-01, CURS-02, CURS-03
**Success Criteria** (what must be TRUE):
  1. User can view a list of Cursor sessions showing tokens, model names, timestamps, and duration extracted from state.vscdb
  2. User can see accurate Cursor cost data pulled from the provider-reported costInCents field, labeled as "provider-reported" (distinct from Claude's "API-estimated")
  3. User can see a breakdown of Cursor agent mode vs manual mode usage with token and cost comparison
  4. Cursor sessions are parsed defensively with schema version detection, handling v3 composerData and gracefully degrading for unknown versions
**Plans**: 2 plans

Plans:
- [x] 12-01-PLAN.md -- Foundation: types, Zod schemas, platform paths, DB access, parser + unit tests
- [x] 12-02-PLAN.md -- Adapter integration: wire CursorAdapter, integration tests, end-to-end verification

### Phase 13: Multi-Provider API & Dashboard
**Goal**: Users can navigate between providers via tabs, filter all data by provider, and see cross-provider analytics showing their total AI coding activity
**Depends on**: Phase 12 (requires 2+ working providers to test properly)
**Requirements**: PROV-03, PROV-04, PROV-05, CROSS-01, CROSS-02, CROSS-03
**Success Criteria** (what must be TRUE):
  1. User can switch between Claude Code, Cursor, and "All Providers" views using tab navigation in the sidebar
  2. User can filter any existing API endpoint by provider via ?provider= query parameter, with no parameter returning all data (backward compatible)
  3. User sees a cross-provider overview page with total spend across all tools and per-provider cost breakdown cards with appropriate cost-source labels
  4. User can compare model usage across providers (e.g., "Sonnet 60% in Claude Code, GPT-4o 80% in Cursor")
  5. User sees a unified activity heatmap showing all AI coding activity across all providers in one calendar view
**Plans**: 4 plans

Plans:
- [ ] 13-01-PLAN.md -- Complete API provider overhaul: ?provider= filtering, /config extension, provider/costSource on session/chat/model rows, providerBreakdown on /summary, per-provider cost-over-time and activity data, sessionType filter
- [ ] 13-02-PLAN.md -- Provider store, color/name helpers, ProviderBadge component, all 14 hooks updated with provider awareness
- [ ] 13-03-PLAN.md -- Sidebar provider tabs, provider-aware navigation, provider badges + cost source badges on Sessions/Chats/Models, session type filter
- [ ] 13-04-PLAN.md -- Cross-provider overview page, stacked area chart, provider cards, heatmap extension, personality copy, CostInfoTooltip

### Phase 14: OpenCode Provider
**Goal**: Users with OpenCode installed can see full session analytics, cost data, code-change metrics, session hierarchy, and multi-provider routing breakdown
**Depends on**: Phase 13 (provider UI infrastructure exists, adapter pattern proven)
**Requirements**: OC-01, OC-02, OC-03, OC-04, OC-05
**Success Criteria** (what must be TRUE):
  1. User can view OpenCode sessions with tokens, models, and timestamps parsed from opencode.db SQLite or legacy JSON files (auto-detected)
  2. User can see OpenCode cost data using pre-calculated cost fields, with token-based estimation as fallback when cost is zero
  3. User can see code-change metrics per OpenCode session showing additions, deletions, and files changed
  4. User can see OpenCode session hierarchy with parent/child relationships showing subagent spawning
  5. User can see which AI providers OpenCode routes to (Anthropic, OpenAI, Google, etc.) with per-provider breakdown
**Plans**: TBD

Plans:
- [ ] 14-01: TBD
- [ ] 14-02: TBD

### :clipboard: v2.0 Cloud & Teams (Planned)

- [ ] Phase 15+: Cloud sync, user accounts, team features (TBD)

## Progress

**Execution Order:**
Phases execute in numeric order: 11 -> 12 -> 13 -> 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. JSONL Parser & Data Pipeline | v1.0 | 3/3 | Complete | 2026-02-28 |
| 2. Cost Engine & Privacy | v1.0 | 2/2 | Complete | 2026-02-28 |
| 3. Server, CLI & App Shell | v1.0 | 3/3 | Complete | 2026-02-28 |
| 4. Cost Analytics Dashboard | v1.0 | 3/3 | Complete | 2026-02-28 |
| 5. Model & Project Breakdowns | v1.1 | 3/3 | Complete | 2026-03-01 |
| 6. Session Explorer | v1.1 | 3/3 | Complete | 2026-03-01 |
| 7. Differentiator Features | v1.1 | 4/4 | Complete | 2026-03-01 |
| 8. Dark Mode & Personality | v1.1 | 3/3 | Complete | 2026-03-01 |
| 9. npm Distribution & CI/CD | v1.1 | 4/4 | Complete | 2026-03-01 |
| 9.1. Cost Accuracy & Pricing Refactor | v1.1 | 3/3 | Complete | 2026-03-04 |
| 9.2. Tech Debt & Date Range Presets | v1.1 | 2/2 | Complete | 2026-03-05 |
| 10. Conversations Viewer | v1.1 | 3/3 | Complete | 2026-03-05 |
| 11. Provider Abstraction Layer | v1.2 | Complete    | 2026-03-07 | 2026-03-07 |
| 12. Cursor Provider | v1.2 | Complete    | 2026-03-07 | 2026-03-07 |
| 13. Multi-Provider API & Dashboard | 1/4 | In Progress|  | - |
| 14. OpenCode Provider | v1.2 | 0/? | Not started | - |
