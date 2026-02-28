# Project Research Summary

**Project:** yclaude
**Domain:** Local-first AI coding analytics dashboard distributed via npm CLI
**Researched:** 2026-02-28
**Confidence:** HIGH

## Executive Summary

yclaude is a local-first analytics dashboard for Claude Code usage data, distributed as an npm package and launched via `npx yclaude`. Research across all four dimensions confirms this is a well-understood problem domain with a clear technical path: a pre-built React SPA (produced at publish time by Vite) served by a lightweight Hono HTTP server, launched from a Commander-based CLI entrypoint. The primary competitive gap is that no existing tool combines `npx` zero-install simplicity with a full web dashboard — ccusage has the distribution model but is CLI-only, and Claud-ometer has the web dashboard but requires manual git-clone setup. The recommended approach is to build around the CLI-embedded SPA pattern from day one, with strict provider abstraction that prevents a rewrite when adding cloud features later.

The key recommendation from the research is to prioritize breadth over depth in Phase 1: ship the JSONL parser, cost calculator, and all core dashboard views (cost over time, per-model, per-project, session list) as a coherent v1.0. The humorous personality layer is identified as a genuine differentiator that costs almost nothing to implement but makes the tool memorable and shareable — it should be woven through all copy from the start, not bolted on later. Three features stand out as uniquely differentiated against all competitors: cache efficiency scoring, sidechain/subagent analysis, and git branch correlation; these are P2 additions once the core is validated.

The dominant risk across all research is the JSONL format instability: Anthropic treats `~/.claude/projects/**/*.jsonl` as an internal implementation detail, not a public API. The schema has already changed in breaking ways (directory moved in v1.0.30, `<persisted-output>` wrapping causes files to balloon to 12MB+, token usage data has documented duplication bugs). Defensive parsing with per-line error handling, UUID deduplication, and explicit "estimated cost" labeling are non-negotiable for Phase 1. A secondary risk is the pricing table going stale — every Anthropic model launch (roughly quarterly) requires a pricing update, and shipping stale prices immediately erodes user trust.

## Key Findings

### Recommended Stack

The stack is converged and high-confidence across sources. React 19 + Vite 7 + Tailwind CSS 4 + shadcn/ui is the 2026 standard for dashboard UIs; Recharts 3.7 is the right charting library because shadcn/ui's built-in chart components wrap it directly, giving 53 pre-built chart patterns with zero extra dependency cost. Hono 4.12 with `@hono/node-server` is the correct server choice: it is 3.5x faster than Express, 14KB with zero dependencies, and its Web Standards API means the same code runs on Cloudflare Workers for future cloud deployment. tsup 8.5 bundles the CLI; `vite-plugin-singlefile` inlines the entire dashboard into one `index.html` for clean npm distribution.

The critical stack decision is **the CLI-embedded SPA pattern**: the React frontend is built at publish time (`prepublishOnly` script), the resulting `web-dist/` is included in the npm package `files`, and Hono serves it as static assets at runtime. This means `npx yclaude` downloads a complete, self-contained package — no build tools needed at runtime.

**Core technologies:**
- **React 19.2 + Vite 7.3**: UI framework + build tool — first-class Tailwind v4 integration via official Vite plugin; 5x faster builds than Vite 5
- **Hono 4.12**: HTTP server — 14KB, Web Standards API, runs identically on Node.js and Cloudflare Workers; critical for Phase 2 cloud portability
- **Recharts 3.7 + shadcn/ui**: Charts + UI components — shadcn/ui's copy-paste model means zero runtime dependency bloat; Recharts is React-native with composition API
- **Tailwind CSS 4.2**: Styling — zero-config in v4, CSS-only configuration, 100x faster incremental builds than v3
- **Zustand 5**: State management — 1.2KB, centralized store ideal for interconnected filter state (date range, model, project)
- **Commander 14**: CLI arg parsing — 25M+ weekly downloads, battle-tested for `--dir`, `--port`, `--no-open` CLI surface
- **tsup 8.5**: CLI bundler — esbuild-powered, bundles TypeScript CLI into single JS file with all deps inlined
- **TypeScript 5.7 strict mode**: Non-negotiable for a project of this complexity
- **Node.js 22 LTS**: Runtime target — native ESM, minimum for Commander v14

**Stack note:** TanStack Router and TanStack Query are recommended if building cloud features from the start. For Phase 1 local-only, simple `fetch()` + Zustand is sufficient. Add TanStack Query before Phase 2 to handle caching, refetching, and loading states properly.

