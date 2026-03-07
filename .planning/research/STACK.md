# Stack Research: v1.2 Multi-Provider Analytics (Cursor, OpenCode, Ollama)

**Project:** yclaude
**Researched:** 2026-03-07
**Milestone:** v1.2 Multi-Provider Analytics
**Confidence:** MEDIUM overall (Cursor schema is community reverse-engineered; OpenCode from DeepWiki source analysis; Ollama confirmed no persistent log)

---

## Existing Stack (Unchanged from v1.1)

All existing dependencies remain. This milestone adds to the stack; it does not replace anything.

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Node.js | >=24.0.0 | Runtime | Existing (`engines` in package.json) |
| TypeScript | 5.9+ | Language | Existing |
| Hono v4 | 4.12+ | HTTP server | Existing |
| React | 19 | Frontend framework | Existing |
| Vite | 7 | Frontend build | Existing |
| Tailwind | v4 | CSS utility framework | Existing |
| tsup | 8.5+ | Server bundle (uses `noExternal: [/.*/]` in prod) | Existing |
| Commander | 14+ | CLI framework | Existing |
| Zod | 4.3+ | Schema validation | Existing |
| TanStack Query | 5.x | API data fetching | Existing |
| Zustand | 5.x | Global state | Existing |
| Recharts | 3.x | Charts | Existing |
| Vitest | 4.x | Testing | Existing |

---

## Provider Data Landscape

### 1. Cursor

**Data format:** SQLite databases (`.vscdb` files) with key-value tables
**Confidence:** MEDIUM -- schema reverse-engineered by community; Cursor does not document internal storage

#### Storage Paths

| Platform | Global Database Path |
|----------|------|
| macOS | `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` |
| Linux | `~/.config/Cursor/User/globalStorage/state.vscdb` |
| Windows | `%APPDATA%\Cursor\User\globalStorage\state.vscdb` |

Workspace-specific data at `<above>/workspaceStorage/<hash>/state.vscdb` per project. The **global** database contains all conversations (can reach 1-25GB).

#### Database Tables

**`cursorDiskKV`** (primary -- Composer/Agent data):
- Schema: `key TEXT, value BLOB` (JSON stored as blob)
- Key patterns:
  - `composerData:<composerId>` -- conversation metadata, ordered bubble list, usage data
  - `bubbleId:<conversationId>:<bubbleId>` -- individual messages (1KB to 500KB+ each)
  - `checkpointId:<conversationId>:<id>` -- file restore points

**`ItemTable`** (legacy chat + settings):
- Schema: `key TEXT PRIMARY KEY, value TEXT`
- Key `workbench.panel.aichat.view.aichat.chatdata` -- older chat conversations (pre-Composer)

#### Available Data Fields

**Conversation level (`composerData:<id>`):**

| Field | Type | Analytics Use |
|-------|------|---------------|
| `composerId` | string | Session identifier |
| `createdAt` | number (ms) | Session start time |
| `lastUpdatedAt` | number (ms) | Session end time |
| `status` | "completed" / "aborted" | Session status |
| `isAgentic` | boolean | Agent mode vs Chat mode |
| `name` | string | Conversation title |
| `usageData` | object | **Cost data: `costInCents` and `amount` per model** |
| `fullConversationHeadersOnly` | array | `{bubbleId, type}` entries -- conversation thread |

**Message level (`bubbleId:<convId>:<bubbleId>`):**

| Field | Type | Analytics Use |
|-------|------|---------------|
| `bubbleId` | string | Message identifier |
| `type` | 1 (user) / 2 (AI) | Message role |
| `text` / `rawText` | string | Conversation content (opt-in only) |
| `thinking` | string | Extended reasoning (AI messages) |
| `tokenCount.inputTokens` | number | **Input token count** |
| `tokenCount.outputTokens` | number | **Output token count** |
| `timingInfo` | object | Start/end timing data |
| `model` | string | **Model identifier** (e.g., "claude-4.5-sonnet", "gpt-4o") |
| `toolFormerData` | object | Tool call information (file edits, terminal) |

