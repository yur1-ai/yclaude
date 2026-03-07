# Feature Landscape: v1.2 Multi-Provider Analytics

**Domain:** Multi-provider AI coding analytics dashboard
**Researched:** 2026-03-07
**Milestone:** v1.2 -- Expand from Claude Code-only to Cursor, OpenCode, and Ollama
**Confidence:** MEDIUM (varies by provider -- see Data Availability Matrix)

---

## Context: What v1.1 Already Has

All Claude Code analytics features are complete:
- Overview (cost stats, token breakdown, cost-over-time chart, cache efficiency, activity heatmap, subagent stats)
- Models (donut chart + table)
- Projects (table with decoded names)
- Sessions (paginated list with branch filter + drill-down detail)
- Chats (opt-in conversation viewer with markdown rendering)
- Dark mode, personality copy, tier-reference pricing with info tooltips

The v1.2 milestone adds multi-provider support. Every feature below is about extending the existing dashboard to handle data from multiple AI coding tools.

---

## Provider Data Availability Matrix

Before features: what data actually exists locally for each provider?

| Data Field | Claude Code | Cursor | OpenCode | Ollama |
|------------|-------------|--------|----------|--------|
| **Local data exists** | Yes (JSONL in ~/.claude/) | Yes (SQLite state.vscdb) | Yes (SQLite opencode.db) | No persistent request log |
| **Data confidence** | HIGH (we parse it) | MEDIUM (community reverse-engineered) | MEDIUM (multiple 3rd-party tools confirm) | LOW (no log exists) |
| **Token counts (input)** | Yes | Yes (bubble.tokenCount.inputTokens) | Yes (sessions.PromptTokens, turn_usage.input_tokens) | Per-response only (prompt_eval_count) |
| **Token counts (output)** | Yes | Yes (bubble.tokenCount.outputTokens) | Yes (sessions.CompletionTokens, turn_usage.output_tokens) | Per-response only (eval_count) |
| **Cache tokens** | Yes (5m + 1h tiers) | Unknown/not confirmed | Yes (turn_usage.input_tokens_details JSON has cache_creation, cache_read) | N/A |
| **Model ID** | Yes (per event) | Partial (not reliably in all bubble formats) | Yes (responses.model_id) | Yes (in API response, but not logged) |
| **Cost data** | Calculated from our pricing tiers | Yes (composerData.usageData.costInCents per model) | Yes (sessions.cost, responses.cost -- pre-calculated by OpenCode) | N/A (free local inference) |
| **Session/conversation ID** | Yes (sessionId) | Yes (composerId) | Yes (session UUID) | N/A (no session concept) |
| **Timestamps** | Yes (ISO strings) | Yes (createdAt, lastUpdatedAt, timingInfo) | Yes (CreatedAt, UpdatedAt as int64 Unix) | Per-response only (created_at) |
| **Project association** | Yes (cwd path, directory slug) | Yes (workspaceStorage/<hash>/ per workspace) | Yes (per-project config, directory-based) | N/A |
| **Message content** | Yes (opt-in --show-messages) | Yes (bubble.text, rawText, thinking) | Yes (messages table) | N/A |
| **Subagent/child sessions** | Yes (isSidechain, agentId) | Unknown | Yes (sessions.parent_id for hierarchy) | N/A |
| **Git branch** | Yes (gitBranch field) | No | Unknown/unlikely | N/A |
| **Duration/timing** | Yes (durationMs) | Yes (timingInfo: clientEndTime, clientSettleTime, clientRpcSendTime) | Partial (timestamps only, no per-turn duration) | Yes (total_duration, eval_duration in nanoseconds) |
| **Provider identification** | Implicit (Claude-only tool) | Implicit (Cursor routes to various models) | Yes (responses.provider_id -- Anthropic, OpenAI, Google, etc.) | Implicit (Ollama-only) |
| **File edits tracking** | No | Yes (bubble.toolFormerData, agent edit records) | Yes (summary_additions, summary_deletions, summary_files) | N/A |
| **Request type/mode** | Partial (type field) | Yes (composerData.isAgentic boolean, mode type) | Partial | N/A |
| **Reasoning tokens** | No | Unknown | Yes (turn_usage.output_tokens_details JSON) | No |

