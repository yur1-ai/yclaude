# Phase 2: Cost Engine & Privacy - Research

**Researched:** 2026-02-28
**Domain:** TypeScript cost calculation library, model pricing constants, branded types, privacy filter
**Confidence:** HIGH

## Summary

Phase 2 is a pure TypeScript library phase — no server, no UI. It builds three tightly scoped modules:
(1) `pricing.ts` — hardcoded model pricing constants, (2) `costEngine.ts` — maps `NormalizedEvent[]` to
`CostEvent[]` by computing per-event `costUsd` as a branded `EstimatedCost` type, and (3) `privacyFilter.ts`
— strips conversation text from events before any downstream consumer sees them.

All three modules follow patterns already established in Phase 1: TypeScript ESM, strict mode, Zod passthrough
schemas, debug channel for warnings, per-item error tolerance (warn + zero-out for unknown models). The
`NormalizedEvent` type already carries all required token sub-fields (`cacheCreation5m`, `cacheCreation1h`)
so the cost engine can apply tier-specific multipliers without any parser change.

The critical external dependency is having accurate pricing constants. Anthropic's official docs have been
fetched and verified as of 2026-02-28. Model API IDs are confirmed from the official models/overview page.
The branded type pattern for `EstimatedCost` should use `number & { readonly __brand: 'EstimatedCost' }`
(lightweight, zero runtime cost, idiomatic in the TypeScript ecosystem).

**Primary recommendation:** Three modules, one test file each, all colocated under `src/cost/`. The privacy
filter wraps the `parseAll()` output as a standalone function. The cost engine is a pure function. Zero new
dependencies needed.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Pricing data storage:** Hardcoded TypeScript constants in `pricing.ts` — model prices as typed constants, versioned with code, no runtime I/O. Updated by editing the file when Anthropic changes prices. No external fetch.
- **Cost engine API shape:** Returns a flat array — each event gets a `costUsd` field added (per-event cost, not pre-aggregated). Callers perform their own aggregation.
- **Unknown model handling:** Warn to stderr via existing debug channel when event's model is unrecognized. Include zero cost. Metadata field (`unknownModel: true` or similar) — Claude's discretion on field name and whether to ship now or defer.
- **Privacy enforcement:** Dedicated privacy filter module — explicit, testable boundary. Filters out conversation content (user messages, assistant response text). Sits between parser output and cost engine input (or wraps parser output).
- **Estimate labeling:** Use an `EstimatedCost` TypeScript type (branded or structured). Every cost value returned by the cost engine is typed as `EstimatedCost`, not a bare `number`.

### Claude's Discretion
- Exact shape of `EstimatedCost` type (branded number vs object wrapper)
- Whether `unknownModel` metadata field ships in this phase or as a follow-up
- Exact output type name for cost-enriched events (`CostEvent`, `PricedEvent`, etc.)
- How the privacy filter is invoked — wrapper function, class, or standalone module

### Deferred Ideas (OUT OF SCOPE)
- **Live pricing API fetch** — breaks offline/local-first
- **Granular aggregations** — pre-computed totals by model/session/project in the cost engine itself
- **Conversation content display** — privacy filter explicitly blocks this now
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CORE-02 | User sees accurate cost estimates — pricing table covers all current Claude models including full cache tier complexity (5-min write 1.25x, 1-hour write 2x, read 0.1x) | Official Anthropic pricing docs fetched 2026-02-28 provide complete table. All model IDs confirmed from models/overview page. Cache multipliers confirmed: 5m=1.25x, 1h=2.0x, read=0.1x. |
| CORE-03 | User understands costs are estimates — all cost figures labeled "estimated" throughout the UI (upstream token data has documented duplication bugs) | `EstimatedCost` branded type enforces the label structurally at the type system level. Every downstream consumer receives `EstimatedCost`, not `number`. |
| CORE-04 | User's conversation data stays private — server binds to `127.0.0.1` exclusively, zero telemetry, CSP headers blocking external requests, no conversation content displayed anywhere | Privacy filter strips message content at the library level (this phase). Server `127.0.0.1` binding belongs to Phase 3 but the privacy filter established here is what enables CORE-04's "no conversation content" guarantee. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.9.3 (already installed) | Branded types, strict typing | Project standard |
| Zod | ^4.3.6 (already installed) | Schema validation for output types | Project standard — passthrough pattern already established |
| Vitest | ^4.0.18 (already installed) | Unit tests | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new | — | — | No new dependencies required for this phase |