### Expected Features

All competitors (ccusage, Claud-ometer, Sniffly, Claude Code Usage Monitor) converge on the same set of table-stakes features. The v1.0 MVP is clear: ship these and yclaude is competitive. The differentiators are identified, costed, and ordered by impact-vs-effort.

**Must have (table stakes) — v1.0:**
- Total cost overview with model pricing — every competitor has this; first question every user asks
- Cost over time chart (daily/weekly/monthly toggle) — line/area chart with date grouping
- Per-model breakdown — donut chart + table; data is in `message.model`
- Per-project breakdown — decoded directory names; slug decoding is required
- Session list with metadata drill-down (NO conversation text — privacy)
- Date range filter — applies globally to all views
- Token breakdown (input/output/cache_creation/cache_read) — critical for cost accuracy
- Dark mode with system preference detection
- GitHub-style activity heatmap — Claud-ometer has this; yclaude adds personality annotations
- Cache efficiency score — percentage + trend; NO competitor surfaces this as a first-class metric
- Humorous personality copy — woven through all states; this IS the brand, not a feature
- `npx yclaude` zero-install entrypoint with auto-open browser

**Should have (competitive) — v1.x:**
- Sidechain/subagent analysis — `isSidechain` field exists but no competitor uses it; unique insight
- Git branch correlation — `gitBranch` field exists but no competitor uses it; connects spend to work
- Cost per conversation turn — normalizes cost by interaction, more intuitive than raw tokens
- Smart cost projections — rolling average projection line on cost chart
- Session compaction detection — actionable coaching for power users
- Insights panel — data-driven optimization tips (build last among v1.x features)
- Shareable snapshots — static HTML export of stats (no conversation content)
- CSV/JSON export

**Defer (v2+):**
- Cloud sync (requires infrastructure, auth, privacy framework)
- Crowdsourced benchmarking (requires critical mass of users + cloud)
- Multi-tool support (Cursor, Copilot, Windsurf)
- Team dashboards with per-developer views (SMB monetization gap; Anthropic Console is Enterprise-only)
- Budget alerts with push notifications (requires always-on service)

**Anti-features — do not build in v1:**
- Real-time token streaming monitor (different product category; competes with Usage Monitor on their turf)
- Conversation content display (privacy liability; kills any future cloud/team features)
- OpenTelemetry/Prometheus export (wrong audience for Phase 1)
- AI-powered natural language queries (breaks local-first; adds LLM dependency)

### Architecture Approach

The architecture follows a clean four-layer separation: CLI entry (thin shell, parse args and start server), HTTP server (Hono, serves API routes and pre-built SPA), data layer (DataProvider interface abstracting local file system from future cloud API), and parser layer (JSONL streaming reader + FormatAdapter normalizing tool-specific formats into a canonical NormalizedEvent schema). The data layer abstraction is the most architecturally important decision: server routes call `provider.getProjects()` and never import `fs` directly, which means adding CloudAPIProvider in Phase 2 requires zero changes to routes or frontend.

The recommended project structure uses a single npm package (not a monorepo) with clear folder boundaries: `src/cli/`, `src/server/`, `src/data/`, `src/parser/`, `src/aggregation/`, and `web/` (a separate Vite project that produces pre-built assets). Data flows from JSONL files through FormatAdapter normalization through aggregation into an in-memory cache, then served via Hono API routes to the React SPA. Parse once at startup, serve from cache — never re-parse on each request.

**Major components:**
1. **CLI Entry** (`src/cli/`) — arg parsing, config resolution, browser auto-open; thin shell with near-zero business logic
2. **Hono Server** (`src/server/`) — factory function accepting DataProvider; API routes under `/api/v1/*`; static asset + SPA fallback serving
3. **DataProvider Interface** (`src/data/`) — `LocalFSProvider` for Phase 1, `CloudAPIProvider` for Phase 2; server routes are provider-agnostic
4. **Parser + FormatAdapter** (`src/parser/`) — streaming JSONL reader + `ClaudeCodeAdapter` normalizing to canonical `NormalizedEvent`; adapter pattern means adding Cursor = adding one file
5. **Aggregation Engine** (`src/aggregation/`) — pure functions over normalized events; cost calculation, time bucketing, project/session grouping
6. **React SPA** (`web/`) — pre-built at publish time; Dashboard, Projects, Sessions, SessionDetail views; Recharts + shadcn/ui components
7. **In-Memory Cache** — parsed and aggregated data held in memory for the server lifecycle; optional file-watch for incremental updates