**Confidence rationale:**
- **Claude Code (HIGH):** We built the parser. JSONL format is stable. All fields well-understood.
- **Cursor (MEDIUM):** Schema confirmed by 5+ community tools (cursor-view, cursor-conversations-mcp, Cursor extension blog, cursor-db-mcp, HackerNoon usage tracker). But: schema versions change (_v:2 -> _v:3), two+ storage locations, no official spec. Token/cost fields may not be populated in all Cursor versions/plans.
- **OpenCode (MEDIUM):** Schema confirmed by 4+ tools (ccusage/opencode, ocmonitor, opencode-tokenscope, opencode-usage). SQLite via Drizzle ORM. But: schema changed from JSON to SQLite in v1.2, active development may cause further changes, and OpenCode has 100K+ stars with rapid iteration.
- **Ollama (LOW):** No persistent request log. Per-response API metrics exist but are transient. GitHub issues #11118 and #2449 confirm community wants persistent logging but it doesn't exist yet.

---

## Table Stakes (Must Have for v1.2)

Features that justify the "multi-provider" label. Without these, v1.2 is not shippable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **PROV-01: Provider abstraction layer** | Internal architecture requirement. Without this, each provider is a separate codebase. | HIGH | UnifiedEvent type covering all providers, ProviderAdapter interface, provider registry. Refactor existing Claude code to `src/providers/claude/`. |
| **PROV-02: Provider detection** | Auto-detect which tools the user has installed. No manual config. | LOW | Check for `~/.claude/`, Cursor's `state.vscdb` paths, OpenCode's `opencode.db`, Ollama presence. Show only detected providers. |
| **PROV-03: Provider-tabbed navigation** | Users need to see per-provider analytics separately, not everything blended. Mental model is "show me my Cursor usage." | MEDIUM | Tab bar in sidebar or header. Each tab filters all views to one provider. "All Providers" tab for cross-provider totals. |
| **PROV-04: API provider filtering** | All existing API endpoints must support `?provider=` query parameter. | MEDIUM | Additive change to existing routes. No `?provider=` param = all data (backward compatible with v1.1). |
| **CURS-01: Cursor session parsing** | Core Cursor analytics -- read state.vscdb, extract sessions with tokens and models. | HIGH | SQLite reader for state.vscdb, composerData/bubble JSON parsing, schema version detection (_v:2 vs _v:3). Highest-risk parser due to undocumented, changing format. |
| **CURS-02: Cursor cost extraction** | Show actual Cursor costs using `usageData.costInCents` field. | MEDIUM | Direct extraction from composerData JSON. More accurate than re-estimating from tokens since Cursor already calculates cost. |
| **OC-01: OpenCode session parsing** | Core OpenCode analytics -- read opencode.db SQLite or legacy JSON files. | MEDIUM | Dual-mode reader: SQLite for v1.2+ and JSON fallback for older installs. Auto-detect which format is present at `~/.local/share/opencode/`. |
| **OC-02: OpenCode multi-model pricing** | OpenCode uses 8+ providers (Anthropic, OpenAI, Google, Groq, etc.). Must price non-Anthropic models. | MEDIUM | OpenCode pre-calculates cost in sessions.cost and responses.cost. Use those directly rather than maintaining our own pricing for 75+ models. Fall back to LiteLLM pricing data only if pre-calculated cost is missing. |

---

## Differentiators (Features That Win)

