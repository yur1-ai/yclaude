# Architecture Research: Multi-Provider Analytics Integration

**Domain:** Multi-provider AI coding analytics — extending local-first dashboard from Claude Code-only to Cursor, OpenCode, and Ollama
**Researched:** 2026-03-07
**Milestone:** v1.2 Multi-Provider Analytics
**Confidence:** MEDIUM-HIGH (existing codebase: HIGH; provider data formats: MEDIUM — some formats are undocumented or unstable)

---

## Current Architecture Baseline (v1.1, Verified from Source)

```
src/
  parser/
    types.ts          -- NormalizedEvent (uuid, type, timestamp, sessionId, tokens, model, ...)
    reader.ts          -- discoverJSONLFiles(), streamJSONLFile() -- Claude-specific JSONL
    normalizer.ts      -- normalizeEvent() -- Claude-specific field extraction
    dedup.ts           -- DedupAccumulator (first-seen-wins by UUID)
    schema.ts          -- Zod schema
  cost/
    types.ts           -- EstimatedCost branded type, CostEvent = NormalizedEvent + costUsd
    engine.ts          -- computeCosts(NormalizedEvent[]) -> CostEvent[]
    pricing.ts         -- MODEL_PRICING: 7 tiers, 19 model IDs, Claude-only
    privacy.ts         -- applyPrivacyFilter() strips message/content/text fields
  server/
    server.ts          -- createApp(AppState) factory; AppState = {events, costs, rawEvents?, showMessages?}
    routes/api.ts      -- /api/v1/* (summary, cost-over-time, models, projects, sessions, chats, etc.)
    cli.ts             -- Commander CLI; loads data pipeline, calls createApp(), serve()
  shared/
    debug.ts           -- debugLog()
  index.ts             -- parseAll() public API, re-exports

web/src/
  App.tsx              -- HashRouter with 7 routes
  pages/               -- Overview, Models, Projects, Sessions, SessionDetail, Chats, ChatDetail
  components/          -- 18 components (charts, cards, layout)
  hooks/               -- 13 TanStack Query hooks
  store/               -- useDateRangeStore, useThemeStore (Zustand)
  lib/                 -- quips, contentPreprocessor
```

**Key architectural constraints from v1.1:**
- Data loaded once at startup: `parseAll()` -> `applyPrivacyFilter()` -> `computeCosts()` -> `createApp()`
- All aggregation is server-side. Frontend never receives raw event arrays.
- `CostEvent` is the universal currency — every API endpoint consumes `CostEvent[]`.
- Privacy boundary is explicit: `applyPrivacyFilter()` strips content before cost engine.
- `NormalizedEvent` uses Zod `.passthrough()` — unknown fields are preserved.

**The core problem:** Every module from `reader.ts` through `pricing.ts` is Claude Code-specific. The types (`NormalizedEvent`, `CostEvent`) encode Claude-specific assumptions (JSONL source, cache tier tokens, Anthropic model IDs). To add providers, we need an abstraction layer that preserves the existing pipeline for Claude while enabling new providers to produce compatible data.

---

## Recommended Architecture: Provider Adapter Pattern

### System Overview

```
                         ┌─────────────────────────────────────────┐
                         │            CLI Entry Point              │
                         │  src/server/cli.ts (orchestrates all)   │
                         └──────────────┬──────────────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
    ┌─────────▼──────────┐  ┌──────────▼─────────┐  ┌───────────▼──────────┐
    │  Claude Provider   │  │  Cursor Provider   │  │  OpenCode Provider   │
    │  src/providers/    │  │  src/providers/     │  │  src/providers/      │
    │  claude/           │  │  cursor/            │  │  opencode/           │
    │                    │  │                     │  │                      │
    │  reader.ts (JSONL) │  │  reader.ts (SQLite) │  │  reader.ts (SQLite/  │
    │  normalizer.ts     │  │  normalizer.ts      │  │    JSON)             │
    │  pricing.ts        │  │  pricing.ts         │  │  normalizer.ts       │
    │  dedup.ts          │  │  dedup.ts           │  │  pricing.ts          │
    └─────────┬──────────┘  └──────────┬──────────┘  └───────────┬──────────┘
              │                        │                          │
              │    UnifiedEvent[]      │   UnifiedEvent[]         │  UnifiedEvent[]
              └────────────┬───────────┘──────────────────────────┘
                           │
                ┌──────────▼──────────────┐
                │   Cost Engine           │
                │   src/cost/engine.ts    │
                │   (per-provider pricing │
                │    dispatch)            │
                └──────────┬──────────────┘
                           │  CostEvent[]
                ┌──────────▼──────────────┐
                │   AppState Builder      │
                │   Groups by provider,   │
                │   builds per-provider   │
                │   + cross-provider      │
                │   aggregations          │
                └──────────┬──────────────┘
                           │
                ┌──────────▼──────────────┐
                │   Hono API Server       │
                │   /api/v1/*             │
                │   ?provider= filter     │
                └──────────┬──────────────┘
                           │
                ┌──────────▼──────────────┐
                │   React SPA             │
                │   Provider tabs +       │
                │   per-provider views    │
                └─────────────────────────┘
```

### Why Adapter Pattern, Not Plugin Architecture

