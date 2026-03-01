# yclaude

## Current Milestone: v1.1 Analytics Completion + Distribution

**Goal:** Complete the full local analytics experience (model/project breakdowns, session explorer, differentiators, dark mode) and ship to npm with a CI/CD pipeline.

**Target features:**
- Per-model donut chart and per-project cost breakdown with decoded names
- Session explorer with sortable list and drill-down detail view
- Differentiator features: cache efficiency score, activity heatmap, subagent analysis, git branch filtering, 24h/hourly chart window
- Dark mode (system-aware) and humorous personality copy throughout
- npm publish (manual first, then GitHub Actions CI/CD on tag push)

## What This Is

yclaude ("Why, Claude?!") is an open-source analytics dashboard for AI coding tool usage, starting with Claude Code. It reads local data from `~/.claude` and presents beautiful, personality-driven dashboards showing exactly where your tokens went — and why you spent so much on that one Tuesday afternoon. Personal use is free forever; cloud sync and team features are paid.

**Current state (v1.0 shipped):** `npx yclaude` opens a local web dashboard showing estimated AI coding costs with breakdown by token type, a daily/weekly/monthly cost-over-time chart, and a global date range picker — all served from a CSP-hardened 127.0.0.1-only server with no conversation content ever exposed. ~3,017 TypeScript LOC.

## Core Value

Give developers and teams full visibility into their AI coding spend — locally first, with no friction — so they can understand, optimize, and eventually benchmark their usage against the world.

## Requirements

### Validated

- ✓ Parse `~/.claude/projects/**/*.jsonl` reliably — per-line error handling, UUID dedup, multi-path detection, `<persisted-output>` tag handling — v1.0 (CORE-01)
- ✓ Accurate cost estimates covering all current Claude models including full cache tier pricing (5-min 1.25x, 1-hour 2x, read 0.1x) — v1.0 (CORE-02)
- ✓ All cost figures labeled "estimated" everywhere — `EstimatedCost` branded type enforces this at compile time — v1.0 (CORE-03)
- ✓ Server binds to 127.0.0.1 exclusively; CSP blocks all external requests; no conversation content in UI — v1.0 (CORE-04)
- ✓ `npx yclaude` zero-install, auto-opens browser — v1.0 (CLI-01)
- ✓ `--dir`, `--port`, `--no-open` CLI flags — v1.0 (CLI-02)
- ✓ Total estimated cost with all-time and period totals at a glance — v1.0 (ANLT-01)
- ✓ Token usage broken down by type (input / output / cache_creation / cache_read) — v1.0 (ANLT-02)
- ✓ Cost-over-time chart with daily / weekly / monthly toggle — v1.0 (ANLT-03)
- ✓ Global date range picker filtering all views simultaneously — v1.0 (ANLT-06)

### Active

- [ ] Per-model cost breakdown as donut chart + sortable table (ANLT-04) — Phase 5
- [ ] Per-project cost breakdown with decoded human-readable names (ANLT-05) — Phase 5
- [ ] Session list — sortable/filterable, project/model/cost/timestamp/duration (SESS-01) — Phase 6
- [x] Session detail view — per-turn token breakdown and cost timeline, metadata only (SESS-02) — Phase 6
- [ ] Cache efficiency score with trend indicator (ANLT-07) — Phase 7
- [ ] GitHub-style activity heatmap with personality-copy annotations (ANLT-08) — Phase 7
- [ ] 24h time window on cost chart with hourly buckets (ANLT-09) — Phase 7
- [ ] Subagent session flagging with separate subagent cost breakdown (SESS-03) — Phase 7
- [ ] Git branch per session + branch filter dropdown (SESS-04) — Phase 7
- [ ] Dark mode toggle (system-aware + manual + localStorage persist) (CLI-03) — Phase 8
- [ ] Personality copy throughout — stat callouts, empty states, loading states, milestone labels (PRSL-01) — Phase 8
- [ ] npm publish — manual local publish with pre-built assets, .npmignore, README (DIST-01) — Phase 9
- [ ] GitHub Actions CI/CD — auto-publish on tag push (DIST-02) — Phase 9
- [ ] Conversations viewer — Chats tab with `--show-messages` opt-in gating (CHAT-01) — Phase TBD (low priority)

### Out of Scope

