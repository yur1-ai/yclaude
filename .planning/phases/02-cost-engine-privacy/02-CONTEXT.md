# Phase 2: Cost Engine & Privacy - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement cost calculation over parsed NormalizedEvent arrays, enforce privacy constraints, and establish the EstimatedCost type. No UI, no server — this is the calculation library and privacy boundary that Phase 3+ build on.

</domain>

<decisions>
## Implementation Decisions

### Pricing data storage
- Hardcoded TypeScript constants in a `pricing.ts` file — model prices as typed constants, versioned with code, no runtime I/O
- Updated by editing the file when Anthropic changes prices (requires a new package version)
- No external fetch at runtime — preserves local-first/offline design

### Cost engine API shape
- Returns a flat array: each event gets a `costUsd` field added (per-event cost, not pre-aggregated)
- Callers perform their own aggregation — keeps the engine simple and composable
- Exact output type: either extend `NormalizedEvent` with `costUsd` or define a new `CostEvent = NormalizedEvent & { costUsd: number }` — Claude's discretion

### Unknown model handling
- Warn to stderr (respects existing debug channel) when an event's model is unrecognized
- Include zero cost for those events — no silent data loss, no crashing
- Include a metadata field in the output (e.g., `unknownModel: true` or similar) to allow callers to surface/filter — Claude's discretion on exact field name and whether to ship in this phase or as a follow-up

### Privacy enforcement
- Dedicated privacy filter module — explicit, testable boundary, not just a UI convention
- Filters out conversation content (user messages, assistant response text) before any downstream processing
- The filter sits between parser output and cost engine input (or wraps the parser output)

### Estimate labeling
- Use an `EstimatedCost` TypeScript type (branded or structured) — explicit in the type system, not just a display-layer concern
- Every cost value returned by the cost engine is typed as `EstimatedCost`, not a bare `number`
- Exact shape (branded `number & { __brand }` vs `{ amount: number; currency: 'USD' }`) — Claude's discretion

### Claude's Discretion
- Exact shape of `EstimatedCost` type
- Whether `unknownModel` metadata field ships in this phase or as a follow-up enhancement
- Exact output type name for cost-enriched events (`CostEvent`, `PricedEvent`, etc.)
- How the privacy filter is invoked — wrapper function, class, or standalone module

</decisions>

<specifics>
## Specific Ideas

- The `unknownModel` flag idea: "maybe now if simple" — if the metadata field adds minimal complexity, include it in this phase; otherwise defer
- Estimate labeling should feel structural, not cosmetic — "EstimatedCost" in the type system, not just a UI string

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/index.ts → parseAll()`: Returns `NormalizedEvent[]` — the direct input to the cost engine
- `src/parser/types.ts → NormalizedEvent`: Already has `cacheCreation5m` and `cacheCreation1h` separated into their own fields — exactly what Phase 2 needs for tier-specific pricing multipliers
- `src/shared/debug.ts`: Existing debug/warn channel — unknown model warnings should use this pattern

### Established Patterns
- TypeScript ESM with Zod schemas — cost engine should follow the same pattern (typed module, no runtime config)
- Per-line error tolerance (parser skips bad lines, warns) — same philosophy applies to unknown models: warn, zero-out, continue
- `.passthrough()` on NormalizedEvent schema preserves unknown fields — cost engine can add fields to events without breaking the schema contract

### Integration Points
- Cost engine consumes `NormalizedEvent[]` from `parseAll()`
- Privacy filter wraps or post-processes parser output before it reaches cost engine or any caller
- Phase 3 (server) will call cost engine directly — the flat `CostEvent[]` array is what API endpoints will aggregate

</code_context>

<deferred>
## Deferred Ideas

- **Live pricing API fetch** — Pull current model prices from Anthropic's API at startup (breaks offline/local-first for now; revisit in a later phase when network access is more appropriate)
- **Granular aggregations** — Pre-computed totals by model, session, and project in the cost engine itself (currently callers aggregate; add if performance or convenience demands it in a later phase)
- **Conversation content display** — Showing and parsing actual user/assistant messages in the UI (privacy filter explicitly blocks this now; revisit as an opt-in feature in a future phase)

</deferred>

---

*Phase: 02-cost-engine-privacy*
*Context gathered: 2026-02-28*