A plugin architecture (dynamic discovery, runtime registration, hot-loading) is overkill for 3-4 known providers. The adapter pattern gives us:

1. **Compile-time safety** -- each provider is a known import, not a dynamic lookup.
2. **No plugin manifest / loader complexity** -- just add a provider directory and wire it in `cli.ts`.
3. **Testability** -- each provider adapter is a pure module with its own test suite.
4. **Incremental** -- add one provider at a time without touching others.

Use the adapter pattern now. If the project ever needs 10+ providers or third-party contributions, upgrade to a plugin registry then. (YAGNI applies.)

---

## Unified Data Model

### The Core Decision: Extend NormalizedEvent vs. New Type

**Decision: Create `UnifiedEvent` that extends `NormalizedEvent` with a `provider` discriminant field.**

Rationale:
- `NormalizedEvent` already has `.passthrough()` in its Zod schema, preserving unknown fields.
- Adding `provider: 'claude' | 'cursor' | 'opencode' | 'ollama'` as a required field enables provider-aware filtering without breaking existing code.
- `CostEvent` = `UnifiedEvent + costUsd + unknownModel?` -- same as today, just the input type changes.
- Existing Claude pipeline continues to work unmodified; it just adds `provider: 'claude'` to each event.

### UnifiedEvent Type

```typescript
// src/providers/types.ts

/** Provider identifiers -- exhaustive enum for compile-time safety */
export type ProviderId = 'claude' | 'cursor' | 'opencode' | 'ollama';

/**
 * Universal event type across all providers.
 * Extends NormalizedEvent with provider discrimination and optional
 * provider-specific metadata in a typed extension bag.
 */
export interface UnifiedEvent {
  // === Universal fields (all providers MUST supply) ===
  provider: ProviderId;
  uuid: string;               // unique event ID (provider-native ID or generated)
  type: string;               // 'user' | 'assistant' | 'system' | 'tool_use' etc.
  timestamp: string;          // ISO 8601
  sessionId: string;          // provider-native session/conversation ID

  // === Token data (optional -- not all events have tokens) ===
  tokens?: {
    input: number;
    output: number;
    // Claude-specific cache fields -- zero for other providers
    cacheCreation: number;
    cacheRead: number;
    cacheCreation5m: number;
    cacheCreation1h: number;
    // OpenCode/Cursor may add reasoning tokens here
    reasoning?: number;
  };

  // === Model info ===
  model?: string;              // exact model ID as reported by provider

  // === Session metadata (optional) ===
  requestId?: string;
  isSidechain?: boolean;
  agentId?: string;
  gitBranch?: string;
  cwd?: string;               // project directory
  durationMs?: number;

  // === Provider-specific extension bag ===
  // Typed per-provider metadata that doesn't fit universal fields.
  // This replaces the untyped passthrough approach.
  providerMeta?: Record<string, unknown>;
}
```

### Field Mapping by Provider

| Universal Field | Claude Code | Cursor | OpenCode | Ollama |
|----------------|-------------|--------|----------|--------|
| `uuid` | JSONL `uuid` field | Generated from bubbleId | Message file `id` | Generated (no native ID) |
| `type` | `type` field (user/assistant) | bubble `type` (1=user, 2=AI) | Message `role` | 'assistant' (generate only) |
| `timestamp` | ISO timestamp from JSONL | `createdAt` (ms epoch -> ISO) | `time_created` field | `created_at` from API response |
| `sessionId` | `sessionId` field | `composerId` | Session directory ID | Generated per-run or model name |
| `tokens.input` | `usage.input_tokens` | `tokenCount.inputTokens` | Message `tokens.input` | `prompt_eval_count` |
| `tokens.output` | `usage.output_tokens` | `tokenCount.outputTokens` | Message `tokens.output` | `eval_count` |
| `tokens.cacheCreation` | `usage.cache_creation_input_tokens` | 0 (not tracked) | `tokens.cache.write` | 0 (not applicable) |
| `tokens.cacheRead` | `usage.cache_read_input_tokens` | 0 (not tracked) | `tokens.cache.read` | 0 (not applicable) |
| `model` | `message.model` | From composerData or bubble | Message `modelID` | `model` field |
| `cwd` | `cwd` field in JSONL | Workspace path from workspaceStorage | Session `directory` field | N/A (use CLI cwd) |
| `gitBranch` | `gitBranch` field | N/A | N/A | N/A |
| `durationMs` | `durationMs` field | `timingInfo` delta | Computed from timestamps | `total_duration` (ns -> ms) |

**Confidence levels for field mapping:**
- Claude: HIGH (read from source code, well-documented JSONL format)
- Cursor: MEDIUM (state.vscdb schema is undocumented, reverse-engineered from community articles and forum posts; schema changes between Cursor versions)
- OpenCode: MEDIUM (SQLite schema at `~/.local/share/opencode/opencode.db` documented by third-party tools; ccusage and OpenCode Monitor provide reference implementations)
- Ollama: MEDIUM-LOW (per-request metrics only; no persistent history -- Ollama does NOT store conversation logs or cumulative usage)

---

## Provider Data Sources -- Detailed Format Analysis

### Claude Code (Existing -- HIGH confidence)

