# yclaude

## What This Is

yclaude ("Why, Claude?!") is an open-source analytics dashboard for AI coding tool usage, starting with Claude Code. It reads local data from `~/.claude` and presents beautiful, personality-driven dashboards showing exactly where your tokens went — and why you spent so much on that one Tuesday afternoon. Personal use is free forever; cloud sync and team features are paid.

**Current state (v1.1 shipped):** `npx yclaude` opens a local web dashboard with 7 pages — Overview (cost stats, token breakdown, cost-over-time chart, cache efficiency, activity heatmap, subagent stats), Models (donut chart + table), Projects (table with decoded names), Sessions (paginated list with branch filter + drill-down detail), and Chats (opt-in conversation viewer with markdown rendering). Dark mode, personality copy, tier-reference pricing with info tooltips, 24h/48h hourly chart presets, and automated CI/CD npm publishing. ~8,264 TypeScript LOC. Published as `yclaude` on npm (v0.1.7+).

## Core Value

Give developers and teams full visibility into their AI coding spend — locally first, with no friction — so they can understand, optimize, and eventually benchmark their usage against the world.

## Requirements

### Validated

- ✓ Parse `~/.claude/projects/**/*.jsonl` reliably — per-line error handling, UUID dedup, multi-path detection, `<persisted-output>` tag handling — v1.0 (CORE-01)
- ✓ Accurate cost estimates covering all current Claude models including full cache tier pricing (5-min 1.25x, 1-hour 2x, read 0.1x) — v1.0 (CORE-02)
- ✓ All cost figures labeled "estimated" everywhere — `EstimatedCost` branded type enforces this at compile time — v1.0 (CORE-03)
- ✓ Server binds to 127.0.0.1 exclusively; CSP blocks all external requests; no conversation content in default UI — v1.0 (CORE-04)
- ✓ `npx yclaude` zero-install, auto-opens browser — v1.0 (CLI-01)
- ✓ `--dir`, `--port`, `--no-open` CLI flags — v1.0 (CLI-02)
- ✓ Total estimated cost with all-time and period totals at a glance — v1.0 (ANLT-01)
- ✓ Token usage broken down by type (input / output / cache_creation / cache_read) — v1.0 (ANLT-02)
- ✓ Cost-over-time chart with daily / weekly / monthly toggle — v1.0 (ANLT-03)
- ✓ Global date range picker filtering all views simultaneously — v1.0 (ANLT-06)
- ✓ Per-model cost breakdown as donut chart + sortable table — v1.1 (ANLT-04)
- ✓ Per-project cost breakdown with decoded human-readable names — v1.1 (ANLT-05)
- ✓ Cache efficiency score with trend indicator — v1.1 (ANLT-07)
- ✓ GitHub-style activity heatmap with personality-copy annotations — v1.1 (ANLT-08)
- ✓ 24h time window on cost chart with hourly buckets — v1.1 (ANLT-09)
- ✓ Session list — sortable/filterable by project, model, cost, timestamp, duration — v1.1 (SESS-01)
- ✓ Session detail — per-turn token breakdown and cost timeline, metadata only — v1.1 (SESS-02)
- ✓ Subagent session flagging with separate cost breakdown — v1.1 (SESS-03)
- ✓ Git branch per session + branch filter dropdown — v1.1 (SESS-04)
- ✓ Dark mode toggle (system-aware + manual + localStorage persist) — v1.1 (CLI-03)
- ✓ Personality copy throughout — stat callouts, empty states, loading states, high-spend moments — v1.1 (PRSL-01)
- ✓ npm publish — manual local publish with pre-built assets, .npmignore, README — v1.1 (DIST-01)
- ✓ GitHub Actions CI/CD — auto-publish on tag push — v1.1 (DIST-02)
- ✓ Cost labels accurately communicate API-equivalent pricing with info tooltips — v1.1 (9.1-01)
- ✓ pricing.ts split into tier config + lookup layer with PRICING_LAST_UPDATED metadata — v1.1 (9.1-02)
- ✓ Unknown model IDs produce visible warning on Models page — v1.1 (9.1-03)
- ✓ 174+ tests passing; pricing config structure tests added — v1.1 (9.1-04)
- ✓ Conversations viewer with --show-messages opt-in, markdown rendering, syntax highlighting — v1.1 (CHAT-01)

### Active

- [ ] Cloud sync — opt-in persistence across machines (CLOUD-01)
- [ ] Team admin aggregated usage view (TEAM-01)
- [ ] Community benchmarking — anonymized usage comparison (BENCH-01)