### Critical Pitfalls

Research surfaced six critical pitfalls verified against real ccusage and Claude Code GitHub issues, all requiring Phase 1 attention.

1. **JSONL format is unstable and undocumented** — Parse defensively with optional chaining on every field; detect both `~/.claude` and `~/.config/claude` paths; check `CLAUDE_CONFIG_DIR`; per-line try/catch so one bad line never crashes the parser; build integration tests against a JSONL corpus from multiple Claude Code versions
2. **Token usage data is unreliable** — Deduplicate by `uuid` (same API call appears multiple times in JSONL); flag suspiciously high counts; always label costs as "estimated" in the UI; never claim billing-level accuracy
3. **Pricing table goes stale with every model launch** — Store pricing in a separate versioned JSON file (not hardcoded); handle unknown models by showing tokens without cost (never show $0.00 for non-zero tokens); fuzzy-match date-suffixed model names (e.g., `claude-sonnet-4-20250514` maps to `claude-sonnet-4`); track cache token pricing complexity (1.25x 5-min write, 2x 1-hour write, 0.1x cache read)
4. **npx bundle size and cold start kill first impressions** — Target < 5MB total package size; pre-build frontend at publish time; stream JSONL parsing (never load all files into memory); benchmark cold start in CI (< 10 seconds); show CLI spinner immediately
5. **Privacy violations destroy an analytics tool** — Bind server to `127.0.0.1` exclusively (never `0.0.0.0`); zero telemetry in v1; never display conversation content; add random startup token to URL to prevent cross-origin scraping; CSP headers blocking all external requests
6. **Licensing trap** — Choose MIT for local CLI/parser (maximum adoption) with cloud/team features in a separate proprietary codebase from day one; do not relicense after gaining contributors

## Implications for Roadmap

Based on research, suggested phase structure (4 phases):

### Phase 1: Local MVP — "npx yclaude just works"
**Rationale:** The JSONL parser and pricing table are the foundation of everything. All dashboard features depend on them. The critical pitfalls (format instability, token unreliability, bundle size, privacy) must all be addressed at Phase 1 — they cannot be retrofitted. This phase validates whether the product has any value before investing in cloud infrastructure.
**Delivers:** A fully working local dashboard accessible via `npx yclaude`. Core cost analytics, session browsing, date filtering, and the personality layer that makes it memorable.
**Addresses:**
- JSONL parser with resilient error handling (defensive parsing, per-line try/catch, UUID deduplication)
- Static pricing table for all current Claude models with full cache token complexity
- Cost dashboard — total spend, cost over time (day/week/month), model breakdown donut
- Per-project breakdown with decoded directory names
- Session list + session detail (metadata only, no conversation text)
- Date range filter (global)
- Activity heatmap (GitHub-style)
- Cache efficiency score (first-class metric, unique differentiator)
- Humorous personality copy throughout
- Dark mode (system preference + manual toggle)
- `npx yclaude` entrypoint, auto-open browser, `--port`/`--dir`/`--no-open` flags
**Avoids:**
- Pitfall 1: Parser must handle `<persisted-output>` wrapped lines, schema drift, both config directory paths
- Pitfall 2: UUID deduplication and "estimated" cost labeling from day one
- Pitfall 4: Bundle size CI check, streaming JSONL reader, CLI spinner
- Pitfall 5: Bind to 127.0.0.1, zero telemetry, CSP headers, no conversation content display
- Pitfall 6: License decision and repo structure before first public commit

### Phase 2: v1.x Polish and Differentiators
**Rationale:** Once core analytics are validated by real users, add the features that make yclaude clearly better than alternatives. These all build on the same data foundation but require user feedback to confirm which ones matter most. This phase is ordered by feature dependency: sidechain/git/projections require the same aggregation engine already built; the insights panel requires all other metrics to exist first.
**Delivers:** Features that separate yclaude from every competitor; a product users recommend to teammates.
**Uses:**
- Sidechain/subagent analysis (`isSidechain` + `agentId` fields — unique; no competitor surfaces this)
- Git branch correlation (`gitBranch` field — unique; connects AI spend to actual work)
- Cost per conversation turn metric
- Smart cost projections (rolling average projection line)
- Session compaction detection with coaching messages
- Insights panel (rule engine: model selection optimization, session length advice)
- Shareable snapshots (static HTML export, metadata only, privacy-safe)
- CSV/JSON export
- Pricing auto-update endpoint (`yclaude.dev/api/pricing.json`) to avoid stale pricing pitfall

