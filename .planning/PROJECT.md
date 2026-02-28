# yclaude

## Current Milestone: v1.0 Local MVP

**Goal:** Complete the full local dashboard experience — cost analytics, breakdowns, session explorer, differentiator features, and personality polish

**Target features:**
- Cost analytics dashboard with time-series chart and global date range filtering
- Per-model donut chart and per-project cost breakdowns
- Session explorer with sortable list and drill-down detail view
- Differentiator features: cache efficiency score, activity heatmap, subagent analysis, git branch filtering
- Dark mode (system-aware) and humorous personality copy woven throughout

## What This Is

yclaude ("Why, Claude?!") is an open-source analytics dashboard for AI coding tool usage, starting with Claude Code. It reads local data from `~/.claude` and presents beautiful, personality-driven dashboards showing exactly where your tokens went — and why you spent so much on that one Tuesday afternoon. Personal use is free forever; cloud sync and team features are paid.

## Core Value

Give developers and teams full visibility into their AI coding spend — locally first, with no friction — so they can understand, optimize, and eventually benchmark their usage against the world.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Phase 1 — Local MVP (npx-first):**
- [ ] Parse `~/.claude/projects/**/*.jsonl` to extract token usage, model, session, project, timestamps
- [ ] CLI entrypoint: `npx yclaude` / `yclaude` auto-detects `~/.claude`, supports `--dir` flag for custom path
- [ ] Serve local web dashboard on `localhost:PORT`, auto-open browser
- [ ] Cost dashboard: total spend over time, breakdown by model, daily/weekly/monthly views
- [ ] Project breakdown: cost and token usage per project (decoded from directory slug)
- [ ] Session explorer: list sessions, drill into individual session with message-level detail
- [ ] Filtering: date range, model, project, session
- [ ] Humorous copy woven throughout ("You burned 847K tokens this week. We don't judge. (We judge a little.)")
- [ ] Support `--port` flag and basic CLI options

**Phase 2 — Cloud & Distribution:**
- [ ] Publish to npm registry as `yclaude` (npx + global install both work)
- [ ] Web-deployable version (hosted at yclaude.dev or similar)
- [ ] Data ingestion options for cloud: manual ZIP upload, browser File System Access API for local dir
- [ ] User accounts (auth) for cloud version
- [ ] Cloud history retention (90+ days vs local-only)
- [ ] Optional anonymous data contribution for crowdsourced analytics

**Phase 3 — Multi-tool & Teams:**
- [ ] Provider-agnostic architecture (Claude Code first, Cursor/Copilot/Windsurf later)
- [ ] Team dashboards: multi-user, per-developer breakdowns, spend by project
- [ ] Budget limits and alert notifications (Slack, email)
- [ ] Manager view: team cost overview, top spenders, efficiency metrics
- [ ] Crowdsourced benchmarking: "Your team spends 3x average for similar project size"

**Phase 4 — Monetization & Data Business:**
- [ ] Pro Cloud tier ($9-15/mo): cloud sync, extended retention, alerts, CSV/Notion export
- [ ] Team tier ($15-20/seat/mo): all team features, RBAC, manager views
- [ ] "State of AI Coding" benchmark reports (quarterly, sold to enterprises/VCs)
- [ ] Enterprise tier: SSO, audit logs, custom retention, SLA

### Out of Scope

- Real-time session monitoring (terminal-based like Claude Code Usage Monitor) — different product category
- OpenTelemetry/Prometheus/Grafana pipelines — overkill, different audience
- Native IDE extensions (v1) — web dashboard first, extensions later
- Non-Claude-Code local data for v1 (architecture will support multi-tool, but only Claude implemented at launch)

## Context

**Data source:** `~/.claude/projects/{project-slug}/*.jsonl`

Each JSONL file contains event records. Relevant types:
- `assistant` — model response with `message.usage` (input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, cache_creation.ephemeral_{5m,1h}_input_tokens), `message.model`, `cwd`, `sessionId`, `timestamp`, `version`, `gitBranch`, `isSidechain`, `agentId`
- `user` — user messages with `cwd`, `sessionId`, `timestamp`, `permissionMode`
- `summary` — session summaries (if present)
- `queue-operation`, `file-history-snapshot`, `progress` — operational, less relevant

**Project slug format:** filesystem path with slashes replaced by dashes (e.g., `/Users/alex/work/myapp` → `-Users-alex-work-myapp`)

**Cost calculation:** token counts × model pricing (need to maintain pricing table; cache tokens are cheaper)

**Competitive landscape:**
- **ccusage**: Most popular, CLI-only, no dashboard — our primary acquisition competitor
- **Claud-ometer**: Closest web dashboard competitor — beat it on UX + personality
- **Claude Code Usage Monitor**: Terminal UI with predictions — different audience
- **Sniffly**: Python-based, error-focused — different angle
- **Anthropic's enterprise dashboard**: Enterprise-only — we fill the SMB gap
- **Differentiation**: data depth + polished web UI + humorous personality + cloud roadmap + crowdsourced benchmarking (nobody else has this combination)

**Distribution model:** npm-first. ccusage proved `npx` works for this audience. No install required for trial.

## Constraints

- **Privacy**: All data processing happens locally in v1. No telemetry, no phoning home. Cloud features are explicitly opt-in.
- **Data format**: Tied to Claude Code's JSONL format in `~/.claude`. Format changes in Claude Code could break parsing — need resilient parsing.
- **Pricing data**: Token costs per model are not in the JSONL files — must be maintained as a static lookup table, updated when Anthropic changes pricing.
- **Architecture**: Must be cloud-ready from day 1 (data abstraction layer, auth hooks) even if cloud features ship later.
- **Provider-agnostic**: Data layer must support multiple AI tool formats even if only Claude is implemented in v1.
- **npm registry name**: `yclaude` — verify availability before publishing.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local-first, cloud-optional | Trust is essential when handling conversation data; builds audience before asking for data | — Pending |
| Free personal, paid team/cloud | All competitors are free; paid tier targets SMB gap (5-50 devs) that Anthropic ignores | — Pending |
| `npx yclaude` as primary distribution | ccusage proved this works for CLI tool audience; zero friction for trial | — Pending |
| Web dashboard over terminal UI | Claud-ometer/Sniffly proved web works; far better UX and sharing story than terminal | — Pending |
| Provider-agnostic architecture from day 1 | Prevents painful refactor when adding Cursor/Copilot support; larger market | — Pending |
| Research-first on tech stack | No strong constraint; let best tool for the job win | — Pending |

---
*Last updated: 2026-02-28 after Milestone v1.0 started*
