# Phase 12: Cursor Provider - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Full Cursor analytics from state.vscdb -- sessions, costs, agent mode breakdown, inline edits, and conversation content. Users with Cursor installed see session analytics, provider-reported cost data, and agent mode vs manual mode comparison. Dashboard UI changes (provider tabs, filtering) are Phase 13.

Requirements: CURS-01, CURS-02, CURS-03

</domain>

<decisions>
## Implementation Decisions

### Cost Handling
- Sessions without costInCents show 'N/A' label with tooltip ("No cost data available")
- Fallback cost estimation from tokens deferred to future phase
- Sessions with N/A cost excluded from aggregated cost totals and charts (prevent misleading $0 in averages)
- Subtle 'reported' / 'estimated' badge per cost value for cost source distinction
- Trust provider data as-is -- no outlier flagging or validation of costInCents values
- Convert costInCents / 100 to costUsd at adapter level; raw cents preserved on UnifiedEvent.costInCents for debug/export
- Include all sessions regardless of token count (zero-token but non-zero-cost sessions included)
- Overview page changes (provider summary cards) deferred to Phase 13

### Degradation & Resilience
- Unknown schema version: warning banner + parse whatever is possible (partial data better than nothing)
- DB locked by Cursor: copy state.vscdb + WAL/SHM to temp directory, read from copy
- If temp copy fails (disk full, permission): fall back to direct read-only open
- Validate schema version BEFORE copying to temp (quick probe on original DB avoids wasted copy)
- Clean up temp copy immediately after reading (state.vscdb can be 100MB+)
- Corrupt individual sessions: include in session list with 'parse error' marker (not silently skipped)
- Always show Cursor schema version in startup banner (not just debug mode)
- Support current schema version + one prior major version
- Single default path per platform (no multi-DB scanning)

### Model Names
- Show raw model IDs as-is from state.vscdb (no normalization mapping table)
- Models mixed on Models page alongside Claude models; provider-scoped views in Phase 13
- No 'unknown model' flagging -- costs are provider-reported, not estimated from pricing table
- All models in one donut pie chart; provider-scoped views deferred to Phase 13

### Session Boundaries
- One Cursor composer = one session in yclaude
- Each bubble (AI response) = one UnifiedEvent (per-turn granularity, matches Claude's per-turn model)
- Duration computed as first-to-last bubble timestamp within a composer
- isAgentic flag is per-session (per-composer), not per-bubble
- Include inline edits (Cmd+K) alongside composers -- same session list, tagged as 'edit' type
- Inline edits marked as non-agentic (isAgentic=false)
- Empty composers (zero bubbles) excluded from session list
- Show workspace path as project label if available in state.vscdb
- Show git branch if available in state.vscdb

### Platform Support
- macOS + Linux supported (Windows deferred)
- Check both Cursor stable AND Cursor Insiders directories
- Merge stable + Insiders events as one 'Cursor' provider (no separate provider entries)
- No --cursor-dir override flag; auto-detect only (consistent with Phase 11 decision)

### Performance
- Load all available data (no time-based limit on historical data)
- SQL WHERE clauses for filtering at database level (not load-all-then-filter-in-JS)
- No indexing on temp copy (state.vscdb is key-value store, sequential key reads)
- Parse once at startup, results cached in AppState.events for server lifetime
- Progress/event count logging in --debug mode only

### Conversation Content
- Cursor conversation content included in Phase 12 behind --show-messages flag
- Same privacy enforcement as Claude: content not loaded at all without --show-messages (server-side 403)
- Reuse existing react-markdown + react-syntax-highlighter pipeline for rendering
- Render tool call content as-is in markdown (no special formatting in Phase 12)
- Show both user messages and AI responses (full conversation thread)
- Show thinking/reasoning content if available (collapsible section)
- Render inline images (decode base64 if stored in state.vscdb)
- Show file context (@-mentions) as context header above user messages if available
- Show model label per AI response (Cursor can switch models mid-conversation)
- Provider icon/badge per conversation in the conversation list
- Fully loaded with virtual scroll for long conversations (no pagination)

### Testing
- Synthetic SQLite fixtures created in test setup code (deterministic, no external dependencies)
- Adapter + parser test coverage (~15-25 tests): detect/load happy path, missing data, corrupt data, unknown schema
- Test against current schema version + one prior version (matching support scope)
- Explicit graceful degradation test for completely unknown schema (verify warning + partial/empty results, not crash)

### Claude's Discretion
- Internal SQLite query structure and key extraction logic
- Exact schema version detection mechanism
- Temp file naming and location strategy
- Parse error marker visual design
- Debug log format and verbosity levels
- Exact test count and edge case selection

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/providers/cursor/adapter.ts`: Stub adapter already registered in provider registry -- implement detect() and load()
- `src/providers/types.ts`: UnifiedEvent already has cursor-specific fields (isAgentic, costInCents)
- `src/providers/registry.ts`: Registry handles parallel detection/loading, error isolation -- no changes needed
- Claude conversation viewer (react-markdown + react-syntax-highlighter): Reuse for Cursor bubble rendering
- Existing session explorer: Cursor sessions flow into the same list with provider='cursor'

### Established Patterns
- Provider adapter: detect() -> load(opts) -> UnifiedEvent[] pattern (ClaudeAdapter reference)
- Privacy: preserveContent option in LoadOptions controls message loading
- Server-side aggregation: all cost/token aggregation happens in API routes
- Per-line/per-record error handling: skip malformed, continue parsing (Claude adapter pattern)
- Conditional spread for optional UnifiedEvent fields (exactOptionalPropertyTypes compliance)

### Integration Points
- `src/providers/cursor/adapter.ts`: Main implementation target
- `src/server/routes/api.ts`: No changes needed -- already consumes UnifiedEvent[] from all providers
- `src/server/cli.ts`: No changes needed -- startup banner already shows Cursor status from registry
- Frontend conversation viewer: May need minor updates for provider icon/badge and model-per-response

</code_context>

<specifics>
## Specific Ideas

- Cost source labels in the UI: "provider-reported" for Cursor (from Phase 11 context)
- Schema version shown in startup banner: e.g., "Cursor: found (schema v3, 142 sessions)"
- Parse error sessions should be visible but clearly marked -- user should know data exists even if we can't fully parse it
- Cursor conversation viewer should feel consistent with Claude's -- same layout, same markdown rendering, just different content

</specifics>

<deferred>
## Deferred Ideas

- **Fallback cost estimation** from token-based sources when costInCents is missing/zero -- future phase refinement
- **Session type filter** in session explorer (composer vs edit vs all) -- Phase 13 (IMPORTANT: track this, user flagged as high priority)
- **Cursor conversation viewer refinements** -- future phase (Phase 12 gets basic support working)
- **Windows platform support** for Cursor data directory detection
- **--cursor-dir override** flag for custom Cursor data locations
- **Tab completion analytics** from Cursor (not in state.vscdb, enterprise API only)

</deferred>

---

*Phase: 12-cursor-provider*
*Context gathered: 2026-03-07*