### Phase 3: Cloud and Teams
**Rationale:** The DataProvider abstraction designed in Phase 1 makes this phase a matter of implementing CloudAPIProvider without touching routes or frontend. This phase requires infrastructure decisions (auth, database, background jobs) and should only start once Phase 1-2 validate product-market fit. The SMB team segment (5-50 developers) is currently unserved — Anthropic's dashboard is Enterprise-only.
**Delivers:** Cloud-hosted dashboard, team analytics, per-developer views, budget visibility.
**Uses:**
- CloudAPIProvider implementing the DataProvider interface (no route changes needed)
- Auth (recommend Clerk or Auth.js — do not build your own)
- PostgreSQL (schema mirrors canonical NormalizedEvent types)
- Background job queue (BullMQ or inngest) for async parsing of uploaded data
- Multi-tool parser support (Cursor, Copilot, Windsurf — adapter per tool)
**Implements:** Cloud deployment architecture (upload-based or File System Access API path; fallback for Firefox/Safari)

### Phase 4: Monetization and Scale
**Rationale:** Crowdsourced benchmarking is the long-term moat but requires critical mass of users and significant infrastructure. Team features with budget alerts require an always-on service. These are deferred until Phase 3 validates the cloud architecture and builds the user base needed to make benchmarking statistically meaningful.
**Delivers:** "Your team spends 2.3x the median" — industry benchmarking, team budget controls, enterprise features (SSO, audit logs, RBAC).
**Note:** Design the canonical data schema in Phase 1 to anticipate the anonymous contribution format needed here. The aggregation schema should not require a rewrite to support opt-in benchmarking.

### Phase Ordering Rationale

- **Parser before features:** Every dashboard feature depends on accurate JSONL parsing. Starting with a shaky parser and adding features on top creates compounding technical debt that is painful to unwind.
- **Privacy before cloud:** Establishing a strong local-first privacy posture in Phase 1 makes the transition to opt-in cloud features in Phase 3 credible. Users who trust the local tool will trust the cloud product.
- **Personality from day one:** The humorous copy is a cross-cutting differentiator. Adding it after features are built means retrofitting every component. It belongs in Phase 1 as a design constraint, not a feature.
- **DataProvider abstraction before cloud:** Implementing the interface in Phase 1 (when LocalFSProvider is the only implementation) costs almost nothing extra. Doing it after Phase 2 requires rewriting every route handler.
- **Single package before monorepo:** Monorepo complexity is not justified until Phase 3+ when genuinely independent packages emerge (shared SDK, cloud service). Single package with clear folder boundaries is sufficient and faster for Phase 1-2.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 — JSONL Parser:** The format instability is the highest-risk area. Before building, audit the ccusage parser as reference implementation and collect a JSONL fixture corpus spanning multiple Claude Code versions (v1.0.30 through v2.1.51+). Research the `<persisted-output>` wrapping behavior and token deduplication edge cases.
- **Phase 3 — Cloud Architecture:** File System Access API has no Firefox/Safari support. The upload-based fallback, auth service choice, database schema design, and background job architecture all warrant dedicated research before Phase 3 planning.
- **Phase 3 — Multi-tool Parsers:** Cursor, Copilot, and Windsurf each have completely different data formats. Each new tool adapter is a small research task (where does it store data? what fields matter?).