These make yclaude the best multi-provider analytics tool, not just one of many.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **OLMA-01: Ollama usage analytics** | No competitor tracks Ollama usage in a web dashboard. Local LLM users have zero visibility into patterns. | HIGH | Requires data collection mechanism (proxy, Open WebUI integration, or log parsing). See Ollama section below for options. |
| **OLMA-02: "You saved $X" calculator** | Unique: "Running llama3 locally saved you ~$47 vs. GPT-4o API pricing." Shareable, memorable. | LOW (once data exists) | Map local models to cloud equivalents (llama3.3 -> GPT-4o pricing, qwen2.5-coder -> Sonnet pricing). Subjective but compelling. |
| **CROSS-01: Cross-provider overview** | "Total across all tools" view with cost breakdown by provider. No web dashboard does this today. | MEDIUM | Aggregate UnifiedEvents across providers. Show total spend, per-provider cards, provider breakdown chart. |
| **CROSS-02: Cross-provider model comparison** | "You used Claude Sonnet for 60% of work in Claude Code but GPT-4o for 80% in OpenCode." Cross-tool insight. | LOW | Group-by model across providers. Reuse existing Models page donut chart + table pattern. |
| **CURS-03: Cursor agent mode analytics** | Surface Cursor's `isAgentic` flag. "Agent mode used 3x more tokens than manual mode." Cursor users care deeply about this. | LOW | Extract from composerData JSON. Simple boolean segmentation. |
| **OC-03: OpenCode code-change metrics** | "OpenCode sessions produced 1,247 additions, 389 deletions across 42 files." Productivity insight unique to OpenCode. | LOW | Direct read from sessions.summary_additions, summary_deletions, summary_files. No computation needed. |
| **OC-04: OpenCode session hierarchy** | Parent/child session trees showing subagent spawning. Mirrors existing Claude sidechain detection. | MEDIUM | sessions.parent_id field. Tree visualization with cost rollup. |
| **OC-05: OpenCode provider breakdown** | "Through OpenCode, you used Anthropic for 60% of requests and OpenAI for 40%." Unique since OpenCode is multi-provider. | LOW | responses.provider_id column. Donut chart + table, same pattern as Models page. |
| **CROSS-03: Unified activity heatmap** | GitHub-style heatmap showing ALL AI coding activity across tools in one calendar. | LOW | Merge timestamp data from all providers into existing heatmap component. |
| **PROV-05: Provider-specific personality copy** | Different humor per tool: "Claude used Opus for 67% of requests. Living dangerously." vs "Cursor burned through $47 in Agent mode." | LOW | Extend existing personality copy system. Provider-aware message selection. |

---

## Anti-Features (Do NOT Build in v1.2)

| Anti-Feature | Why Requested | Why NOT to Build | What to Do Instead |
|--------------|---------------|-------------------|--------------------|
| **Real-time Ollama monitoring** | "Show live token/s and GPU usage while running" | Requires persistent WebSocket connection to Ollama API, polling, continuous process. Different product category (Prometheus/Grafana territory). | Show historical data from collected logs. Optionally show "Current Models Loaded" from Ollama `/api/ps` endpoint as a quick status. |
| **Cursor cloud API integration** | "Pull my team analytics from Cursor's API" | Requires authentication, API keys, team/enterprise subscription. Breaks local-first promise. Admin-only access. | Use local `state.vscdb` which already has `usageData.costInCents` and bubble.tokenCount. No API needed. |
| **OpenCode real-time sync** | "Update dashboard while OpenCode session is running" | Requires file watching, database change detection, partial re-parsing, SSE/WebSocket to frontend. | Startup-time data loading. Manual refresh button. Same pattern as v1.1 Claude support. |
| **Blended session timeline** | "Show ALL AI interactions in one chronological list" | Different tools have fundamentally different session models. Claude sessions span hours, Cursor composers are per-question. Forced unification loses context. | Per-provider tabs with cross-provider summary stats on overview page. |
| **Provider comparison recommendations** | "Tell me which tool is cheapest" | Apples-to-oranges (API pricing vs subscription vs free local). Inherently misleading. | Show data side-by-side. Let users draw conclusions from cost-per-model comparisons. |
| **GitHub Copilot support** | Large user base, natural next provider | Copilot stores no accessible local usage data. Would require GitHub API integration + auth. | Explicitly list as "future" on roadmap. Focus on tools with local data. |
| **Import/export provider data** | "Export to CSV, import from other tools" | Scope creep for v1.2. Export is a thin wrapper over existing API but adds UI surface. | Defer to v1.3. The JSON API already exists for programmatic access. |
| **Cursor tab-completion analytics** | "Show autocomplete acceptance rates" | Tab completion data lives in Cursor's cloud Analytics API (team/enterprise only). Not in local state.vscdb. | Focus on chat/agent/composer sessions which ARE locally available. |
| **Automatic pricing updates** | "Fetch latest model prices from APIs" | Network calls break local-first guarantee. Pricing APIs are unstable or undocumented. | Keep static pricing with PRICING_LAST_UPDATED metadata (existing pattern). Consider LiteLLM pricing as reference for manual updates. |