- Real-time session monitoring (terminal-based like Claude Code Usage Monitor) — different product category
- OpenTelemetry/Prometheus/Grafana pipelines — overkill, different audience
- Native IDE extensions (v1) — web dashboard first, extensions later
- Non-Claude-Code local data for v1 (architecture supports multi-tool, but only Claude implemented at launch)
- AI-powered natural language queries — breaks local-first privacy promise

## Context

**Data source:** `~/.claude/projects/{project-slug}/*.jsonl`

Each JSONL file contains event records. Relevant types:
- `assistant` — model response with `message.usage` (input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, cache_creation.ephemeral_{5m,1h}_input_tokens), `message.model`, `cwd`, `sessionId`, `timestamp`, `version`, `gitBranch`, `isSidechain`, `agentId`
- `user` — user messages with `cwd`, `sessionId`, `timestamp`, `permissionMode`
- `summary` — session summaries (if present)
- `queue-operation`, `file-history-snapshot`, `progress` — operational, less relevant

**Project slug format:** filesystem path with slashes replaced by dashes (e.g., `/Users/alex/work/myapp` → `-Users-alex-work-myapp`)

**Tech stack (v1.0):**
- Runtime: Node 22, TypeScript ESM, tsup bundler
- Server: Hono v4, Commander CLI
- Frontend: React 19, Vite, Tailwind v4, React Router v7 (hash routing), TanStack Query, Zustand, Recharts
- Testing: Vitest (102+ server tests, 56 parser tests)

**Competitive landscape:**
- **ccusage**: Most popular, CLI-only, no dashboard — primary acquisition competitor
- **Claud-ometer**: Closest web dashboard competitor — beat it on UX + personality
- **Claude Code Usage Monitor**: Terminal UI with predictions — different audience
- **Sniffly**: Python-based, error-focused — different angle
- **Anthropic's enterprise dashboard**: Enterprise-only — we fill the SMB gap
- **Differentiation**: data depth + polished web UI + humorous personality + cloud roadmap + crowdsourced benchmarking

**Distribution model:** npm-first. ccusage proved `npx` works for this audience.

## Constraints

- **Privacy**: All data processing happens locally in v1. No telemetry, no phoning home. Cloud features are explicitly opt-in.
- **Data format**: Tied to Claude Code's JSONL format. Format changes could break parsing — resilient parser is non-negotiable.
- **Pricing data**: Token costs not in JSONL — must be maintained as static lookup, updated when Anthropic changes pricing. Previous issue: ccusage had stale pricing missing `claude-opus-4-6` (Feb 2026).
- **Architecture**: Must be cloud-ready from day 1 (data abstraction layer, auth hooks) even if cloud features ship later.
- **Provider-agnostic**: Data layer must support multiple AI tool formats even if only Claude is implemented in v1.
- **npm registry name**: `yclaude` — verify availability before Phase 9 publish.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local-first, cloud-optional | Trust is essential when handling conversation data; builds audience before asking for data | — Pending |
| Free personal, paid team/cloud | All competitors are free; paid tier targets SMB gap (5-50 devs) that Anthropic ignores | — Pending |
| `npx yclaude` as primary distribution | ccusage proved this works for CLI tool audience; zero friction for trial | ✓ Good — validated in v1.0 |
| Web dashboard over terminal UI | Claud-ometer/Sniffly proved web works; far better UX and sharing story than terminal | ✓ Good — working dashboard shipped |
| Provider-agnostic architecture from day 1 | Prevents painful refactor when adding Cursor/Copilot support; larger market | — Pending |
| Hash routing (createHashRouter) | Works with static file serving, no server catch-all needed | ✓ Good — clean solution |
| API routes before serveStatic in Hono | Static catch-all would block API if registered first | ✓ Good — pattern to follow |
| webDistPath via fileURLToPath(new URL) | Absolute path resolution works correctly from npx dist/server/server.js | ✓ Good — npx verified |
| UTC Date methods throughout bucketing | Local methods cause timezone drift with ISO timestamps | ✓ Good — no timezone bugs |
| Zustand for global date filter (not URL params) | Simpler; URL sync deferred to v1.x | ✓ Good — clean store pattern |
| queryKey uses store values (not new Date()) | Prevents infinite refetch loops | ✓ Good — avoid this footgun |
| Ship v1.0 as Phases 1-4 only (not 1-8) | Phases 5-8 are qualitatively different features; fresh context for v1.1 is more token-efficient | ✓ Good — clean milestone boundary |

---
*Last updated: 2026-02-28 after v1.0 milestone shipped (Phases 1–4)*