**Source:** `~/.claude/projects/**/*.jsonl`
**Format:** JSONL (one JSON object per line)
**Schema stability:** Stable; Anthropic adds fields but does not remove/rename them
**Reader:** Streaming readline, per-line error handling, already built

No changes needed for Claude. The existing `src/parser/` code moves to `src/providers/claude/` and gains `provider: 'claude'` on output.

### Cursor (MEDIUM confidence)

**Source:** SQLite databases at platform-specific paths:
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`
- Linux: `~/.config/Cursor/User/globalStorage/state.vscdb`
- Windows: `%APPDATA%\Cursor\User\globalStorage\state.vscdb`

**Format:** SQLite `ItemTable` with TEXT key-value pairs:
- Key pattern: `composerData:<composerId>` -- conversation metadata JSON
- Key pattern: `bubbleId:<composerId>:<bubbleId>` -- individual message JSON

**Key data available:**
- `composerData._v`: Schema version (currently 3)
- `composerData.createdAt` / `lastUpdatedAt`: Timestamps (ms epoch)
- `composerData.usageData`: Dict of `{ [model]: { costInCents, amount } }` -- actual cost tracking
- `composerData.isAgentic`: Boolean for Agent mode
- `composerData.name`: Conversation title
- Bubble `tokenCount`: `{ inputTokens, outputTokens }`
- Bubble `timingInfo`: Start/end timing
- Bubble `type`: 1 (user), 2 (AI)
- Bubble `model`: Model used for this response

**Critical risks:**
1. Schema is undocumented and changes between Cursor versions (`_v` field tracks this)
2. `state.vscdb` can grow to 25GB+ (must use streaming SQLite queries, not load into memory)
3. `usageData.costInCents` provides Cursor's own cost calculation -- we can use this directly instead of recalculating
4. No npm SQLite library is currently in the stack -- must add `better-sqlite3` or `sql.js`

**Reader approach:** Use `better-sqlite3` (synchronous, fast, no WASM overhead) to query `ItemTable` WHERE key LIKE 'composerData:%'. Parse JSON values. Extract session + message data. Map to UnifiedEvent[].

### OpenCode (MEDIUM confidence)

**Source:** SQLite database OR legacy JSON files:
- SQLite (v1.2+): `~/.local/share/opencode/opencode.db`
- Legacy JSON: `~/.local/share/opencode/storage/message/{sessionID}/msg_{messageID}.json`
- Session JSON: `~/.local/share/opencode/storage/session/{projectHash}/{sessionID}.json`
- Custom path via `OPENCODE_DATA_DIR` env var

**Format (SQLite):** Tables for sessions and messages:
- Session table: `id`, `slug`, `projectID`, `directory`, `title`, `version`, `summary_*`, timestamps
- Message/Part tables: `id`, `session_id`, `message_id`, `time_created`, `data` (JSON blob)
- Messages contain: `role`, `modelID`, `providerID`, token counts (input, output, reasoning, cache read/write)

**Format (Legacy JSON):** Message files at `storage/message/{sessionID}/msg_{messageID}.json` containing:
- Token counts: `tokens.input`, `tokens.output`, `tokens.cache.read`, `tokens.cache.write`
- Model info: `modelID`
- Cost field: `cost: 0` (OpenCode stores zero -- costs must be calculated from tokens)

**Reader approach:** Auto-detect SQLite vs legacy format. For SQLite, query message table and parse `data` JSON blobs. For legacy, glob `storage/message/**/*.json` and parse each file. Both produce UnifiedEvent[].

**Key difference from Claude:** OpenCode supports 75+ providers (OpenAI, Anthropic, Google, Azure, Ollama, etc.). Model IDs may be from any provider. The pricing engine must handle non-Anthropic models.

### Ollama (LOW-MEDIUM confidence)

**Source:** No persistent usage data. Ollama does NOT store conversation history, token counts, or usage metrics across sessions.

**What exists:**
- Per-request API response metrics: `prompt_eval_count`, `eval_count`, `total_duration`, etc.
- Server logs at `~/.ollama/logs/server.log` (unstructured, debug-level)
- Prometheus metrics at `http://localhost:11434/api/metrics` (real-time only, not historical)
- CLI history at `~/.ollama/history` (readline history, not structured data)

**This is a fundamental constraint.** Unlike Claude and Cursor which have rich local data stores, Ollama has no historical usage data to read.

**Two realistic approaches:**

1. **Log parser (fragile, partial data):** Parse `~/.ollama/logs/server.log` for lines containing model name, token counts, and timing. This is fragile because: log format is not documented, logs rotate at ~10MB, and logs only exist when Ollama is run as a service.

2. **Proxy/interceptor approach (better but requires setup):** yclaude runs a local proxy that intercepts Ollama API calls, records token metrics, and forwards to Ollama. This gives full structured data but requires the user to configure their tools to route through the proxy. This is a v1.3+ feature.

**Recommendation for v1.2:** Implement Ollama as a log parser with clearly communicated limitations. Parse server logs for available data. Estimate "cloud equivalent cost" using LiteLLM-style pricing (e.g., "Running llama3 locally saved you ~$X vs. GPT-4"). Mark all Ollama analytics as "partial data -- based on available server logs."