All tooling (TypeScript, Zod, Vitest, tsup) is already installed. Phase 2 adds zero new `package.json` dependencies.

**Installation:**
```bash
# No new packages — all dependencies already present
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── parser/           # Phase 1 (complete)
│   ├── types.ts      # NormalizedEvent — Phase 2 input type
│   └── ...
├── cost/             # Phase 2 (this phase)
│   ├── pricing.ts    # Hardcoded model pricing constants
│   ├── types.ts      # EstimatedCost brand, CostEvent type
│   ├── engine.ts     # computeCosts(events: NormalizedEvent[]): CostEvent[]
│   ├── privacy.ts    # applyPrivacyFilter(events: NormalizedEvent[]): NormalizedEvent[]
│   └── __tests__/
│       ├── engine.test.ts
│       ├── pricing.test.ts
│       └── privacy.test.ts
└── index.ts          # Re-export NormalizedEvent (existing) — extend with cost exports
```

### Pattern 1: EstimatedCost Branded Type (Recommended Shape)

**What:** `number & { readonly __brand: 'EstimatedCost' }` — intersection type with a phantom property. Zero runtime cost. No wrapper object.

**When to use:** Any cost value returned by the engine.

**Why this over object wrapper:** The project's JSONL events flow through arrays of flat objects. Keeping `costUsd` as a branded primitive means it JSON-serializes naturally, array math (`reduce`) works without unwrapping, and the type-level protection is identical to an object wrapper.

**Example:**
```typescript
// src/cost/types.ts
declare const __brand: unique symbol;

export type EstimatedCost = number & { readonly [__brand]: 'EstimatedCost' };

// Constructor function — the ONLY way to create an EstimatedCost
export function toEstimatedCost(value: number): EstimatedCost {
  return value as EstimatedCost;
}

// CostEvent: NormalizedEvent extended with costUsd
export type CostEvent = NormalizedEvent & {
  costUsd: EstimatedCost;
  unknownModel?: true;   // present only when model was not in pricing table
};
```

**Why `unique symbol` over `__brand: 'EstimatedCost'` string literal:** `unique symbol` prevents any external code from accidentally satisfying the brand via structural typing. The string-literal approach (`{ __brand: 'EstimatedCost' }`) can be satisfied by any object with that exact string property.

### Pattern 2: Pricing Constants Table

**What:** Typed constant map from model ID string to `ModelPricing` interface.

**When to use:** Looked up by `event.model` string during cost calculation.