---

## Per-Provider Data Source Detail

### Cursor Data Sources

**Primary (macOS):** `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` and `~/Library/Application Support/Cursor/User/workspaceStorage/<hash>/state.vscdb`

**Primary (Linux):** `~/.config/Cursor/User/globalStorage/state.vscdb` and `~/.config/Cursor/User/workspaceStorage/<hash>/state.vscdb`

**Emerging (2026+):** `~/.cursor/projects/{project_name}/agent-transcripts`

**Format:** SQLite database with key-value table `cursorDiskKV` (some older versions use `ItemTable`). Keys follow patterns `composerData:<composerId>` for session metadata and `bubbleId:<composerId>:<bubbleId>` for individual messages. Values are JSON blobs.

**Confirmed data fields (MEDIUM confidence -- verified across 5+ community tools):**

Session level (composerData):
- `_v`: 3 (schema version, was v2)
- `composerId`: UUID session identifier
- `createdAt`, `lastUpdatedAt`: timestamps
- `isAgentic`: boolean, Agent mode flag
- `status`: session status
- `usageData`: cost per model with `costInCents` field
- `fullConversationHeadersOnly`: array of bubble references
- `latestConversationSummary`: summary text with truncation markers

Message level (bubbleId entries):
- `_v`: 2 (bubble schema version)
- `bubbleId`: unique message ID
- `type`: 1 (user) or 2 (AI response)
- `text`, `rawText`: message content
- `tokenCount`: object with `inputTokens` and `outputTokens`
- `timingInfo`: `clientEndTime`, `clientSettleTime`, `clientRpcSendTime`
- `toolFormerData`: file edits and tool calls made by agent
- `thinking`: reasoning/thinking content
- `codeBlocks`: code suggestions
- `relevantFiles`, `context`: user-provided context (user bubbles only)

**Key risks:**
- Schema versions change across Cursor updates (_v:2 -> _v:3 already observed)
- Two+ storage locations with different data (globalStorage = sidebar metadata, workspaceStorage = conversation content)
- agent-transcripts is a third format emerging in 2026
- No official local data API; community reverse-engineered
- state.vscdb can grow to 25GB+ (real forum reports); serious performance concern
- usageData.costInCents may not be populated in all Cursor versions or pricing plans

### OpenCode Data Sources

**Primary (v1.2+):** `~/.local/share/opencode/opencode.db` (SQLite via Drizzle ORM)

**Legacy (pre-v1.2):** `~/.local/share/opencode/storage/` (JSON files organized by session/project hash)

**Key tables confirmed (MEDIUM confidence -- verified via ccusage/opencode, ocmonitor, opencode-tokenscope, DeepWiki):**

Sessions table: `id` (UUID), `title`, `cost` (float64 USD pre-calculated), `PromptTokens` (int), `CompletionTokens` (int), `parent_id` (subagent hierarchy), `summary_additions`, `summary_deletions`, `summary_files`, `summary_diffs`, `SummaryMessageID`, `CreatedAt`, `UpdatedAt` (int64 Unix)

Responses table: `id`, `session_id`, `model_id`, `provider_id`, `tokens_input`, `tokens_output`, `cost`, `timestamp`

Turn usage table: `id`, `session_id`, `branch_id`, `user_turn_number`, `requests`, `input_tokens`, `output_tokens`, `total_tokens`, `input_tokens_details` (JSON with cache breakdown), `output_tokens_details` (JSON with reasoning tokens)

Message structure table: `session_id`, `message_id`, `branch_id`, `message_type`, `sequence_number`, `tool_name`

**Key advantages:**
- Cost already calculated by OpenCode per session and per response
- Relational schema is cleaner than Cursor's key-value blobs
- provider_id column enables unique "which AI provider" breakdown
- summary_* fields provide code change metrics for free