---

## Provider Adapter Interface

```typescript
// src/providers/types.ts

export interface ProviderAdapter {
  /** Unique provider identifier */
  readonly id: ProviderId;

  /** Human-readable display name */
  readonly displayName: string;

  /** Whether this provider has data available on this machine */
  detect(): Promise<boolean>;

  /**
   * Read all available events from this provider's local data.
   * Returns UnifiedEvent[] with provider field pre-set.
   * Handles its own error recovery (bad files, missing data, etc.)
   */
  readEvents(options?: ProviderReadOptions): Promise<UnifiedEvent[]>;

  /**
   * Provider-specific pricing lookup.
   * Returns null if the model is not in this provider's pricing table.
   */
  getModelPricing(modelId: string): ProviderPricing | null;
}

export interface ProviderReadOptions {
  dir?: string;           // Override data directory
  debug?: boolean;        // Enable verbose logging
  preserveContent?: boolean;  // Keep message content (for chat viewer)
}

export interface ProviderPricing {
  inputPerMTok: number;
  outputPerMTok: number;
  cacheWritePerMTok?: number;   // Only Claude has tiered cache pricing
  cacheReadPerMTok?: number;
  /** 'api' = pay-per-token, 'subscription' = flat fee, 'local' = free */
  pricingModel: 'api' | 'subscription' | 'local';
  /** For subscription models, the monthly cost (used for "equivalent cost" display) */
  monthlySubscriptionUsd?: number;
}
```

### Provider Registry

```typescript
// src/providers/registry.ts

import { ClaudeProvider } from './claude/index.js';
import { CursorProvider } from './cursor/index.js';
import { OpenCodeProvider } from './opencode/index.js';
import { OllamaProvider } from './ollama/index.js';
import type { ProviderAdapter, ProviderId } from './types.js';

/** All known provider adapters. Order determines UI tab order. */
const ALL_PROVIDERS: ProviderAdapter[] = [
  new ClaudeProvider(),
  new CursorProvider(),
  new OpenCodeProvider(),
  new OllamaProvider(),
];

/**
 * Detect which providers have data on this machine.
 * Returns only providers with data -- no empty tabs in the UI.
 */
export async function detectProviders(): Promise<ProviderAdapter[]> {
  const results = await Promise.all(
    ALL_PROVIDERS.map(async (p) => ({ provider: p, hasData: await p.detect() }))
  );
  return results.filter((r) => r.hasData).map((r) => r.provider);
}

/**
 * Load events from all detected providers.
 * Returns events tagged with their provider ID.
 */
export async function loadAllProviders(
  providers: ProviderAdapter[],
  options?: ProviderReadOptions,
): Promise<UnifiedEvent[]> {
  const results = await Promise.all(
    providers.map((p) => p.readEvents(options))
  );
  return results.flat();
}
```

---

## Cost Engine Expansion

### Current State

`computeCosts()` does a simple lookup: `MODEL_PRICING[event.model]`. This only works for Anthropic model IDs.

### New Approach: Provider-Dispatched Pricing

```typescript
// src/cost/engine.ts (modified)

export function computeCosts(
  events: UnifiedEvent[],
  providers: ProviderAdapter[],
): CostEvent[] {
  const providerMap = new Map(providers.map(p => [p.id, p]));

  return events.map((event) => {
    if (!event.tokens || !event.model) {
      return { ...event, costUsd: toEstimatedCost(0) };
    }

    const provider = providerMap.get(event.provider);
    if (!provider) {
      return { ...event, costUsd: toEstimatedCost(0), unknownModel: true };
    }

    const pricing = provider.getModelPricing(event.model);
    if (!pricing) {
      debugLog(`[cost-engine] Unknown model for ${event.provider}: ${event.model}`);
      return { ...event, costUsd: toEstimatedCost(0), unknownModel: true };
    }

    // Provider-specific cost calculation
    const cost = calculateCost(event.tokens, pricing);
    return { ...event, costUsd: toEstimatedCost(cost) };
  });
}
```

### Pricing Strategy by Provider

| Provider | Pricing Model | Strategy |
|----------|---------------|----------|
| **Claude** | API per-token, 7 tiers | Existing `MODEL_PRICING` table. Exact. |
| **Cursor** | Subscription + usage-based credits | Use `usageData.costInCents` from composerData when available (actual Cursor cost). Fall back to API-equivalent pricing for the underlying model. |
| **OpenCode** | Depends on configured provider | LiteLLM-style pricing table (OpenAI, Anthropic, Google, etc. rates). OpenCode stores `cost: 0`, so always calculate from tokens. |
| **Ollama** | Free (local) | Show $0.00 actual cost. Calculate "cloud equivalent" cost: "Running llama3:70b locally = ~$X/MTok equivalent to GPT-4." This is a differentiator ("you saved $X"). |

### Cursor Cost Specifics

Cursor provides `usageData` in composerData with `costInCents` per model. This is valuable because:
1. It reflects Cursor's actual billing (which changed to usage-based credits in June 2025).
2. We don't need to maintain a separate pricing table for Cursor models.
3. If `costInCents` is present, use it directly as `costUsd = costInCents / 100`.
4. If absent (older data), fall back to API-equivalent pricing for the model ID.