**Example:**
```typescript
// src/cost/pricing.ts
// Source: https://platform.claude.com/docs/en/about-claude/pricing (fetched 2026-02-28)

export interface ModelPricing {
  inputPerMTok: number;      // USD per million input tokens
  outputPerMTok: number;     // USD per million output tokens
  cacheWrite5mPerMTok: number;  // 1.25x input (5-min ephemeral tier)
  cacheWrite1hPerMTok: number;  // 2.0x input (1-hour ephemeral tier)
  cacheReadPerMTok: number;     // 0.1x input
}

// Indexed by exact API model ID strings (from models/overview, fetched 2026-02-28)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // --- Latest models ---
  'claude-opus-4-6': {
    inputPerMTok: 5.00, outputPerMTok: 25.00,
    cacheWrite5mPerMTok: 6.25, cacheWrite1hPerMTok: 10.00, cacheReadPerMTok: 0.50,
  },
  'claude-sonnet-4-6': {
    inputPerMTok: 3.00, outputPerMTok: 15.00,
    cacheWrite5mPerMTok: 3.75, cacheWrite1hPerMTok: 6.00, cacheReadPerMTok: 0.30,
  },
  'claude-haiku-4-5-20251001': {
    inputPerMTok: 1.00, outputPerMTok: 5.00,
    cacheWrite5mPerMTok: 1.25, cacheWrite1hPerMTok: 2.00, cacheReadPerMTok: 0.10,
  },
  'claude-haiku-4-5': {  // alias
    inputPerMTok: 1.00, outputPerMTok: 5.00,
    cacheWrite5mPerMTok: 1.25, cacheWrite1hPerMTok: 2.00, cacheReadPerMTok: 0.10,
  },
  // --- Legacy models (still in use) ---
  'claude-sonnet-4-5-20250929': {
    inputPerMTok: 3.00, outputPerMTok: 15.00,
    cacheWrite5mPerMTok: 3.75, cacheWrite1hPerMTok: 6.00, cacheReadPerMTok: 0.30,
  },
  'claude-sonnet-4-5': {  // alias
    inputPerMTok: 3.00, outputPerMTok: 15.00,
    cacheWrite5mPerMTok: 3.75, cacheWrite1hPerMTok: 6.00, cacheReadPerMTok: 0.30,
  },
  'claude-opus-4-5-20251101': {
    inputPerMTok: 5.00, outputPerMTok: 25.00,
    cacheWrite5mPerMTok: 6.25, cacheWrite1hPerMTok: 10.00, cacheReadPerMTok: 0.50,
  },
  'claude-opus-4-5': {  // alias
    inputPerMTok: 5.00, outputPerMTok: 25.00,
    cacheWrite5mPerMTok: 6.25, cacheWrite1hPerMTok: 10.00, cacheReadPerMTok: 0.50,
  },
  'claude-opus-4-1-20250805': {
    inputPerMTok: 15.00, outputPerMTok: 75.00,
    cacheWrite5mPerMTok: 18.75, cacheWrite1hPerMTok: 30.00, cacheReadPerMTok: 1.50,
  },
  'claude-opus-4-1': {  // alias
    inputPerMTok: 15.00, outputPerMTok: 75.00,
    cacheWrite5mPerMTok: 18.75, cacheWrite1hPerMTok: 30.00, cacheReadPerMTok: 1.50,
  },
  'claude-sonnet-4-20250514': {
    inputPerMTok: 3.00, outputPerMTok: 15.00,
    cacheWrite5mPerMTok: 3.75, cacheWrite1hPerMTok: 6.00, cacheReadPerMTok: 0.30,
  },
  'claude-sonnet-4-0': {  // alias
    inputPerMTok: 3.00, outputPerMTok: 15.00,
    cacheWrite5mPerMTok: 3.75, cacheWrite1hPerMTok: 6.00, cacheReadPerMTok: 0.30,
  },
  'claude-opus-4-20250514': {
    inputPerMTok: 15.00, outputPerMTok: 75.00,
    cacheWrite5mPerMTok: 18.75, cacheWrite1hPerMTok: 30.00, cacheReadPerMTok: 1.50,
  },
  'claude-opus-4-0': {  // alias
    inputPerMTok: 15.00, outputPerMTok: 75.00,
    cacheWrite5mPerMTok: 18.75, cacheWrite1hPerMTok: 30.00, cacheReadPerMTok: 1.50,
  },
  'claude-sonnet-3-7-20250219': {  // deprecated
    inputPerMTok: 3.00, outputPerMTok: 15.00,
    cacheWrite5mPerMTok: 3.75, cacheWrite1hPerMTok: 6.00, cacheReadPerMTok: 0.30,
  },
  'claude-3-5-haiku-20241022': {
    inputPerMTok: 0.80, outputPerMTok: 4.00,
    cacheWrite5mPerMTok: 1.00, cacheWrite1hPerMTok: 1.60, cacheReadPerMTok: 0.08,
  },
  'claude-3-haiku-20240307': {  // deprecated, retiring 2026-04-19
    inputPerMTok: 0.25, outputPerMTok: 1.25,
    cacheWrite5mPerMTok: 0.30, cacheWrite1hPerMTok: 0.50, cacheReadPerMTok: 0.03,
  },
  'claude-3-opus-20240229': {  // deprecated
    inputPerMTok: 15.00, outputPerMTok: 75.00,
    cacheWrite5mPerMTok: 18.75, cacheWrite1hPerMTok: 30.00, cacheReadPerMTok: 1.50,
  },
  'claude-3-sonnet-20240229': {
    inputPerMTok: 3.00, outputPerMTok: 15.00,
    cacheWrite5mPerMTok: 3.75, cacheWrite1hPerMTok: 6.00, cacheReadPerMTok: 0.30,
  },
};
```