**Key risks:**
- Schema changed from JSON to SQLite in v1.2 -- need to handle both or pick one
- Drizzle ORM migrations may change schema between versions
- OpenCode is extremely active (100K+ stars, 700+ contributors) -- rapid evolution

### Ollama Data Sources

**The problem:** Ollama has NO persistent request/usage log. It is a model-serving runtime that returns per-response metrics but does not store them.

What exists:
- `~/.ollama/history`: readline CLI history (user inputs only, no metrics)
- `~/.ollama/models/`: model blob storage (manifests, layers)
- Server logs (macOS: `~/.ollama/logs/server.log`; Linux: journald): unstructured debug output
- Per-response API metrics: `total_duration`, `load_duration`, `prompt_eval_count`, `prompt_eval_duration`, `eval_count`, `eval_duration` (nanoseconds)

**Data collection options (ranked):**

1. **Defer to v1.3 (RECOMMENDED):** Ship v1.2 with Claude + Cursor + OpenCode. Build Ollama support with more context in next milestone.
   - Pros: Ships faster, avoids hardest engineering problem, 3 providers is still a strong v1.2
   - Cons: "4 providers" marketing becomes "3 providers"

2. **Lightweight HTTP proxy:** yclaude ships a proxy that sits between clients and Ollama, logs metrics to JSONL/SQLite.
   - Pros: Complete data capture, transparent to clients
   - Cons: HIGH complexity (5-8 days), requires user config change, always-running process

3. **Open WebUI integration:** Parse Open WebUI's database (popular Ollama frontend).
   - Pros: Many users already have it, rich data already logged
   - Cons: Only captures Open WebUI usage, couples to their schema

---

## Per-Provider Feature Parity Matrix

Not all providers can offer the same features. This matrix drives per-provider dashboard layout decisions.

| Feature | Claude Code | Cursor | OpenCode | Ollama |
|---------|:-----------:|:------:|:--------:|:------:|
| Session list | FULL | FULL | FULL | PARTIAL (if logged) |
| Token breakdown (in/out) | FULL | FULL | FULL | FULL (if logged) |
| Cache token tracking | FULL (5m + 1h tiers) | NONE | PARTIAL (read/write via JSON) | NONE |
| Per-model cost | FULL (our pricing tiers) | FULL (costInCents) | FULL (pre-calculated) | N/A (free) |
| Cost-over-time chart | FULL | FULL | FULL | EQUIVALENT only |
| Activity heatmap | FULL | FULL | FULL | PARTIAL |
| Project breakdown | FULL (cwd path) | FULL (workspace path) | FULL (directory) | NONE |
| Git branch | FULL | NONE | NONE | NONE |
| Subagent/sidechain | FULL | NONE | FULL (parent_id) | NONE |
| Conversation viewer | FULL (opt-in) | POSSIBLE (bubble text) | POSSIBLE (messages) | NONE |
| Cache efficiency score | FULL | NONE | PARTIAL (turn_usage JSON) | NONE |
| Agent mode flag | NONE | FULL (isAgentic) | NONE | NONE |
| Performance (tok/s) | NONE | NONE | NONE | FULL |
| Cloud savings estimate | N/A | N/A | N/A | FULL |
| Code change metrics | NONE | POSSIBLE (toolFormerData) | FULL (summary_* columns) | NONE |
| Multi-provider breakdown | N/A | N/A | FULL (provider_id) | N/A |

**Design implication:** Each provider tab should show features relevant to that provider. Do NOT show empty "Cache Efficiency: N/A" cards. Provider-specific dashboard layouts are better than one-size-fits-all with gaps.

---

## Feature Dependencies