#### Data Completeness

| Metric | Available? | Confidence | Notes |
|--------|-----------|------------|-------|
| Conversations | YES | HIGH | Confirmed by multiple independent sources |
| Token counts | YES | MEDIUM | Confirmed by Opik export extension; `tokenCount` field in bubbleId entries |
| Model used | YES | MEDIUM | `model` field in bubble data; one report of missing data in older versions |
| Costs | PARTIAL | MEDIUM | `usageData.costInCents` aggregate per conversation; not per-message |
| Timestamps | YES | HIGH | Millisecond precision in both composer and bubble data |
| Cache tiers | NO | HIGH | Cursor does not expose cache creation/read breakdown |

---

### 2. OpenCode

**Data format:** SQLite database (Drizzle ORM, WAL mode)
**Confidence:** MEDIUM -- schema from DeepWiki source analysis + GitHub issues

#### Storage Path

| Scope | Path |
|-------|------|
| Global default | `~/.local/share/opencode/opencode.db` |
| Per-project (if configured) | `.opencode/opencode.db` in project root |
| Configurable via | `data.directory` in opencode config JSON |

WAL mode means companion files `opencode.db-shm` and `opencode.db-wal` exist alongside.

**Version note:** v1.1.53+ uses SQLite. Older versions used JSON files at `~/.local/share/opencode/storage/{message,part,session}/*.json`. Only target SQLite format.

#### Session Table Schema

| Column | Type | Analytics Use |
|--------|------|---------------|
| `id` | TEXT (ULID) | Session identifier |
| `title` | TEXT | Auto-generated from first message |
| `created_at` | INTEGER (unix) | Session start |
| `updated_at` | INTEGER (unix) | Session end |
| `cost` | REAL (float64) | **Accumulated USD cost (cumulative, survives compaction)** |
| `prompt_tokens` | INTEGER | Input tokens (**resets to 0 on compaction**) |
| `completion_tokens` | INTEGER | Output tokens (**resets to 0 on compaction**) |
| `summary_message_id` | TEXT | Summary reference after compaction |
| `project_id` | TEXT | Project identifier |
| `workspace_id` | TEXT | Workspace identifier |
| `parent_id` | TEXT | Child/subagent sessions |
| `slug` | TEXT | URL-safe identifier |
| `summary_additions` | INTEGER | File diff line stats |
| `summary_deletions` | INTEGER | File diff line stats |

#### Message/Part Tables

- Indexed columns: `id`, `session_id`, `message_id`, `time_created`
- `data` column: **entire message/part as JSON blob** (text, tool calls, compaction markers)

#### Token Accumulation Logic

```
session.prompt_tokens    += input_tokens + cache_creation_tokens
session.completion_tokens += output_tokens + cache_read_tokens
```

**Critical caveat:** Both token fields reset to 0 after compaction (context summarization). Only `cost` is cumulative and reliable for total-session analytics.

#### Data Completeness

| Metric | Available? | Confidence | Notes |
|--------|-----------|------------|-------|
| Sessions | YES | HIGH | Confirmed by multiple sources and GitHub issues |
| Cost | YES | HIGH | `cost` field is cumulative, authoritative |
| Token counts | PARTIAL | MEDIUM | Session-level only; resets on compaction |
| Model used | LIKELY | LOW | Expected in message `data` JSON; exact field name unconfirmed |
| Timestamps | YES | HIGH | Unix timestamps |
| Project | YES | HIGH | `project_id` field |

---

### 3. Ollama

**Data format:** No persistent usage log -- real-time API responses only
**Confidence:** HIGH -- confirmed via official docs and multiple GitHub issues

#### The Core Problem

Ollama does **not** store a history of requests, token usage, or costs. Each API response includes token metrics transiently, but nothing is persisted. The server log is HTTP-level metadata only.

#### Server Log Paths (limited utility -- no token data)

| Platform | Path |
|----------|------|
| macOS | `~/.ollama/logs/server.log` |
| Linux | `journalctl -u ollama` (systemd) or `~/.ollama/logs/server.log` |
| Windows | `%LOCALAPPDATA%\Ollama\logs\server.log` |

