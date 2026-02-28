# Requirements: yclaude

**Defined:** 2026-02-28
**Core Value:** Give developers full visibility into their AI coding spend — locally first, with no friction — so they can understand, optimize, and eventually benchmark their usage against the world.

## v1 Requirements

Requirements for the local MVP. Each maps to roadmap phases.

### Foundation

- [x] **CORE-01**: User's JSONL data is parsed reliably — per-line error handling, UUID deduplication, handles `<persisted-output>` wrapped lines, detects both `~/.claude` and `~/.config/claude` paths, respects `CLAUDE_CONFIG_DIR` env var
- [x] **CORE-02**: User sees accurate cost estimates — pricing table covers all current Claude models including full cache tier complexity (5-min write 1.25x, 1-hour write 2x, read 0.1x)
- [x] **CORE-03**: User understands costs are estimates — all cost figures labeled "estimated" throughout the UI (upstream token data has documented duplication bugs)
- [ ] **CORE-04**: User's conversation data stays private — server binds to `127.0.0.1` exclusively, zero telemetry, CSP headers blocking external requests, no conversation content displayed anywhere

### Analytics

- [ ] **ANLT-01**: User can see total estimated cost with all-time and selected-period totals at a glance
- [ ] **ANLT-02**: User can see token usage broken down by type (input / output / cache_creation / cache_read)
- [ ] **ANLT-03**: User can view cost over time as a chart with daily / weekly / monthly toggle
- [ ] **ANLT-04**: User can see per-model cost breakdown as a donut chart and sortable table
- [ ] **ANLT-05**: User can see per-project cost breakdown with human-readable decoded directory names
- [ ] **ANLT-06**: User can filter all views by date range with a global date range picker
- [ ] **ANLT-07**: User can see their cache efficiency score — percentage hit rate with trend indicator (unique differentiator; no competitor surfaces this)
- [ ] **ANLT-08**: User can see a GitHub-style activity heatmap of daily usage with personality-copy annotations for notable days

### Sessions

- [ ] **SESS-01**: User can browse all sessions in a sortable, filterable list showing project, model, estimated cost, timestamp, and duration
- [ ] **SESS-02**: User can drill into a session detail view showing full token breakdown per turn and cost timeline (metadata only — no conversation text)
- [ ] **SESS-03**: User can identify sessions that used subagents — sidechain sessions are flagged, subagent token cost shown separately from main session
- [ ] **SESS-04**: User can see which git branch each session occurred on and filter sessions by branch

### CLI & UX

- [ ] **CLI-01**: User can run `npx yclaude` with zero installation and have a browser tab open automatically
- [ ] **CLI-02**: User can customize behavior via `--dir <path>` (custom data dir), `--port <n>`, and `--no-open` flags
- [ ] **CLI-03**: User can toggle dark mode manually; dark mode respects system preference by default

### Personality

- [ ] **PRSL-01**: User encounters humorous copy throughout the app — stat callouts, empty states, loading states, milestone labels, and high-spend moments all have personality-driven copy that reinforces the "Why, Claude?!" brand

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Differentiators (v1.x polish)

- **DIFF-01**: User can see a rolling cost projection line on the cost-over-time chart
- **DIFF-02**: User can see when context compaction occurred in a session and what it cost
- **DIFF-03**: User can see data-driven optimization tips (model selection, session length coaching)
- **DIFF-04**: User can export a shareable snapshot as static HTML (metadata only, no conversation content)
- **DIFF-05**: User can export data as CSV or JSON

### Cloud & Teams

- **CLUD-01**: User can access the dashboard from a hosted web app (yclaude.dev)
- **CLUD-02**: User can upload a ZIP of their local data to the cloud version
- **CLUD-03**: User can optionally grant browser access to local data via File System Access API (Chromium only; upload fallback for Firefox/Safari)
- **CLUD-04**: User can create an account and have their usage history retained beyond local machine
- **CLUD-05**: User can opt in to anonymously contribute usage data for crowdsourced benchmarking
- **TEAM-01**: Team admin can see aggregated cost dashboard across all team members
- **TEAM-02**: Team admin can see per-developer breakdown with individual spend and model usage
- **TEAM-03**: Team admin can set budget alerts and receive Slack/email notifications
- **TEAM-04**: Team member can see their own stats relative to team anonymized averages

### Monetization

- **MONO-01**: User can subscribe to Pro Cloud tier for extended history retention, alerts, and export integrations
- **MONO-02**: Team admin can subscribe to Team tier for multi-user dashboards and RBAC
- **BENCH-01**: User can see anonymized benchmarks — "your spend vs developers with similar project sizes"

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time token streaming monitor | Different product category; competes with Claude Code Usage Monitor on their turf, not yclaude's |
| Conversation content display | Privacy liability; kills any future cloud/team feature roadmap |
| OpenTelemetry/Prometheus/Grafana export | Wrong audience for v1; enterprise-only use case |
| AI-powered natural language queries | Breaks local-first privacy promise; adds LLM dependency |
| Native IDE extensions (v1) | Web dashboard first; extensions add complexity without validating core value |
| Multi-tool support (Cursor, Copilot) in v1 | Architecture supports it; implementation deferred until Claude is validated |
| Budget alerts with push notifications | Requires always-on service; deferred to cloud phase |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1: JSONL Parser & Data Pipeline | Complete (01-01, 01-02, 01-03) |
| CORE-02 | Phase 2: Cost Engine & Privacy | Pending |
| CORE-03 | Phase 2: Cost Engine & Privacy | Pending |
| CORE-04 | Phase 2: Cost Engine & Privacy | Pending |
| ANLT-01 | Phase 4: Cost Analytics Dashboard | Pending |
| ANLT-02 | Phase 4: Cost Analytics Dashboard | Pending |
| ANLT-03 | Phase 4: Cost Analytics Dashboard | Pending |
| ANLT-04 | Phase 5: Model & Project Breakdowns | Pending |
| ANLT-05 | Phase 5: Model & Project Breakdowns | Pending |
| ANLT-06 | Phase 4: Cost Analytics Dashboard | Pending |
| ANLT-07 | Phase 7: Differentiator Features | Pending |
| ANLT-08 | Phase 7: Differentiator Features | Pending |
| SESS-01 | Phase 6: Session Explorer | Pending |
| SESS-02 | Phase 6: Session Explorer | Pending |
| SESS-03 | Phase 7: Differentiator Features | Pending |
| SESS-04 | Phase 7: Differentiator Features | Pending |
| CLI-01 | Phase 3: Server, CLI & App Shell | Pending |
| CLI-02 | Phase 3: Server, CLI & App Shell | Pending |
| CLI-03 | Phase 8: Dark Mode & Personality | Pending |
| PRSL-01 | Phase 8: Dark Mode & Personality | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after 01-01 execution (scaffold + data contracts)*