```
PROV-01 (Provider abstraction layer)
  |
  +-- PROV-02 (Provider detection -- auto-discover installed tools)
  |     |
  |     +-- PROV-03 (Provider-tabbed navigation)
  |     +-- PROV-04 (API provider filtering -- ?provider= param)
  |
  +-- CURS-01 (Cursor session parsing)
  |     |
  |     +-- CURS-02 (Cursor cost extraction via usageData.costInCents)
  |     +-- CURS-03 (Agent mode analytics via isAgentic)
  |
  +-- OC-01 (OpenCode session parsing)
  |     |
  |     +-- OC-02 (Multi-model pricing -- use pre-calculated cost)
  |     +-- OC-03 (Code change metrics via summary_* columns)
  |     +-- OC-04 (Session hierarchy via parent_id)
  |     +-- OC-05 (Provider breakdown via responses.provider_id)
  |
  +-- OLMA-01 (Ollama analytics -- DEFERRED to v1.3)
        |
        +-- OLMA-02 (Savings calculator)

CROSS-01 (Cross-provider overview) -- requires PROV-04 + at least 2 providers working
CROSS-02 (Cross-provider model comparison) -- requires PROV-04 + at least 2 providers
CROSS-03 (Unified activity heatmap) -- requires all provider parsers + existing heatmap
PROV-05 (Provider personality copy) -- can be added to any provider after its parser exists
```

**Critical path:** PROV-01 -> (CURS-01 || OC-01 in parallel) -> PROV-03 + PROV-04 -> CROSS-01

**Key dependency notes:**
- PROV-01 is the gating item. Everything depends on the normalized event type and provider interface.
- Existing Claude parser must be refactored to implement the provider interface -- not a rewrite, just a new entry point.
- Cursor and OpenCode parsers are independent and can be developed in parallel.
- Cross-provider features (CROSS-*) come last -- they require at least 2 working providers.
- Ollama blocks on architecture decision (proxy vs integration vs defer). Recommendation: defer.

---

## MVP Feature Set for v1.2

### Must ship (P1):
1. PROV-01: Provider abstraction layer (UnifiedEvent, ProviderAdapter, registry)
2. PROV-02: Provider detection (auto-discover installed tools)
3. PROV-03: Provider-tabbed navigation
4. PROV-04: API provider filtering (?provider= on all endpoints)
5. CURS-01: Cursor session parsing (composerData v3 + bubbles from state.vscdb)
6. CURS-02: Cursor cost extraction (usageData.costInCents)
7. OC-01: OpenCode session parsing (opencode.db SQLite, with JSON fallback)
8. CROSS-01: Cross-provider overview (total spend, provider breakdown)

### Should ship (P2):
9. OC-02: OpenCode multi-model pricing (use pre-calculated cost, LiteLLM fallback)
10. CURS-03: Cursor agent mode analytics
11. OC-03: OpenCode code-change metrics
12. CROSS-02: Cross-provider model comparison
13. CROSS-03: Unified activity heatmap
14. PROV-05: Provider-specific personality copy

### Nice to have (P3):
15. OC-04: OpenCode session hierarchy
16. OC-05: OpenCode provider breakdown
17. OLMA-01: Ollama analytics (DEFERRED -- proxy or Open WebUI integration)
18. OLMA-02: "You saved $X" calculator

### Deferred to v1.3+:
- Ollama full support (data collection mechanism needed)
- Conversation viewer for Cursor/OpenCode
- GitHub Copilot support (no local data available)
- CSV/JSON export per provider
- Provider comparison recommendations
- Cursor tab-completion analytics (enterprise API only)
- Cursor file-edit analytics (complex toolFormerData parsing)

---

## Complexity Estimates

### Parser Development

| Component | Estimated Effort | Key Challenges |
|-----------|-----------------|----------------|
| **Provider data layer (PROV-01)** | 3-4 days | Normalized UnifiedEvent type covering all providers; ProviderAdapter interface; provider registry with discovery; refactor existing Claude pipeline to new interface while keeping existing API backward compatible |
| **Cursor parser (CURS-01+02)** | 4-6 days | Multiple storage locations (globalStorage + workspaceStorage + agent-transcripts); schema version handling (_v:2 vs _v:3); state.vscdb up to 25GB (need streaming/lazy read); key-value pattern matching; workspace hash to project name mapping; robust error handling for missing fields |
| **OpenCode parser (OC-01+02)** | 2-4 days | Cleaner relational SQLite schema; well-documented by community tools; main challenges: dual-mode reader (SQLite + JSON), Drizzle migration compatibility, JSON detail field parsing for cache tokens |
| **Ollama proxy (DEFERRED)** | 5-8 days | No existing data to parse; proxy architecture design; client config burden; storage format design; testing without breaking user setup |