Logs contain `[GIN]` HTTP method/status, `[INFO]` model loading, memory allocation. No token counts. Rotates at ~10MB, max 3 files. `OLLAMA_DEBUG=1` logs prompts but not responses.

#### API Response Token Fields (ephemeral)

| Field | Maps To | Notes |
|-------|---------|-------|
| `model` | Model identifier | e.g., "llama3.3:70b", "codestral:latest" |
| `prompt_eval_count` | Input tokens | Known accuracy issues with large prompts |
| `eval_count` | Output tokens | Reliable |
| `total_duration` | Total time (ns) | End-to-end |
| `prompt_eval_duration` | Prompt processing (ns) | |
| `eval_duration` | Generation time (ns) | |

#### Ollama Strategy: Indirect Through Client Tools

**Recommendation:** For v1.2, surface Ollama model usage through the client tools that call it:

1. If user runs Ollama via **OpenCode**, OpenCode's `opencode.db` already has cost/token data
2. If user runs Ollama via **Cursor**, Cursor's `state.vscdb` already tracks it
3. Direct Ollama proxy (yclaude intercepts Ollama API calls) deferred to v1.3+

This avoids building a proxy server while still showing Ollama model names and usage patterns in analytics.

#### Equivalent Cloud Cost Mapping

For the "you saved $X" feature with local models:

| Ollama Model Family | Cloud Equivalent Tier | Approx. $/MTok (in/out) | Rationale |
|---------------------|----------------------|--------------------------|-----------|
| llama3.3:70b | Mid-tier | $3 / $15 | Similar to Sonnet capability |
| codestral:latest | Mid-tier | $3 / $15 | Coding-focused, similar tier |
| qwen2.5:72b | Mid-tier | $2.50 / $10 | Similar to GPT-4o |
| deepseek-r1:70b | Premium | $15 / $75 | Reasoning model, Opus-equivalent |
| llama3.2:7b | Budget | $0.25 / $1.25 | Small model |
| phi-4:14b | Budget | $0.80 / $4 | Mid-small model |

Store as static lookup in `src/providers/ollama/pricing.ts`, clearly labeled "estimated equivalent."

---

## New Dependencies for v1.2

### Decision: Zero New npm Dependencies

| Technology | Version | Purpose | Why This Choice |
|------------|---------|---------|-----------------|
| `node:sqlite` (built-in) | Node 22.5+ | Read Cursor `state.vscdb` and OpenCode `opencode.db` | Zero install friction. No native compilation. No bundle size increase. Synchronous API matches existing parse-at-startup pattern. |

**That is the entire new dependency list.** Nothing else is needed.

### Why `node:sqlite` is the Right Choice

1. **No native addon bundling problem.** The prod tsup config uses `noExternal: [/.*/]` to bundle ALL dependencies for `npx yclaude` cold execution. `better-sqlite3` has native C++ bindings that cannot be bundled this way. `node:sqlite` is a built-in module (like `node:fs`), automatically excluded from bundling.

2. **Zero install friction.** `npx yclaude` must work instantly. Native modules like `better-sqlite3` require prebuild downloads or C compiler, adding latency and failure modes. `node:sqlite` requires nothing.

3. **Synchronous API is fine.** The existing parser blocks the event loop during JSONL reading at startup. SQLite key-value lookups are sub-100ms. No async overhead needed.

4. **Project targets Node >=24.0.0.** `node:sqlite` is available without flags on Node 22.13+. Fully supported.

5. **Read-only mode built in.** `new DatabaseSync(path, { readOnly: true })` -- reads Cursor/OpenCode databases without corruption risk.

**Risk assessment:** `node:sqlite` is Stability 1.1 (Active Development) in Node 22-24, Release Candidate in Node 25. The API surface we use is minimal: `DatabaseSync` constructor, `prepare()`, `get()`/`all()`, `close()`. These are unlikely to break. Isolated behind provider-specific adapters, so migration cost is low if needed.

### What About the `ollama` npm Package?