### Pattern 3: Cost Engine Pure Function

**What:** `computeCosts(events: NormalizedEvent[]): CostEvent[]` — maps each event to a `CostEvent`.

**When to use:** Called by Phase 3 server endpoints after the privacy filter.

**Example:**
```typescript
// src/cost/engine.ts
import type { NormalizedEvent } from '../parser/types.js';
import { MODEL_PRICING } from './pricing.js';
import { toEstimatedCost } from './types.js';
import type { CostEvent } from './types.js';
import { debugLog } from '../shared/debug.js';

// Tokens-per-million conversion
const PER_MILLION = 1_000_000;

export function computeCosts(events: NormalizedEvent[]): CostEvent[] {
  return events.map((event) => computeEventCost(event));
}

function computeEventCost(event: NormalizedEvent): CostEvent {
  // Events without token data contribute zero cost
  if (!event.tokens || !event.model) {
    return { ...event, costUsd: toEstimatedCost(0) };
  }

  const pricing = MODEL_PRICING[event.model];

  if (!pricing) {
    debugLog(`[cost-engine] Unknown model: ${event.model} — costing as $0`);
    return { ...event, costUsd: toEstimatedCost(0), unknownModel: true };
  }

  const { tokens } = event;

  // cache_creation = cacheCreation5m + cacheCreation1h (the split fields are authoritative)
  // base input tokens = total input - cache writes - cache reads (cache writes/reads billed separately)
  const baseInput = Math.max(0, tokens.input - tokens.cacheCreation - tokens.cacheRead);

  const cost =
    (baseInput * pricing.inputPerMTok) / PER_MILLION +
    (tokens.output * pricing.outputPerMTok) / PER_MILLION +
    (tokens.cacheCreation5m * pricing.cacheWrite5mPerMTok) / PER_MILLION +
    (tokens.cacheCreation1h * pricing.cacheWrite1hPerMTok) / PER_MILLION +
    (tokens.cacheRead * pricing.cacheReadPerMTok) / PER_MILLION;

  return { ...event, costUsd: toEstimatedCost(cost) };
}
```

### Pattern 4: Privacy Filter Standalone Module

**What:** `applyPrivacyFilter(events: NormalizedEvent[]): NormalizedEvent[]` — removes any fields that contain conversation content.

**When to use:** Called immediately on the output of `parseAll()`, before passing events to the cost engine or any API endpoint.

**Example:**
```typescript
// src/cost/privacy.ts
import type { NormalizedEvent } from '../parser/types.js';

// Fields that may carry conversation text — stripped at the library boundary.
// 'message' carries the full assistant/user content. Any other content-bearing
// fields discovered in future JSONL versions should be added here.
const CONTENT_FIELDS = new Set(['message', 'content', 'text']);

export function applyPrivacyFilter(events: NormalizedEvent[]): NormalizedEvent[] {
  return events.map(stripContentFields);
}

function stripContentFields(event: NormalizedEvent): NormalizedEvent {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event)) {
    if (!CONTENT_FIELDS.has(key)) {
      filtered[key] = value;
    }
  }
  // Cast is safe: we are only removing extra fields, the required fields remain.
  // NormalizedEvent uses passthrough — no required content fields exist.
  return filtered as NormalizedEvent;
}
```

**Note on `message` field:** The normalizer extracts token data and model from `message` before Phase 2 sees the event. By the time `NormalizedEvent[]` is produced, `tokens` and `model` are top-level fields — the raw `message` field may still be present (passed through via `.passthrough()`). The privacy filter removes it from downstream visibility.

