# Phase 11: Provider Abstraction Layer - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Unified data model and provider adapter pattern with Claude Code refactored as the first (and only v1.2-initial) implementation. All existing analytics must work identically to v1.1 -- zero regression. Auto-detection of installed AI tools at startup. New providers can be added by implementing a single ProviderAdapter interface.

Requirements: PROV-01, PROV-02

</domain>

<decisions>
## Implementation Decisions

### Unified Event Model
- Flat type with optional provider-specific fields (no discriminated union, no provider bag)
- `UnifiedEvent` has shared fields (id, provider, sessionId, timestamp, type, model, tokens, costUsd, costSource, cwd, gitBranch, durationMs, message?) plus provider-specific optionals (isSidechain, agentId, cacheCreation5m/1h for Claude; isAgentic, costInCents for Cursor; additions, deletions, filesChanged, parentSessionId, routedProvider for OpenCode)
- Full token structure preserved: input, output, cacheCreation, cacheRead, cacheCreation5m, cacheCreation1h -- non-Claude providers zero-fill cache fields
- `ProviderId` is a string literal union: `'claude' | 'cursor' | 'opencode'`
- Keep cwd + gitBranch fields; displayName computed at API layer (existing assignProjectNames logic)
- Keep `type: string` field for event kind (user/assistant/system)
- Keep optional `durationMs` on events; each provider computes from its own source
- `message?: Record<string, unknown>` optional field on UnifiedEvent for conversation content (replaces separate rawEvents array)
- Adapter interface: `{ id: ProviderId; name: string; detect(): Promise<boolean>; load(opts: LoadOptions): Promise<UnifiedEvent[]> }`
- LoadOptions: `{ dir?: string; preserveContent?: boolean; debug?: boolean }`

### Cost Model
- `costUsd: number` + `costSource: 'estimated' | 'reported' | 'pre-calculated'` on every UnifiedEvent
- Drop the `EstimatedCost` branded type -- replaced by costSource tag
- Per-provider costing: each adapter computes its own costs internally (Claude uses existing pricing engine, Cursor converts costInCents, OpenCode uses pre-calculated fields)
- Cross-provider totals show footnote with per-provider breakdown and cost-source labels

### Provider Auto-Detection
- Detect all known providers at startup, load all found -- no manual config needed
- `--dir` flag remains Claude-only override; other providers use their default paths
- `--exclude` flag added for opting out specific providers (e.g., `--exclude cursor,opencode`)
- Warn and skip on provider load failure (log to stderr, continue with other providers)
- Show all known providers in startup banner with status icons (found/not-found/error)
- Actionable error hints when a provider fails (e.g., permission fix suggestions)

### Provider Registry
- Static array of known adapters in `src/providers/registry.ts` (import + add to array to register)
- Parallel detection, then parallel loading of detected providers
- `loadProviders()` returns `{ events: UnifiedEvent[]; providers: ProviderInfo[] }`
- `ProviderInfo`: `{ id, name, status: 'loaded' | 'not-found' | 'error', eventCount, error? }`

### Conversation Data
- `--show-messages` is a global flag; enables conversation viewing for all providers that support it
- In Phase 11, only Claude supports conversations; Cursor/OpenCode conversation support deferred (v1.3+)
- Single `load()` method with `preserveContent` option -- no separate loadConversations()
- Privacy filtering is per-provider (each adapter strips message content when preserveContent=false)
- No separate rawEvents array on AppState -- UnifiedEvent.message is the content carrier
- Chats endpoints return all providers' conversations mixed; ?provider= filter added in Phase 13
- Chat responses include `provider` field in summary

### Refactor Boundary
- Full move: src/parser/ and src/cost/ relocate into src/providers/claude/
- Directory structure: `src/providers/types.ts`, `src/providers/registry.ts`, `src/providers/{name}/adapter.ts`
- API routes refactored to consume `UnifiedEvent[]` in Phase 11 (not deferred to Phase 13)
- AppState changes: `events: UnifiedEvent[]`, `providers: ProviderInfo[]`, `showMessages?: boolean`
- Breaking change to public npm API is acceptable (v1.2 minor bump)
- New public API: `import { loadProviders } from 'yclaude'` replaces parseAll/computeCosts
- All 174+ existing tests migrated to new import paths and adapter interface

### Startup Output
- Compact banner with status icon per provider (checkmark/cross/warning)
- Always show all known providers in banner (found + not-found + error)
- `--debug` shows per-provider detection and load timing

### Claude's Discretion
- Exact field naming/ordering in UnifiedEvent type
- Internal adapter implementation details (how Claude adapter wraps existing parser/normalizer/dedup)
- Test migration strategy (gradual vs big-bang)
- Error hint text for specific failure modes
- Debug log format and verbosity levels

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/parser/reader.ts`: JSONL discovery and streaming -- moves into `src/providers/claude/parser/`
- `src/parser/normalizer.ts`: Claude event normalization -- moves into `src/providers/claude/parser/`
- `src/parser/dedup.ts`: UUID deduplication -- moves into `src/providers/claude/parser/`
- `src/cost/engine.ts`: Claude cost computation (computeCosts) -- moves into `src/providers/claude/cost/`
- `src/cost/pricing.ts`: Claude model pricing tiers -- moves into `src/providers/claude/cost/`
- `src/cost/privacy.ts`: Privacy filter (applyPrivacyFilter) -- moves into `src/providers/claude/` as adapter concern
- `src/server/routes/api.ts`: 1080 LOC API routes -- refactored to consume UnifiedEvent[] instead of CostEvent[]

### Established Patterns
- Hono v4 API routes with AppState injection
- All aggregation server-side (privacy invariant -- maintained)
- UTC Date methods throughout bucketing (preserved)
- Zustand for global filters in frontend (unchanged)
- `--show-messages` gates content at server level (403 enforcement)
- API routes registered before serveStatic (ordering enforced)
- Per-line error handling in parser (skip malformed, don't crash)

### Integration Points
- `src/server/cli.ts`: Entry point -- needs to call loadProviders() instead of parseAll/computeCosts pipeline
- `src/server/server.ts`: AppState interface -- changes to use UnifiedEvent[] + ProviderInfo[]
- `src/index.ts`: Public API exports -- new loadProviders() replaces parseAll/computeCosts
- Frontend API client: May need minor type updates if response shapes change (provider field added)

</code_context>

<specifics>
## Specific Ideas

- Startup banner should feel polished and informative -- status icons per provider with event counts
- Error hints should be actionable (not just "failed" but "try chmod +r" or "try reinstalling")
- Cost source labels in the UI: "API-estimated" (Claude), "provider-reported" (Cursor), "pre-calculated" (OpenCode)
- Cross-provider total footnote pattern: show total, then per-provider breakdown with methodology labels

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 11-provider-abstraction-layer*
*Context gathered: 2026-03-07*