Phases with standard patterns (skip research-phase):
- **Phase 1 — React SPA + Hono server:** CLI-embedded SPA is a well-documented pattern. Stack choices are validated with high confidence. Standard Vite + Hono + shadcn/ui setup.
- **Phase 1 — shadcn/ui charts:** 53 pre-built patterns documented on ui.shadcn.com. Recharts composition API is well-documented. No novel integration needed.
- **Phase 2 — v1.x features:** All features in Phase 2 use the same data model built in Phase 1. No new architectural patterns required.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Nearly all sources are official docs or npm registry data. Version compatibility table verified. Only MEDIUM items are a few community blog posts confirming behavior. |
| Features | HIGH | Feature landscape validated against 5 live competitors with real GitHub repositories. Competitor feature table is directly observable. Gaps in competitor coverage are verifiable facts. |
| Architecture | HIGH | Patterns drawn from official Hono docs, Vite docs, Node.js docs. Anti-patterns validated against ccusage architecture decisions. DataProvider pattern is standard OOP; no novel approaches. |
| Pitfalls | HIGH | Every critical pitfall is backed by a specific GitHub issue number (ccusage#866, ccusage#844, anthropics/claude-code#23948, etc.) with real-world reproduction evidence. |

**Overall confidence:** HIGH

### Gaps to Address

- **Exact sub-agent token accounting:** The PITFALLS research flags that sub-agent transcripts are stored separately as `todos/{sessionId}-agent-{agentId}.json`. The exact structure of these files and how their token usage should roll up into session totals needs verification against real data before Phase 1 parser implementation.
- **`<persisted-output>` wrapping behavior:** Files up to 12MB exist due to this wrapping (claude-code#23948). The parser must handle or skip these gracefully, but the exact structure of the wrapping needs to be confirmed against real JSONL samples before writing the parser.
- **Cache token pricing tiers:** Anthropic has both 5-minute and 1-hour cache write tiers with different multipliers (1.25x vs 2x). The JSONL field names for distinguishing these (`cache_creation.ephemeral_5m_input_tokens` vs `ephemeral_1h_input_tokens`) need to be confirmed against current Claude Code JSONL output before coding the cost calculator.
- **File System Access API Phase 3 path:** Confirmed Chromium-only (no Firefox/Safari). Upload-based fallback design for Phase 3 cloud needs to be planned before Phase 3 starts to avoid a UX dead-end for non-Chromium users.

## Sources

### Primary (HIGH confidence)
- [shadcn/ui official chart docs](https://ui.shadcn.com/docs/components/radix/chart) — chart component patterns, Recharts integration
- [Hono official Node.js docs](https://hono.dev/docs/getting-started/nodejs) — server setup, static serving, adapter pattern
- [Vite build docs](https://vite.dev/guide/build) — production build, SPA output
- [React blog v19.2](https://react.dev/blog/2025/10/01/react-19-2) — version status, breaking changes
- [Anthropic Official Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — model pricing, cache multipliers
- [ccusage GitHub](https://github.com/ryoppippi/ccusage) — competitor feature analysis, parser reference, issue tracker
- [Claud-ometer GitHub](https://github.com/deshraj/Claud-ometer) — web dashboard competitor analysis
- [anthropics/claude-code#23948](https://github.com/anthropics/claude-code/issues/23948) — persisted-output JSONL bloat
- [anthropics/claude-code#5904](https://github.com/anthropics/claude-code/issues/5904) — /cost doubling bug
- [anthropics/claude-code#6805](https://github.com/anthropics/claude-code/issues/6805) — stream-JSON token duplication
- [ccusage#866](https://github.com/ryoppippi/ccusage/issues/866) — JSONL token unreliability upstream
- [File System Access API (Chrome docs)](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) — browser FS API, Chromium-only status
- [npm registry](https://www.npmjs.com) — all package version data (Hono 4.12.2, React 19.2.4, Vite 7.3.1, etc.)

### Secondary (MEDIUM confidence)
- [Claud-ometer GitHub](https://github.com/deshraj/Claud-ometer) — dashboard views, tech stack
- [Sniffly GitHub](https://github.com/chiphuyen/sniffly) — error analysis, shareable dashboard pattern
- [Claude Code Usage Monitor GitHub](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor) — real-time monitoring, ML predictions
- [ryoppippi JS CLI stack 2025](https://ryoppippi.com/blog/2025-08-12-my-js-cli-stack-2025-en) — ccusage author's stack rationale
- [TanStack Router vs React Router v7](https://medium.com/ekino-france/tanstack-router-vs-react-router-v7-32dddc4fcd58) — routing library comparison, verified with official docs
- [Zustand vs Jotai 2026](https://inhaq.com/blog/react-state-management-2026-redux-vs-zustand-vs-jotai.html) — state management comparison
- [Chrome 144 Temporal API](https://www.infoq.com/news/2026/02/chrome-temporal-date-api/) — browser Temporal status
- [Claude Code JSONL Gist](https://gist.github.com/samkeen/dc6a9771a78d1ecee7eb9ec1307f1b52) — community-maintained JSONL schema reference

### Tertiary (LOW confidence / needs validation)
- Cache token field names (`ephemeral_5m_input_tokens`, `ephemeral_1h_input_tokens`) — inferred from pricing docs, needs confirmation against real JSONL output
- Sub-agent file structure (`todos/{sessionId}-agent-{agentId}.json`) — referenced in PITFALLS research, needs verification against real Claude Code data directory

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