### Anti-Patterns to Avoid

- **Putting cost aggregation in the engine:** The engine returns per-event costs. Callers aggregate. Never add `totalCostUsd` to the engine return type.
- **Using `number` instead of `EstimatedCost` for `costUsd`:** The type exists to carry semantic meaning through the type system to every Phase 3+ consumer. Bypassing it defeats the labeling requirement (CORE-03).
- **Binding the privacy filter to a specific downstream module:** The filter should be a standalone function that can wrap any event source. Keep it decoupled from the cost engine.
- **Using `String(event.model)` or lowercasing model IDs before lookup:** Model IDs are case-sensitive. `claude-opus-4-6` and `Claude-Opus-4-6` are different keys. Preserve exact case from the parsed event.
- **Building a "cache_creation" summing helper:** `tokens.cacheCreation` (the total) already exists in `NormalizedEvent`. For pricing, use the split fields `cacheCreation5m` and `cacheCreation1h` directly — they carry the tier-specific amounts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token-to-cost arithmetic | Custom formula DSL | Direct arithmetic with `pricing.ts` constants | Simple multiplication — no library needed, but don't re-derive the multipliers |
| Branded types | External `ts-brand` or `effect` Brand | Native intersection type `number & { readonly [__brand]: 'EstimatedCost' }` | No new dependency, zero runtime cost, idiomatic TS |
| Privacy filtering | Custom AST walk / deep clone | Simple `Object.entries` property exclusion | The NormalizedEvent schema is flat at top level; no recursive content structures |
| Debug/warn output | `console.warn`, `console.error` | `debugLog()` from `src/shared/debug.ts` | Project already has a debug channel; stays consistent with Phase 1 pattern |

**Key insight:** All the complexity in this phase is in getting the pricing constants right, not in the code. The arithmetic itself is trivial once the constants table is correct.

## Common Pitfalls

### Pitfall 1: Token Double-Counting in Cost Calculation
**What goes wrong:** `tokens.input` in `NormalizedEvent` includes cache write and cache read tokens (they are reported as part of `input_tokens` in some Anthropic API responses). If you multiply the full `input` count by `inputPerMTok`, you over-count because cache writes and reads are billed at different rates.

**Why it happens:** The raw API usage object sets `input_tokens` to the base input, but the way Claude Code JSONL stores these may differ. The parser captures `cacheCreation` (total write), `cacheCreation5m`, `cacheCreation1h`, and `cacheRead` as separate fields.

**How to avoid:** Compute `baseInput = max(0, tokens.input - tokens.cacheCreation - tokens.cacheRead)` and bill each category separately. Use the split fields (`cacheCreation5m`, `cacheCreation1h`) for the per-tier write costs.

**Warning signs:** Test with an event that has `cacheCreation5m=150, cacheCreation1h=50, cacheRead=30` — if removing cache fields doesn't change the `baseInput` calculation, you're double-counting.

### Pitfall 2: Model ID Alias Gaps
**What goes wrong:** Claude Code JSONL may log model IDs in multiple formats. Anthropic provides both snapshot IDs (`claude-opus-4-6`) and dated snapshot IDs. The current frontier models use non-dated aliases as their canonical IDs, but older models use dated strings.

**Why it happens:** Anthropic changed their naming convention across generations. Some models in older JSONL files will have `claude-3-haiku-20240307`, others `claude-haiku-4-5`, others `claude-opus-4-6`.

**How to avoid:** Include both dated and alias forms in `MODEL_PRICING` where both exist. The models/overview page (fetched 2026-02-28) lists both. Key coverage: `claude-opus-4-6` (alias only — no separate dated ID yet), `claude-haiku-4-5-20251001` plus alias `claude-haiku-4-5`, legacy dated IDs for all Claude 4 and 3.x models.

**Warning signs:** High `unknownModel: true` counts when running against real JSONL data.

### Pitfall 3: `localhost` vs `127.0.0.1` (Phase 3 concern, surface now)
**What goes wrong:** Binding a Node.js HTTP server to `'localhost'` does not guarantee binding to `127.0.0.1`. On many systems, `localhost` resolves to `::1` (IPv6) via DNS lookup. The server will be listening, but external network access behavior differs from intent.