### UI/Frontend

| Component | Estimated Effort | Notes |
|-----------|-----------------|-------|
| Provider tabs + route restructure | 1-2 days | React Router changes, tab bar component, provider context |
| Per-provider dashboard pages | 1-2 days | Mostly reuse existing components with provider filter param |
| Cross-provider overview page | 2-3 days | New aggregation, comparison cards, provider breakdown chart |
| Provider detection UI | 0.5 day | Status indicators, setup hints for missing providers |

### Total MVP Estimate

- Backend (data layer + Cursor parser + OpenCode parser + API changes): 9-14 days
- Frontend (tabs + per-provider pages + overview): 4-7 days
- Testing + integration + edge cases: 3-5 days
- **Total: ~16-26 days of focused development**

---

## Competitive Landscape

| Tool | Providers | Format | Our Advantage |
|------|--------------------|--------|---------------|
| **tokscale** | 16+ (Claude, Cursor, OpenCode, Codex, Gemini, Pi, Amp, etc.) | CLI TUI + web contribution graphs | Web dashboard with deeper per-provider analytics, session drill-down, cross-provider comparison, personality. tokscale is breadth; we are depth + UX. |
| **ccusage ecosystem** | Claude Code, OpenCode, Codex, Pi, Amp (separate npm packages) | CLI tables + JSON | Unified web dashboard, single `npx` command, cross-provider view. ccusage requires separate invocations per provider. |
| **OpenCode Monitor** | OpenCode only | CLI terminal dashboard | Multi-provider support. OpenCode Monitor has real-time session tracking we don't -- but we have historical analysis + web UI. |
| **cursor-view** | Cursor only | Local web app | Full analytics dashboard vs just a chat viewer. cursor-view has no cost/token analytics. |
| **Cursor Usage extension** | Cursor only | VS Code extension | Standalone dashboard, multi-provider. Extension is in-IDE; we're a separate analytics tool. |
| **9Router** | Multi-provider (proxy) | Web dashboard | No proxy needed for Claude/Cursor/OpenCode. We read local data directly. 9Router requires routing ALL requests through it. |
| **Vantage** | Cursor (cloud) | Cloud SaaS | Free, local-first, multi-provider. Vantage requires enterprise subscription + cloud data sharing. |

**Market gap:** No tool provides a unified local-first web dashboard across Claude Code, Cursor, and OpenCode with per-provider analytics depth, session drill-down, and cross-provider comparison. tokscale comes closest in breadth but is CLI-focused. yclaude fills the "polished web dashboard for multi-tool developers" niche.

**What to learn from competitors:**
1. tokscale uses LiteLLM for real-time pricing across providers -- consider for model pricing data.
2. ccusage shows clean session hierarchy for subagents (bold parent, indented children) -- adopt for OpenCode.
3. ccusage validates that separate provider parsers should be modular (@ccusage/opencode pattern).
4. OpenCode Monitor's budget alerts and burn rate are compelling future features.

---

## Sources