### OpenCode Cost Specifics

OpenCode supports 75+ providers through the AI SDK. Model IDs could be anything:
- `claude-sonnet-4-5` (Anthropic)
- `gpt-4o` (OpenAI)
- `gemini-2.0-flash` (Google)
- `deepseek-r1` (DeepSeek)
- `ollama/llama3` (local Ollama)

Strategy: Maintain a broader pricing table covering major providers' models. Use LiteLLM's pricing data as a reference. When a model is unknown, flag it (just like Claude's `unknownModel` flag today).

---

## API Design

### Decision: Unified Endpoints with `?provider=` Filter

**Not per-provider endpoints.** Rationale:
1. The frontend uses tabbed navigation. Each tab sets `?provider=claude` on all API calls.
2. A "Cross-provider" / "All" tab aggregates across providers without `?provider=` param.
3. Fewer endpoints to maintain. The aggregation logic is identical -- only the filter changes.
4. Existing endpoints continue to work unchanged (no `?provider=` defaults to all data, backward compatible).

### Route Changes

```
GET /api/v1/providers              -- NEW: list detected providers with metadata
GET /api/v1/summary?provider=&from=&to=    -- EXTENDED: add provider filter
GET /api/v1/cost-over-time?provider=&...   -- EXTENDED: add provider filter
GET /api/v1/models?provider=&from=&to=     -- EXTENDED: add provider filter
GET /api/v1/projects?provider=&from=&to=   -- EXTENDED: add provider filter
GET /api/v1/sessions?provider=&...         -- EXTENDED: add provider filter
GET /api/v1/sessions/:id                   -- UNCHANGED: sessionId is globally unique
GET /api/v1/activity?provider=&...         -- EXTENDED: add provider filter
GET /api/v1/branches?provider=             -- EXTENDED: add provider filter
GET /api/v1/pricing-meta?provider=         -- EXTENDED: per-provider pricing metadata
GET /api/v1/chats?provider=&...            -- EXTENDED: add provider filter
GET /api/v1/chats/:id                      -- UNCHANGED: sessionId is globally unique
```

### New Endpoint: GET /api/v1/providers

```typescript
// Response
{
  providers: [
    {
      id: 'claude',
      displayName: 'Claude Code',
      eventCount: 12847,
      totalCost: 142.53,
      dateRange: { from: '2025-11-01T...', to: '2026-03-07T...' }
    },
    {
      id: 'cursor',
      displayName: 'Cursor',
      eventCount: 5621,
      totalCost: 87.20,
      dateRange: { from: '2025-12-15T...', to: '2026-03-06T...' }
    }
  ]
}
```

### Backward Compatibility

All existing API calls without `?provider=` continue to work, returning data across all providers. This means existing frontend code works during the migration period.

### Provider Filter Implementation Pattern

```typescript
// src/server/routes/api.ts -- middleware helper

function filterByProvider(costs: CostEvent[], provider: string | undefined): CostEvent[] {
  if (!provider) return costs;  // no filter = all providers
  return costs.filter(e => (e as UnifiedEvent).provider === provider);
}

// In each route handler:
app.get('/summary', (c) => {
  const provider = c.req.query('provider');
  let costs = filterByProvider(state.costs, provider);
  // ... existing aggregation logic unchanged ...
});
```

---

## AppState Evolution

```typescript
// src/server/server.ts

export interface AppState {
  // Existing fields (type changes from CostEvent to CostEvent with provider)
  events: UnifiedEvent[];       // was NormalizedEvent[]
  costs: CostEvent[];           // CostEvent now extends UnifiedEvent
  rawEvents?: UnifiedEvent[];   // Content-bearing events
  showMessages?: boolean;

  // New fields for v1.2
  providers: ProviderMetadata[];  // detected providers with summary stats
}

interface ProviderMetadata {
  id: ProviderId;
  displayName: string;
  eventCount: number;
  totalCost: number;
  dateRange: { from: string; to: string } | null;
}
```

---

## Recommended File Structure

```
src/
  providers/
    types.ts               # UnifiedEvent, ProviderAdapter interface, ProviderPricing
    registry.ts            # detectProviders(), loadAllProviders()
    claude/
      index.ts             # ClaudeProvider implements ProviderAdapter
      reader.ts            # MOVED from src/parser/reader.ts
      normalizer.ts        # MOVED from src/parser/normalizer.ts
      dedup.ts             # MOVED from src/parser/dedup.ts
      schema.ts            # MOVED from src/parser/schema.ts
      pricing.ts           # MOVED from src/cost/pricing.ts (Claude-specific pricing)
      types.ts             # Claude-specific raw event types
      __tests__/
    cursor/
      index.ts             # CursorProvider implements ProviderAdapter
      reader.ts            # SQLite reader for state.vscdb
      normalizer.ts        # composerData/bubble JSON -> UnifiedEvent
      pricing.ts           # Cursor cost extraction (usageData.costInCents)
      types.ts             # Cursor-specific types (ComposerData, Bubble)
      __tests__/
    opencode/
      index.ts             # OpenCodeProvider implements ProviderAdapter
      reader.ts            # SQLite reader + legacy JSON reader
      normalizer.ts        # OpenCode message -> UnifiedEvent
      pricing.ts           # Multi-provider pricing (OpenAI, Google, etc.)
      types.ts             # OpenCode-specific types
      __tests__/
    ollama/
      index.ts             # OllamaProvider implements ProviderAdapter
      reader.ts            # Log parser for ~/.ollama/logs/server.log
      normalizer.ts        # Log lines -> UnifiedEvent
      pricing.ts           # Cloud-equivalent pricing estimates
      types.ts             # Ollama-specific types
      __tests__/
  cost/
    types.ts               # EstimatedCost, CostEvent (now extends UnifiedEvent)
    engine.ts              # computeCosts() -- provider-dispatched pricing
    privacy.ts             # applyPrivacyFilter() -- unchanged, works on any UnifiedEvent
  parser/
    types.ts               # DEPRECATED re-export of providers/types.ts for backward compat
    (other files)          # DEPRECATED re-exports; actual code moves to providers/claude/
  server/
    server.ts              # AppState updated, createApp unchanged pattern
    routes/api.ts          # Add ?provider= filter to all endpoints
    cli.ts                 # Use provider registry instead of direct parseAll()
  shared/
    debug.ts               # Unchanged
  index.ts                 # Public API updated to use provider registry
```

### Structure Rationale

- **`src/providers/`:** Each provider is fully self-contained. Adding a new provider means creating a directory with 5-6 files implementing `ProviderAdapter`. No existing provider code is touched.
- **`src/providers/claude/`:** The existing `src/parser/` code is *moved* here, not copied. The old `src/parser/` directory becomes thin re-exports for backward compatibility (the `parseAll()` public API should still work for npm consumers).
- **`src/cost/`:** The cost engine becomes provider-aware but stays thin -- it delegates pricing lookups to each provider's `getModelPricing()`.
- **`src/server/`:** Minimal changes -- add `?provider=` filter helper, update `AppState` types. Route handler logic is almost identical.

---

## Data Flow: End-to-End (v1.2)

```
CLI startup (src/server/cli.ts)
    |
    | detectProviders() -- checks for ~/.claude, state.vscdb, opencode.db, ollama logs
    v
ProviderAdapter[] (e.g., [ClaudeProvider, CursorProvider])
    |
    | loadAllProviders() -- parallel read from each detected provider
    v
UnifiedEvent[] (tagged with provider: 'claude' | 'cursor' | ...)
    |
    | applyPrivacyFilter() -- strips content fields (works on any UnifiedEvent)
    v
UnifiedEvent[] (filtered)
    |
    | computeCosts(events, providers) -- provider-dispatched pricing
    v
CostEvent[] (with provider field preserved)
    |
    | Build provider metadata summary
    v
AppState { events, costs, providers, rawEvents?, showMessages? }
    |
    | createApp(state)
    v
Hono Server (127.0.0.1:3000)
    |
    | /api/v1/providers -> list detected providers
    | /api/v1/summary?provider=claude -> filtered aggregation
    | /api/v1/summary -> cross-provider totals
    v
React SPA
    |
    | Provider tab selection -> sets provider in Zustand store
    | All hooks include provider in queryKey -> auto-refetch on tab change
    v
Dashboard (per-provider or cross-provider view)
```

---

## Frontend: Provider Tab Navigation

### Zustand Store Extension

```typescript
// web/src/store/useProviderStore.ts

export interface ProviderState {
  activeProvider: ProviderId | 'all';
  availableProviders: ProviderMetadata[];
  setActiveProvider: (id: ProviderId | 'all') => void;
  setAvailableProviders: (providers: ProviderMetadata[]) => void;
}
```

### Tab UI Pattern

The sidebar navigation gains a provider selector (tabs or dropdown) at the top. When a provider is selected:
1. All API hooks include `provider` in their query keys.
2. TanStack Query automatically refetches with `?provider=cursor` etc.
3. Pages render the same components -- the data is just filtered differently.

This means NO duplication of page components. One `Overview.tsx` renders data for any provider.

---

## Build Order (Recommended)

### Phase 1: Provider Abstraction Layer

**What:** Create `src/providers/` directory structure, `UnifiedEvent` type, `ProviderAdapter` interface, provider registry. Move existing Claude code to `src/providers/claude/`. Update `cli.ts` to use registry. Ensure all 174+ existing tests still pass.

**Why first:** This is the foundation. Nothing else can be built until the data model supports multiple providers. Moving Claude code is the biggest risk (breaking existing functionality), so it must be done first and validated.

**Deliverable:** `npx yclaude` works exactly as before, but internally uses the provider architecture. No visible changes.

**Estimated effort:** Medium -- mostly file moves and thin adapter wrapping.

### Phase 2: Cursor Provider

**What:** Implement `CursorProvider` -- SQLite reader, normalizer, pricing extraction. Add `better-sqlite3` dependency. Full test suite.

**Why second:** Cursor has the richest local data store (actual costs, token counts, conversation content) and the largest user base among AI coding tools. High-value data with known schema (even if undocumented).

**Deliverable:** `npx yclaude` shows Claude + Cursor data in unified dashboard.

**Dependencies:** `better-sqlite3` npm package.

**Estimated effort:** Medium-High -- SQLite integration, schema parsing, handling Cursor version differences.

### Phase 3: API + Frontend Provider Support

**What:** Add `?provider=` filter to all API endpoints. Add `/api/v1/providers` endpoint. Add provider tab navigation to frontend. Add `useProviderStore` Zustand store. Update all TanStack Query hooks.

**Why third:** The API and frontend changes are the same regardless of how many providers exist. Building this after Cursor means we have two real providers to test with.

**Deliverable:** Tab navigation between Claude and Cursor with per-provider analytics.

**Estimated effort:** Medium -- mostly additive changes to existing routes and hooks.

### Phase 4: OpenCode Provider

**What:** Implement `OpenCodeProvider` -- dual-mode reader (SQLite + legacy JSON), normalizer, multi-provider pricing table. Full test suite.

**Why fourth:** OpenCode data is structurally similar to Claude (token counts, model IDs) but adds complexity with its 75+ provider support. Building this after the provider abstraction is solid reduces risk.

**Deliverable:** Third tab in dashboard for OpenCode users.

**Estimated effort:** Medium -- dual-mode reader adds complexity, but the adapter pattern is established.

### Phase 5: Ollama Provider

**What:** Implement `OllamaProvider` -- log parser, cloud-equivalent pricing. "You saved $X" feature.

**Why last:** Ollama has the least data available (no persistent history, fragile log parsing). It's the lowest-priority provider but has unique differentiation value with the "savings calculator." Building it last means the architecture is battle-tested.

**Deliverable:** Fourth tab (if Ollama logs exist) showing usage patterns and savings estimate.

**Estimated effort:** Low-Medium -- log parsing is simpler than SQLite, but data quality is lower.

### Build Order Rationale

```
Phase 1 (Abstraction) -> Phase 2 (Cursor) -> Phase 3 (API+UI) -> Phase 4 (OpenCode) -> Phase 5 (Ollama)
         |                      |                    |                     |                    |
    Foundation          First new provider     Multi-provider UI     Second provider      Simplest last
    No visible change   Validates abstraction  Real tabbed UX        Exercises multi-model  Unique value-add
```

The key insight is that the abstraction layer (Phase 1) and API/UI changes (Phase 3) are infrastructure that all providers share. Building Cursor first (Phase 2) validates the abstraction with a real, complex provider before investing in the UI. Phases 4-5 are "just" implementing more adapters.

---

## Integration Points: Explicit Mapping

### What Changes vs. What Stays

| Existing File | Change Type | Description |
|---------------|-------------|-------------|
| `src/parser/*` | MOVE | Code moves to `src/providers/claude/`. Thin re-exports remain for npm API compat. |
| `src/cost/pricing.ts` | MOVE | Claude pricing moves to `src/providers/claude/pricing.ts`. |
| `src/cost/engine.ts` | MODIFY | Add provider-dispatched pricing lookup. Existing Claude logic preserved. |
| `src/cost/types.ts` | MODIFY | `CostEvent` now extends `UnifiedEvent` instead of `NormalizedEvent`. |
| `src/cost/privacy.ts` | NO CHANGE | Works on any object -- strips `message/content/text` fields. |
| `src/server/server.ts` | MODIFY | `AppState` type updated. `createApp()` signature unchanged. |
| `src/server/routes/api.ts` | MODIFY | Add `filterByProvider()` helper. Add `/api/v1/providers` route. |
| `src/server/cli.ts` | MODIFY | Use `detectProviders()` + `loadAllProviders()` instead of direct `parseAll()`. |
| `src/index.ts` | MODIFY | Public API wraps provider registry. `parseAll()` still works (calls Claude provider). |
| `web/src/store/` | ADD | New `useProviderStore.ts`. |
| `web/src/hooks/*` | MODIFY | All hooks add `provider` to query keys. |
| `web/src/components/Layout.tsx` | MODIFY | Add provider tab selector. |
| All `web/src/pages/*` | MINOR | No structural changes -- data shape is the same, just filtered by provider. |
| All `src/**/__tests__/*` | MODIFY | Update import paths. Add provider-specific test suites. |

### New Dependencies

| Package | Purpose | Where |
|---------|---------|-------|
| `better-sqlite3` | Read Cursor state.vscdb and OpenCode opencode.db | Root package.json |
| `@types/better-sqlite3` | TypeScript types | Root devDependencies |

`better-sqlite3` is the correct choice over `sql.js` (WASM-based) because:
1. Synchronous API -- simpler code, no async complexity for read-only queries
2. 10-50x faster than sql.js for read operations
3. yclaude already runs as a Node.js CLI -- no browser compatibility needed
4. battle-tested in Electron apps (Cursor itself uses SQLite this way)

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Unified Event as Superset of All Fields

**What people do:** Add every provider's unique fields to `UnifiedEvent` (e.g., `cursorCostInCents?`, `ollamaEvalDuration?`, `openCodeProviderID?`).

**Why it's wrong:** The type grows unboundedly with each provider. Every consumer must handle fields that are irrelevant to most providers. Type-checking becomes meaningless when everything is optional.

**Do this instead:** Universal fields only in `UnifiedEvent`. Provider-specific data goes in `providerMeta: Record<string, unknown>` for rare access, or stays in the provider's adapter layer and is consumed only by that provider's pricing function.

### Anti-Pattern 2: Per-Provider API Routes

**What people do:** Create `/api/v1/claude/summary`, `/api/v1/cursor/summary`, `/api/v1/opencode/summary`.

**Why it's wrong:** Route explosion. The frontend must know about each provider's routes. Adding a provider means adding routes AND frontend routing logic.

**Do this instead:** Single `/api/v1/summary?provider=claude` with filter. The frontend only needs to change the query parameter. Adding a provider requires zero API route changes.

### Anti-Pattern 3: Storing Provider Data in Separate AppState Fields

**What people do:** `AppState = { claudeCosts: CostEvent[], cursorCosts: CostEvent[], ... }`.

**Why it's wrong:** Every aggregation function, every route handler, and every test must handle N separate arrays. Cross-provider aggregation requires merging arrays everywhere.

**Do this instead:** Single `costs: CostEvent[]` array with `provider` field on each event. Filter at the route level. Cross-provider aggregation is just "don't filter."

### Anti-Pattern 4: Parsing Cursor SQLite in the Main Thread Synchronously at Startup

**What people do:** Read entire 25GB state.vscdb at startup, blocking the CLI for minutes.

**Why it's wrong:** Cursor's state.vscdb can be enormous. Full table scans are unnecessary -- we only need composerData keys.

**Do this instead:** Query with `WHERE key LIKE 'composerData:%'` to read only conversation metadata. Consider pagination (LIMIT/OFFSET) for very large databases. better-sqlite3's synchronous API is fine for targeted queries, but don't `SELECT * FROM ItemTable`.

### Anti-Pattern 5: Re-implementing Claude Parser Instead of Moving It

**What people do:** Write a new Claude adapter from scratch, leaving the old `src/parser/` code orphaned.

**Why it's wrong:** Two implementations to maintain. Bugs fixed in one are missing from the other. Divergence over time.

**Do this instead:** Move (not copy) the existing parser code to `src/providers/claude/`. Leave thin re-exports at the old paths for npm consumers. One implementation, one truth.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 provider (today) | Current architecture is perfect. In-memory, startup-loaded. |
| 2-4 providers (v1.2) | Same in-memory approach. Combined CostEvent[] might be 20K-50K events. Still <200ms aggregation. `better-sqlite3` reads are fast (<1s for targeted queries). |
| 25GB Cursor DB | Must use targeted SQL queries (WHERE key LIKE 'composerData:%'), not full table scan. Consider caching parsed results to `~/.cache/yclaude/cursor-cache.json` with mtime check. |
| 5+ providers (future) | Consider lazy loading -- only parse a provider's data when its tab is first accessed. Requires making `AppState` lazy with provider-level caching. |
| Cloud sync (v2.0) | Provider adapters become "data sources" in a more general sense. The adapter pattern maps cleanly to a "local source" vs "cloud source" abstraction. |

---

## Sources

### Primary (HIGH confidence)
- `src/parser/`, `src/cost/`, `src/server/` -- read directly from codebase
- Existing `.planning/research/ARCHITECTURE.md` -- v1.0/v1.1 architecture baseline

### Secondary (MEDIUM confidence)
- [Cursor chat architecture and storage](https://dasarpai.com/dsblog/cursor-chat-architecture-data-flow-storage/) -- database structure, key patterns
- [Cursor extension for chat export](https://jacquesverre.com/blog/cursor-extension) -- composerData and bubble JSON schema, usageData fields
- [Cursor DB Explorer MCP Server](https://www.pulsemcp.com/servers/jbdamask-cursor-db-explorer) -- confirms SQLite structure
- [ccusage OpenCode CLI overview](https://ccusage.com/guide/opencode/) -- message file format, directory structure, pricing approach
- [OpenCode session management (DeepWiki)](https://deepwiki.com/sst/opencode/2.1-session-management) -- SQLite schema, session fields
- [OpenCode Monitor](https://github.com/Shlomob/ocmonitor-share) -- reference implementation for reading OpenCode data
- [Ollama API docs](https://docs.ollama.com/api/usage) -- per-request metrics format
- [Ollama API reference (GitHub)](https://github.com/ollama/ollama/blob/main/docs/api.md) -- full API specification
- [Ollama persistent storage discussion](https://github.com/ollama/ollama/issues/1052) -- confirms no conversation history stored
- [Tokscale multi-provider tracker](https://github.com/junhoyeo/tokscale) -- reference for multi-provider local data parsing
- [Cursor usage tracker](https://github.com/ofershap/cursor-usage-tracker) -- confirms undocumented API approach for Cursor usage

### Low confidence (needs validation)
- Cursor state.vscdb `_v` schema versioning -- version 3 as of early 2026, but may change
- OpenCode SQLite vs legacy JSON auto-detection -- third-party tools confirm dual support
- Ollama server log format -- undocumented, may change between versions
- Cursor's `usageData.costInCents` field -- confirmed by one source, needs hands-on validation

---
*Architecture research for: yclaude v1.2 Multi-Provider Analytics*
*Researched: 2026-03-07*