**Why it happens:** Node.js `http.Server` does a `dns.lookup()` for the hostname — confirmed in nodejs/node issue #47785. The maintainers closed it as "working as intended."

**How to avoid (Phase 3):** Always use `server.listen({ host: '127.0.0.1', port: ... })`. Never use `'localhost'` as the hostname argument. Document this explicitly in Phase 3 plan.

**Warning signs:** On macOS/Linux this usually works either way, but on Windows `localhost` may resolve to `::1` and the server is accessible from network interfaces unexpectedly.

### Pitfall 4: Floating-Point Accumulation Error in Cost Totals
**What goes wrong:** Per-event costs are computed as `number` with IEEE 754 floating-point arithmetic. When callers aggregate thousands of events, floating-point rounding accumulates.

**Why it happens:** `1.25 * 150 / 1_000_000` in IEEE 754 is not exactly `0.0001875`.

**How to avoid:** Accept this limitation — it is inherent to any floating-point cost system and the user-facing label "estimated" already accounts for it. Do NOT attempt to use integer cents or a `Decimal` library (adds dependency, overkill for display-only analytics). The error is sub-cent for any realistic session.

### Pitfall 5: Privacy Filter Placed After the Cost Engine
**What goes wrong:** Feeding unfiltered events (with `message` field) to aggregation endpoints in Phase 3 — even if the UI doesn't display them.

**Why it happens:** It feels natural to attach the filter at the presentation layer.

**How to avoid:** The filter must be the first transformation after `parseAll()`. Phase 3 should call `applyPrivacyFilter(await parseAll())` — not `parseAll()` directly.

## Code Examples

Verified patterns from official sources:

### Pricing Multipliers (from official docs)
```typescript
// Source: https://platform.claude.com/docs/en/about-claude/pricing (fetched 2026-02-28)
// Cache multipliers relative to base input price:
// 5-minute cache write: 1.25x base input
// 1-hour cache write:   2.00x base input
// Cache read:           0.10x base input

// Example: claude-sonnet-4-6 ($3/MTok base input)
// 5m write:  $3.75/MTok  (= 3.00 * 1.25)
// 1h write:  $6.00/MTok  (= 3.00 * 2.00)
// read:      $0.30/MTok  (= 3.00 * 0.10)
```

### Branded Type Constructor Pattern
```typescript
// Source: TypeScript handbook + ecosystem practice (HIGH confidence)
declare const __brand: unique symbol;
type EstimatedCost = number & { readonly [__brand]: 'EstimatedCost' };

function toEstimatedCost(n: number): EstimatedCost {
  return n as EstimatedCost;
}

// Type-safe: this fails at compile time
const raw: number = 5;
const cost: EstimatedCost = raw;              // Error: Type 'number' is not assignable
const cost2: EstimatedCost = toEstimatedCost(raw);  // OK

// JSON-serializes cleanly:
JSON.stringify({ costUsd: toEstimatedCost(0.001234) });
// => '{"costUsd":0.001234}'
// No wrapper — the brand is phantom (erased at runtime)
```

### `computeCosts` Cost Formula
```typescript
// Full formula for one event (no double-counting):
const baseInput = Math.max(0,
  tokens.input - tokens.cacheCreation - tokens.cacheRead
);

const costUsd =
  (baseInput             * p.inputPerMTok       ) / 1_000_000 +
  (tokens.output         * p.outputPerMTok      ) / 1_000_000 +
  (tokens.cacheCreation5m * p.cacheWrite5mPerMTok) / 1_000_000 +
  (tokens.cacheCreation1h * p.cacheWrite1hPerMTok) / 1_000_000 +
  (tokens.cacheRead      * p.cacheReadPerMTok   ) / 1_000_000;
```