### Cursor
- [Cursor Team Analytics Dashboard](https://cursor.com/docs/account/teams/analytics) -- Enterprise team analytics features, dashboard capabilities [HIGH confidence]
- [Cursor Analytics API](https://cursor.com/docs/account/teams/analytics-api) -- API endpoints: agent edits, DAU, model usage, tab completions, MCP adoption [HIGH confidence]
- [Cursor Chat Architecture](https://dasarpai.com/dsblog/cursor-chat-architecture-data-flow-storage/) -- state.vscdb structure, cursorDiskKV table, JSON blob format [MEDIUM confidence]
- [Cursor chat storage forum](https://forum.cursor.com/t/where-are-cursor-chats-stored/77295) -- Storage paths, agent-transcripts [MEDIUM confidence]
- [Cursor extension chat export blog](https://jacquesverre.com/blog/cursor-extension) -- tokenCount, usageData.costInCents, timingInfo fields confirmed [MEDIUM confidence]
- [Cursor Conversations MCP research](https://glama.ai/mcp/servers/@vltansky/cursor-conversations-mcp/) -- ComposerData v3 schema, bubble structure [MEDIUM confidence]
- [cursor-view GitHub](https://github.com/saharmor/cursor-view) -- Local chat viewer, vscdb parsing approach [MEDIUM confidence]
- [state.vscdb 25GB+ bug report](https://forum.cursor.com/t/cursor-state-vscdb-25gb/153661) -- Performance concern [HIGH confidence]
- [Cursor usage tracker (HackerNoon)](https://hackernoon.com/cursors-new-pricing-blew-my-budget-so-i-built-a-usage-tracker) -- Undocumented API + local token discovery [MEDIUM confidence]
- [Cursor CLI Output Format](https://cursor.com/docs/cli/reference/output-format) -- JSON output: duration_ms, session_id, request_id [HIGH confidence]
- [Cursor Agent Trace spec (DeepWiki)](https://deepwiki.com/cursor/agent-trace) -- Code provenance tracking format [MEDIUM confidence]

### OpenCode
- [OpenCode GitHub](https://github.com/opencode-ai/opencode) -- Main repo, providers, SQLite storage [HIGH confidence]
- [OpenCode Session Management (DeepWiki)](https://deepwiki.com/opencode-ai/opencode/5.2-session-management) -- Session schema, cost calculation, token tracking [MEDIUM confidence]
- [ccusage OpenCode CLI](https://ccusage.com/guide/opencode/) -- Data paths, message/session files, supported metrics [MEDIUM confidence]
- [OpenCode Monitor](https://ocmonitor.vercel.app/) -- CLI analytics features, token breakdown, session analysis [MEDIUM confidence]
- [opencode-tokenscope](https://github.com/ramtinJ95/opencode-tokenscope) -- Per-turn token analysis [MEDIUM confidence]
- [opencode-usage (PyPI)](https://pypi.org/project/opencode-usage/) -- Python CLI reading SQLite directly, confirms schema [MEDIUM confidence]
- [OpenCode database plugin](https://github.com/aemr3/opencode-database-plugin) -- PostgreSQL logging plugin confirms data fields [LOW confidence]
- [OpenCode Providers docs](https://opencode.ai/docs/providers/) -- 8+ supported AI providers [HIGH confidence]

### Ollama
- [Ollama Usage API](https://docs.ollama.com/api/usage) -- Per-response metrics format [HIGH confidence]
- [Ollama API docs (GitHub)](https://github.com/ollama/ollama/blob/main/docs/api.md) -- Full API reference [HIGH confidence]
- [Token tracking request #11118](https://github.com/ollama/ollama/issues/11118) -- Confirms persistent tracking does not exist [HIGH confidence]
- [Request logging request #2449](https://github.com/ollama/ollama/issues/2449) -- Confirms no structured request logging [HIGH confidence]
- [Olla Proxy Metrics](https://thushan.github.io/olla/concepts/provider-metrics/) -- Proxy-based metrics extraction pattern [MEDIUM confidence]
- [Open WebUI Analytics](https://docs.openwebui.com/features/access-security/analytics/) -- Token normalization across providers [MEDIUM confidence]
- [Ollama vs OpenAI Cost Analysis](https://markaicode.com/ollama-vs-openai-cost-analysis-enterprise-budget-2025/) -- Cloud cost comparison data [LOW confidence]

### Multi-Provider / Competitors
- [tokscale GitHub](https://github.com/junhoyeo/tokscale) -- 16+ provider CLI, contribution graphs, LiteLLM pricing [HIGH confidence]
- [ccusage GitHub](https://github.com/ryoppippi/ccusage) -- CLI ecosystem: @ccusage/opencode, @ccusage/codex, @ccusage/pi, @ccusage/amp [HIGH confidence]
- [9Router GitHub](https://github.com/decolua/9router) -- Multi-provider proxy with dashboard [MEDIUM confidence]
- [Vantage Cursor Cost Management](https://www.vantage.sh/blog/cursor-cost-management) -- Enterprise cloud cost tracking [HIGH confidence]

---
*Feature research for: yclaude v1.2 Multi-Provider Analytics*
*Researched: 2026-03-07*
*Previous version: v1.0/v1.1 feature research (2026-02-28)*
