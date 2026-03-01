# Requirements: yclaude

**Defined:** 2026-02-28
**Milestone:** v1.1 Analytics Completion + Distribution
**Core Value:** Give developers and teams full visibility into their AI coding spend — locally first, with no friction.

## v1.1 Requirements

Requirements for the Analytics Completion + Distribution milestone (Phases 5–9). Each maps to a roadmap phase. Continuing REQ-ID numbering from v1.0 validated requirements.

### Analytics

- [x] **ANLT-04**: User can view estimated cost broken down by model as a donut chart with a companion sortable table
- [x] **ANLT-05**: User can view per-project cost breakdown with human-readable project names derived from directory paths (not raw slugs)
- [ ] **ANLT-07**: User can see a cache efficiency score (% of input tokens from cache) with a trend indicator showing direction over time
- [ ] **ANLT-08**: User can see a GitHub-style activity heatmap on the Overview showing daily usage intensity, with personality-copy annotations on hover
- [ ] **ANLT-09**: User can select a 24h time window on the cost-over-time chart that renders hourly buckets with appropriately labeled x-axis ticks

### Sessions

- [x] **SESS-01**: User can browse a paginated session list sortable by project, model, estimated cost, timestamp, and duration — filterable by project
- [ ] **SESS-02**: User can open a session detail view showing per-turn token breakdown (input / output / cache creation / cache read) and cumulative cost timeline — no conversation text exposed
- [ ] **SESS-03**: User can see subagent sessions flagged distinctly in the session list, with the session detail view breaking out subagent token cost separately from the main-thread cost
- [ ] **SESS-04**: User can see each session's associated git branch in the session list and filter the list to a specific branch via a dropdown

### CLI & Appearance

- [ ] **CLI-03**: User can toggle dark mode manually via a nav bar control; the app also respects system dark mode preference by default; preference persists via localStorage across sessions

### Personality

- [ ] **PRSL-01**: User encounters humorous personality copy in stat callouts, empty states, loading states, milestone labels, and high-spend moments — at least 5 rotating quips per context; copy never replaces data labels

### Distribution

- [ ] **DIST-01**: User (developer) can publish yclaude to npm manually: pre-built web assets bundled, no source maps, correct `main`/`bin`/`files` fields, `.npmignore` excluding dev artifacts, `yclaude` name confirmed available, polished README with install instructions and feature screenshots live on npmjs.com
- [ ] **DIST-02**: Developer can push a git tag and have GitHub Actions automatically run lint, typecheck, tests, build, and `npm publish` — no manual publish steps required for future releases

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Conversations

- **CHAT-01**: User can view conversation messages in a Chats tab, gated behind `--show-messages` opt-in flag for privacy — deferred due to privacy complexity and low priority in v1.x

### Cloud & Teams (v2.0)

- **CLOUD-01**: User can opt in to cloud sync to persist usage data across machines
- **TEAM-01**: Team admin can view aggregated usage across team members
- **BENCH-01**: User can compare their usage patterns against anonymized community benchmarks

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time session monitoring | Different product category (terminal-based like Claude Code Usage Monitor) |
| OpenTelemetry/Prometheus/Grafana | Overkill, different audience |
| Native IDE extensions | Web dashboard first, extensions later |
| Non-Claude-Code local data | Architecture supports multi-tool but only Claude implemented in v1 |
| AI-powered natural language queries | Breaks local-first privacy promise |
| OAuth login / user accounts | v1 is local-only, no auth needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANLT-04 | Phase 5 | Complete |
| ANLT-05 | Phase 5 | Complete |
| SESS-01 | Phase 6 | Complete |
| SESS-02 | Phase 6 | In progress (API done, UI pending) |
| ANLT-07 | Phase 7 | Pending |
| ANLT-08 | Phase 7 | Pending |
| ANLT-09 | Phase 7 | Pending |
| SESS-03 | Phase 7 | Pending |
| SESS-04 | Phase 7 | Pending |
| CLI-03 | Phase 8 | Pending |
| PRSL-01 | Phase 8 | Pending |
| DIST-01 | Phase 9 | Pending |
| DIST-02 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after initial v1.1 definition*