### Out of Scope

- Real-time session monitoring (terminal-based like Claude Code Usage Monitor) — different product category
- OpenTelemetry/Prometheus/Grafana pipelines — overkill, different audience
- Native IDE extensions (v1) — web dashboard first, extensions later
- Non-Claude-Code local data for v1 (architecture supports multi-tool, but only Claude implemented)
- AI-powered natural language queries — breaks local-first privacy promise
- OAuth login / user accounts — local-only through v1.x, no auth needed
- Offline mode — real-time local data access is core value

## Context

**Shipped v1.1** with 8,264 LOC TypeScript across 85 source files.
Tech stack: Node 22, TypeScript ESM, tsup bundler, Hono v4, Commander CLI, React 19, Vite, Tailwind v4, React Router v7 (hash routing), TanStack Query, Zustand, Recharts, react-markdown, react-syntax-highlighter.
174 tests across 14+ test files (Vitest).
Published on npm as `yclaude` with GitHub Actions CI/CD.

**Competitive landscape:**
- **ccusage**: Most popular, CLI-only, no dashboard — primary acquisition competitor
- **Claud-ometer**: Closest web dashboard competitor — beat it on UX + personality
- **Claude Code Usage Monitor**: Terminal UI with predictions — different audience
- **Sniffly**: Python-based, error-focused — different angle
- **Anthropic's enterprise dashboard**: Enterprise-only — we fill the SMB gap
- **Differentiation**: data depth + polished web UI + humorous personality + cloud roadmap + crowdsourced benchmarking

**Known tech debt from v1.1:**
- INT-01: `/api/v1/chats/:id` missing subagent cost split fields (low severity)
- Version label hardcoded in Layout.tsx
- Module-level media listener in useThemeStore.ts references store before full export

## Constraints

- **Privacy**: All data processing happens locally in v1.x. No telemetry, no phoning home. Cloud features are explicitly opt-in.
- **Data format**: Tied to Claude Code's JSONL format. Format changes could break parsing — resilient parser is non-negotiable.
- **Pricing data**: Token costs not in JSONL — maintained as static tier-reference lookup with PRICING_LAST_UPDATED metadata, updated when Anthropic changes pricing.
- **Architecture**: Must be cloud-ready from day 1 (data abstraction layer, auth hooks) even if cloud features ship later.
- **Provider-agnostic**: Data layer must support multiple AI tool formats even if only Claude is implemented in v1.x.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local-first, cloud-optional | Trust is essential when handling conversation data; builds audience before asking for data | — Pending |
| Free personal, paid team/cloud | All competitors are free; paid tier targets SMB gap (5-50 devs) that Anthropic ignores | — Pending |
| `npx yclaude` as primary distribution | ccusage proved this works for CLI tool audience; zero friction for trial | ✓ Good — validated in v1.0, CI/CD in v1.1 |
| Web dashboard over terminal UI | Claud-ometer/Sniffly proved web works; far better UX and sharing story than terminal | ✓ Good — 7-page dashboard shipped |
| Provider-agnostic architecture from day 1 | Prevents painful refactor when adding Cursor/Copilot support; larger market | — Pending |
| Hash routing (createHashRouter) | Works with static file serving, no server catch-all needed | ✓ Good — clean solution through v1.1 |
| UTC Date methods throughout bucketing | Local methods cause timezone drift with ISO timestamps | ✓ Good — no timezone bugs |
| Zustand for global date filter (not URL params) | Simpler; URL sync deferred to v2.x | ✓ Good — clean store pattern |
| All aggregation server-side | Frontend never receives raw CostEvent arrays — prevents prose leakage | ✓ Good — privacy invariant maintained |
| Tier-reference pricing architecture | 7 named tier constants referenced by 19 model IDs — easy to audit and update | ✓ Good — maintainable, PRICING_LAST_UPDATED metadata |
| --show-messages opt-in for conversations | Privacy-first default; server-side 403 enforcement prevents data leakage | ✓ Good — clean separation of metadata vs content |
| tsup prod config with banner require injection | Fixes dynamic require() in CJS packages bundled with noExternal in ESM output | ⚠️ Revisit — fragile workaround |
| Ship v1.0 as Phases 1-4 only | Phases 5-8 are qualitatively different features; fresh context for v1.1 is more token-efficient | ✓ Good — clean milestone boundary |

---
*Last updated: 2026-03-05 after v1.1 milestone*