**Do NOT add it.** The official `ollama` npm package (v0.6.3) is unnecessary:

1. yclaude reads stored data, not makes live API calls
2. For future Ollama API polling, `fetch('http://127.0.0.1:11434/api/tags')` suffices
3. Ollama's REST API is trivial JSON over HTTP -- no SDK needed

---

## Architecture Integration Points

### Provider Adapter Structure

```
src/
  providers/
    types.ts           # ProviderAdapter interface, ProviderEvent type
    registry.ts        # Provider discovery and registration
    claude/            # Existing JSONL parser (refactored from src/parser/)
      reader.ts        # discoverJSONLFiles + streamJSONLFile
      normalizer.ts    # Claude JSONL -> NormalizedEvent
      pricing.ts       # Existing MODEL_PRICING (moved from src/cost/)
    cursor/            # NEW
      reader.ts        # Opens state.vscdb, queries cursorDiskKV
      normalizer.ts    # Cursor bubble data -> NormalizedEvent
      paths.ts         # Platform-specific path detection
    opencode/          # NEW
      reader.ts        # Opens opencode.db, queries session/message tables
      normalizer.ts    # OpenCode session data -> NormalizedEvent
      paths.ts         # XDG/config path detection
    ollama/            # NEW (minimal)
      pricing.ts       # Cloud-equivalent cost mapping
```

### NormalizedEvent Field Mapping

The existing `NormalizedEvent` type (with `.passthrough()`) maps to all providers:

| NormalizedEvent field | Claude Code | Cursor | OpenCode |
|-----------------------|-------------|--------|----------|
| `uuid` | JSONL `uuid` | composerId or bubbleId | session id (ULID) |
| `type` | event type string | "composer" / "bubble" | "session" |
| `timestamp` | ISO 8601 string | ms epoch (convert to ISO) | unix epoch (convert to ISO) |
| `sessionId` | JSONL `sessionId` | composerId | session id |
| `tokens.input` | `usage.input_tokens` | `tokenCount.inputTokens` | `prompt_tokens` |
| `tokens.output` | `usage.output_tokens` | `tokenCount.outputTokens` | `completion_tokens` |
| `tokens.cacheCreation` | `cache_creation_input_tokens` | N/A (set to 0) | N/A (set to 0) |
| `tokens.cacheRead` | `cache_read_input_tokens` | N/A (set to 0) | N/A (set to 0) |
| `model` | `message.model` | bubble `.model` | message data JSON |
| `isSidechain` | JSONL `isSidechain` | N/A | `parent_id != null` |
| `cwd` | JSONL `cwd` | workspace path | `project_id` |

### Cost Engine Extension

Three cost models, one engine:

| Provider | Cost Source | Implementation |
|----------|------------|----------------|
| Claude Code | Computed from tier-reference pricing | Existing `computeCosts()` -- unchanged |
| Cursor | Provider-reported: `usageData.costInCents / 100` | Read directly, wrap in `toEstimatedCost()` |
| OpenCode | Provider-reported: `session.cost` | Read directly, wrap in `toEstimatedCost()` |
| Ollama (via client) | Estimated cloud-equivalent | Apply lookup from `ollama/pricing.ts` |

Add a `costSource` discriminator to `CostEvent`:

```typescript
type CostSource = 'computed' | 'provider-reported' | 'estimated-equivalent';
```

Add a `provider` field to `CostEvent`:

```typescript
type Provider = 'claude' | 'cursor' | 'opencode';
```

### tsup Config Impact

**No changes needed.** `node:sqlite` is a built-in Node module. The `noExternal: [/.*/]` pattern in `tsup.config.prod.ts` only affects npm packages, not built-in modules. Built-in modules are automatically excluded, just like `node:fs`, `node:path`, etc.

### Pricing Table Additions

**For OpenCode models** (OpenCode supports multiple providers):