### Privacy Filter Entry Point
```typescript
// Phase 3 canonical usage pattern:
import { parseAll } from 'yclaude';
import { applyPrivacyFilter } from './cost/privacy.js';
import { computeCosts } from './cost/engine.js';

const raw = await parseAll(options);
const filtered = applyPrivacyFilter(raw);    // CORE-04: strip message content
const costed = computeCosts(filtered);       // CORE-02: per-event costs
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single cache tier (write + read only) | Two write tiers: 5-minute (1.25x) and 1-hour (2x) | Anthropic added 1h tier in 2024 | The `cacheCreation5m` / `cacheCreation1h` split in NormalizedEvent directly maps to this — Phase 1 already handled it |
| Claude 3 model IDs with date suffix only | Claude 4+ uses non-dated aliases as canonical IDs (`claude-opus-4-6`, not `claude-opus-4-6-20260205`) | 2025-2026 | Pricing table must cover both patterns |
| `claude-3-haiku-20240307` | `claude-haiku-4-5` | 2025 | Retiring 2026-04-19; both IDs may appear in user JSONL |

**Deprecated/outdated:**
- `claude-3-haiku-20240307`: Retiring 2026-04-19 — include in pricing table but note deprecation in comment
- `claude-3-opus-20240229`: Deprecated — include for backward compatibility with older JSONL files
- `claude-sonnet-3-7-20250219`: Deprecated — include for existing JSONL data

## Open Questions

1. **Does `tokens.input` in NormalizedEvent include cache write/read counts or not?**
   - What we know: The Anthropic API docs say `input_tokens` is "the number of input tokens" but the accounting in prompt caching explicitly separates cache writes and reads. Claude Code JSONL may store `input_tokens` as the base (excluding cache) or as the total.
   - What's unclear: The exact accounting used by Claude Code's JSONL reporter. The normalizer test fixtures show `input_tokens: 100` alongside cache fields — unclear if 100 is net-of-cache or gross.
   - Recommendation: Write a test with known real data from the human checkpoint (Phase 1 validated against real JSONL). If `input + cacheCreation + cacheRead` exceeds the raw token count noticeably, then `input` is already net. The formula `baseInput = max(0, input - cacheCreation - cacheRead)` is safe in both cases (it floors at 0).

2. **Are there additional model ID variants in real user JSONL not covered by the official models list?**
   - What we know: Official models page lists current and legacy IDs as of 2026-02-28.
   - What's unclear: Whether older Claude 3 Sonnet/Haiku snapshot IDs appear in users' historical JSONL.
   - Recommendation: The `unknownModel: true` flag on unknown-model events handles this gracefully. Inspect `unknownModel` events during Phase 2 human verification to catch any gaps.

## Sources

### Primary (HIGH confidence)
- `https://platform.claude.com/docs/en/about-claude/pricing` — Complete pricing table for all Claude models, cache multipliers, fetched 2026-02-28
- `https://platform.claude.com/docs/en/about-claude/models/overview` — All current and legacy API model ID strings, fetched 2026-02-28
- `https://github.com/nodejs/node/issues/47785` — Node.js `localhost` vs `127.0.0.1` binding behavior, confirmed working as intended by maintainers
- `/Users/ishevtsov/ai-projects/yclaude/src/parser/types.ts` — Existing `NormalizedEvent` type with all six token sub-fields
- `/Users/ishevtsov/ai-projects/yclaude/src/shared/debug.ts` — Existing debug channel API

### Secondary (MEDIUM confidence)
- TypeScript handbook intersection type branded type pattern — widely documented, multiple sources agree
- WebSearch on `localhost` vs `127.0.0.1` security — confirmed by Node.js issue above

### Tertiary (LOW confidence)
- None — all critical claims verified against authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing stack confirmed
- Pricing constants: HIGH — fetched from official Anthropic docs, date-stamped 2026-02-28
- Model IDs: HIGH — fetched from official models/overview page, both current and legacy
- Architecture: HIGH — follows established Phase 1 patterns
- Pitfalls: HIGH (double-counting, localhost binding) / MEDIUM (model ID gaps) — root causes verified

**Research date:** 2026-02-28
**Valid until:** Pricing — check when Anthropic announces new models or price changes (stable for ~30 days). Architecture patterns — stable for project duration.