| Provider | Models to Cover | Source for Pricing |
|----------|----------------|-------------------|
| OpenAI | gpt-4o, gpt-4-turbo, o1, o3-mini | OpenAI pricing page |
| Google | gemini-2.0-flash, gemini-1.5-pro | Google AI pricing |
| Anthropic | Already covered by existing `MODEL_PRICING` | Existing table |
| DeepSeek | deepseek-chat, deepseek-reasoner | DeepSeek pricing page |
| Mistral | codestral, mistral-large | Mistral pricing page |

These go in `src/providers/opencode/pricing.ts`, same tier-reference pattern as existing Claude pricing.

---

## Build Configuration Changes

### tsup (Server Bundle)

No changes needed. `node:sqlite` is handled identically to other `node:*` built-in modules.

### npm Distribution Impact

**Zero impact** on package size or install time. No new dependencies.

### Node.js Version

Current `engines.node` is `>=24.0.0`. `node:sqlite` requires >=22.5.0 (no flag) or >=22.13.0 (no experimental flag). The existing requirement is more than sufficient.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `node:sqlite` | `better-sqlite3` v12.6 | Native C++ addon; breaks `noExternal: [/.*/]` bundling; requires prebuild download or compiler; kills `npx` zero-friction experience |
| `node:sqlite` | `sql.js` v1.12 | Loads entire DB into memory (~1-25GB for large Cursor DBs); adds ~1.4MB WASM to bundle; 3-10x slower than native |
| `node:sqlite` | `sqlite3` (node-sqlite3) | Same native addon issues as better-sqlite3; callback-based async API |
| `node:sqlite` | Drizzle ORM / Prisma | Unnecessary abstraction for 2-3 read-only SELECT queries on external schemas |
| Built-in `fetch()` | `ollama` npm v0.6 | Package adds bundle size for trivial HTTP GET calls; not needed in v1.2 |
| Provider-reported costs | Re-computing Cursor/OpenCode costs | Both tools already compute costs; re-computing requires maintaining their pricing tables |
| Static imports | Plugin loader framework | Only 3-4 providers; static imports are simpler and type-safe |

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `better-sqlite3` | Native C++ addon breaks `noExternal` bundling in tsup prod; `npx` cold start requires prebuild | `node:sqlite` built-in |
| `sql.js` | Loads multi-GB databases into memory; 1.4MB WASM bundle overhead | `node:sqlite` built-in |
| `ollama` npm package | Unnecessary for reading stored data; adds dependencies for zero current value | Built-in `fetch()` if API calls needed later |
| Any ORM (Drizzle, Prisma, Knex) | We only read databases, never write; ORM overhead unjustified for 3 SELECT statements | Raw SQL via `node:sqlite` |
| `@anthropic-ai/sdk`, `openai` SDK | Not calling any APIs; only parsing local files/databases | Direct file/DB parsing |
| `litellm` (Python) | Wrong language ecosystem | Static TypeScript pricing tables |
| `chokidar` / file watchers | Real-time monitoring out of scope for v1.2 | Startup-time data loading |

## Version Compatibility

| Module / Feature | Compatible With | Notes |
|------------------|-----------------|-------|
| `node:sqlite` DatabaseSync | Node 22.5+, 23.x, 24.x, 25.x | No flag needed since 22.13.0; project requires >=24.0.0 |
| `DatabaseSync({ readOnly: true })` | Node 22.5+ | Available since initial `node:sqlite` release |
| tsup `noExternal: [/.*/]` + `node:sqlite` | All versions | Built-in modules auto-excluded from bundling |
| Cursor `state.vscdb` | SQLite 3.x | Standard SQLite; `node:sqlite` handles natively |
| OpenCode `opencode.db` (WAL mode) | SQLite 3.x | `node:sqlite` handles WAL transparently in read-only mode |

---

## Installation Summary

```bash
# v1.2 requires ZERO new npm dependencies for multi-provider support
# node:sqlite is built into Node.js 22.5+

# Verify availability:
node -e "const { DatabaseSync } = require('node:sqlite'); console.log('sqlite OK')"
```

---

## Sources

### Cursor Storage
- [Reverse-engineering Cursor's AI Agent (dev.to)](https://dev.to/vikram_ray/i-reverse-engineered-cursors-ai-agent-heres-everything-it-does-behind-the-scenes-3d0a) -- MEDIUM confidence, community reverse-engineering; detailed cursorDiskKV and ai-tracking schemas
- [Cursor Chat Architecture (dasarpai.com)](https://dasarpai.com/dsblog/cursor-chat-architecture-data-flow-storage/) -- MEDIUM confidence; platform paths, ItemTable schema
- [Cursor Extension for Opik Export (jacquesverre.com)](https://jacquesverre.com/blog/cursor-extension) -- HIGH confidence, **working code** that extracts composerData + bubbleId fields including `tokenCount`, `usageData`, `model`
- [Cursor Data Storage Structure (zread.ai)](https://zread.ai/S2thend/cursor-history/6-cursor-data-storage-structure) -- MEDIUM confidence
- [Cursor Forum: Chat History](https://forum.cursor.com/t/chat-history-folder/7653) -- MEDIUM confidence
- [Cursor Forum: state.vscdb](https://forum.cursor.com/t/questions-about-state-vscdb/47299) -- MEDIUM confidence
- [Cursor Usage & Cost Tracker Extension](https://github.com/Ittipong/cursor-price-tracking) -- MEDIUM confidence; uses Cursor API (not local DB) for real-time tracking

### OpenCode Storage
- [OpenCode GitHub Repository](https://github.com/opencode-ai/opencode) -- HIGH confidence, official
- [OpenCode Session Management (DeepWiki opencode-ai)](https://deepwiki.com/opencode-ai/opencode/5.2-session-management) -- MEDIUM confidence; session schema fields, token accumulation logic
- [OpenCode Session Management (DeepWiki sst)](https://deepwiki.com/sst/opencode/2.1-session-management) -- MEDIUM confidence; Drizzle ORM details, compaction behavior
- [OpenCode SQLite Migration (GitHub issue)](https://github.com/anomalyco/opencode/issues/13202) -- HIGH confidence; confirms `~/.local/share/opencode/opencode.db`
- [OpenCode Database Corruption Issue](https://github.com/anomalyco/opencode/issues/14970) -- HIGH confidence; confirms WAL mode, global database path
- [OpenCode Tokenscope Plugin](https://github.com/ramtinJ95/opencode-tokenscope) -- MEDIUM confidence; working token analysis tool

### Ollama
- [Ollama Usage API Docs](https://docs.ollama.com/api/usage) -- HIGH confidence, official; response field documentation
- [Ollama API Reference (GitHub)](https://github.com/ollama/ollama/blob/main/docs/api.md) -- HIGH confidence, official
- [Ollama Payload Logging Issue #2449](https://github.com/ollama/ollama/issues/2449) -- HIGH confidence; confirms no response logging even with OLLAMA_DEBUG=1
- [Ollama Token Tracking Request #11118](https://github.com/ollama/ollama/issues/11118) -- HIGH confidence; confirms no persistent usage tracking
- [Ollama Server Logs Guide](https://support.tools/ollama-server-logs-guide/) -- MEDIUM confidence; log paths and rotation

### node:sqlite
- [Node.js v25 SQLite Documentation](https://nodejs.org/api/sqlite.html) -- HIGH confidence, official; Release Candidate status
- [Node.js v22 LTS SQLite Documentation](https://nodejs.org/docs/latest-v22.x/api/sqlite.html) -- HIGH confidence, official; Stability 1.1, no flag since 22.13
- [Node 24 Release Notes](https://nodejs.org/en/blog/release/v24.0.0) -- HIGH confidence, official

### Alternatives (evaluated, rejected)
- [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3) -- HIGH confidence; native addon, readonly API
- [better-sqlite3 prebuild issues](https://github.com/WiseLibs/better-sqlite3/issues/1384) -- HIGH confidence; Node 24 compatibility
- [sql.js GitHub](https://github.com/sql-js/sql.js/) -- HIGH confidence; WASM approach, memory requirements

---
*Stack research for: yclaude v1.2 Multi-Provider Analytics*
*Researched: 2026-03-07*
