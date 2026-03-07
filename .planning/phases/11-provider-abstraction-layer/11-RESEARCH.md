# Phase 11: Provider Abstraction Layer - Research

**Researched:** 2026-03-07
**Domain:** Provider adapter pattern, type system refactoring, large-scale module reorganization in a TypeScript monorepo
**Confidence:** HIGH

## Summary

Phase 11 is a pure refactoring phase: no new features are visible to the user. The goal is to restructure the codebase so that all AI coding tool data flows through a unified provider interface, with existing Claude Code analytics working identically to v1.1. The refactoring involves three major concerns: (1) defining a `UnifiedEvent` type and `ProviderAdapter` interface, (2) physically moving existing parser/cost code into `src/providers/claude/`, and (3) rewiring the CLI entry point and API routes to consume `UnifiedEvent[]` instead of `CostEvent[]`/`NormalizedEvent[]`.

The existing codebase is well-structured with clear module boundaries: `src/parser/` (6 files), `src/cost/` (4 files), `src/server/` (4 files), `src/shared/` (1 file), and `src/index.ts`. There are 174 tests across 15 test files. The refactoring is mechanical -- no algorithmic changes, no new dependencies, no new features. The primary risk is breaking import paths across 15+ source files and 15 test files during the move.

**Primary recommendation:** Use a staged approach -- define new types first, move Claude code to new location with re-exports at old paths, then rewire consumers to use new imports. This minimizes the window where tests are broken and allows incremental validation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Unified Event Model:**
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

**Cost Model:**
- `costUsd: number` + `costSource: 'estimated' | 'reported' | 'pre-calculated'` on every UnifiedEvent
- Drop the `EstimatedCost` branded type -- replaced by costSource tag
- Per-provider costing: each adapter computes its own costs internally (Claude uses existing pricing engine, Cursor converts costInCents, OpenCode uses pre-calculated fields)
- Cross-provider totals show footnote with per-provider breakdown and cost-source labels

**Provider Auto-Detection:**
- Detect all known providers at startup, load all found -- no manual config needed
- `--dir` flag remains Claude-only override; other providers use their default paths
- `--exclude` flag added for opting out specific providers (e.g., `--exclude cursor,opencode`)
- Warn and skip on provider load failure (log to stderr, continue with other providers)
- Show all known providers in startup banner with status icons (found/not-found/error)
- Actionable error hints when a provider fails (e.g., permission fix suggestions)

**Provider Registry:**
- Static array of known adapters in `src/providers/registry.ts` (import + add to array to register)
- Parallel detection, then parallel loading of detected providers
- `loadProviders()` returns `{ events: UnifiedEvent[]; providers: ProviderInfo[] }`
- `ProviderInfo`: `{ id, name, status: 'loaded' | 'not-found' | 'error', eventCount, error? }`

**Conversation Data:**
- `--show-messages` is a global flag; enables conversation viewing for all providers that support it
- In Phase 11, only Claude supports conversations; Cursor/OpenCode conversation support deferred (v1.3+)
- Single `load()` method with `preserveContent` option -- no separate loadConversations()
- Privacy filtering is per-provider (each adapter strips message content when preserveContent=false)
- No separate rawEvents array on AppState -- UnifiedEvent.message is the content carrier
- Chats endpoints return all providers' conversations mixed; ?provider= filter added in Phase 13
- Chat responses include `provider` field in summary

**Refactor Boundary:**
- Full move: src/parser/ and src/cost/ relocate into src/providers/claude/
- Directory structure: `src/providers/types.ts`, `src/providers/registry.ts`, `src/providers/{name}/adapter.ts`
- API routes refactored to consume `UnifiedEvent[]` in Phase 11 (not deferred to Phase 13)
- AppState changes: `events: UnifiedEvent[]`, `providers: ProviderInfo[]`, `showMessages?: boolean`
- Breaking change to public npm API is acceptable (v1.2 minor bump)
- New public API: `import { loadProviders } from 'yclaude'` replaces parseAll/computeCosts
- All 174+ existing tests migrated to new import paths and adapter interface

**Startup Output:**
- Compact banner with status icon per provider (checkmark/cross/warning)
- Always show all known providers in banner (found + not-found + error)
- `--debug` shows per-provider detection and load timing

### Claude's Discretion
- Exact field naming/ordering in UnifiedEvent type
- Internal adapter implementation details (how Claude adapter wraps existing parser/normalizer/dedup)
- Test migration strategy (gradual vs big-bang)
- Error hint text for specific failure modes
- Debug log format and verbosity levels

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROV-01 | User sees all AI coding tools working through a unified data layer (UnifiedEvent type, ProviderAdapter interface, provider registry; existing Claude Code refactored to src/providers/claude/) | UnifiedEvent type definition, ProviderAdapter interface, registry pattern, Claude adapter wrapping existing parser/cost code, file move strategy, import path migration |
| PROV-02 | User's installed AI tools are auto-detected on startup with no manual configuration (check ~/.claude/, Cursor state.vscdb paths, OpenCode opencode.db) | Auto-detection via ProviderAdapter.detect() with parallel execution, startup banner with status icons, --exclude flag, error handling with actionable hints |
</phase_requirements>

## Standard Stack

### Core (No New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Type system for UnifiedEvent, ProviderAdapter interface | Already in project; strict mode with exactOptionalPropertyTypes |
| Hono | 4.12.3 | API routes consuming UnifiedEvent[] | Already in project; no change needed |
| Commander | 14.0.3 | CLI --exclude flag, existing flags | Already in project |
| Vitest | 4.0.18 | Test migration, new provider tests | Already in project |
| tsup | 8.5.1 | Build system entry points may need update | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Static adapter array | Dynamic plugin loader | Over-engineered for 3 known providers; compile-time safety lost |
| File moves with re-exports | File copies | Copies create divergence; moves with re-exports preserve backward compat |
| Big-bang test migration | Gradual migration | Big-bang is simpler for this project size (174 tests); gradual adds re-export complexity |

**No new npm dependencies needed for Phase 11.** The phase is purely a refactoring of existing code. Cursor/OpenCode adapters (Phases 12/14) add the `node:sqlite` builtin.

## Architecture Patterns

### Recommended Project Structure (Post-Refactor)

```
src/
  providers/
    types.ts                # UnifiedEvent, ProviderId, ProviderAdapter, ProviderInfo, LoadOptions
    registry.ts             # KNOWN_ADAPTERS array, loadProviders(), detect/load orchestration
    claude/
      adapter.ts            # ClaudeAdapter implements ProviderAdapter
      parser/
        reader.ts           # MOVED from src/parser/reader.ts (discoverJSONLFiles, streamJSONLFile)
        normalizer.ts       # MOVED from src/parser/normalizer.ts (normalizeEvent)
        dedup.ts            # MOVED from src/parser/dedup.ts (DedupAccumulator)
        schema.ts           # MOVED from src/parser/schema.ts (Zod schemas)
        types.ts            # MOVED from src/parser/types.ts (NormalizedEvent, ParseOptions)
      cost/
        engine.ts           # MOVED from src/cost/engine.ts (computeCosts for Claude)
        pricing.ts          # MOVED from src/cost/pricing.ts (MODEL_PRICING, tiers)
        privacy.ts          # MOVED from src/cost/privacy.ts (applyPrivacyFilter)
        types.ts            # MOVED from src/cost/types.ts (EstimatedCost -- kept internal for backward compat)
      __tests__/            # MOVED from src/parser/__tests__/ and src/cost/__tests__/
  server/
    server.ts               # AppState updated: events: UnifiedEvent[], providers: ProviderInfo[]
    routes/
      api.ts                # Refactored to consume UnifiedEvent[] (costUsd is a field on UnifiedEvent now)
    cli.ts                  # Uses loadProviders(), adds --exclude flag, shows startup banner
  shared/
    debug.ts                # Unchanged
  index.ts                  # New public API: export { loadProviders } from providers/registry
```

### Pattern 1: Provider Adapter Interface

**What:** Each provider implements a simple 4-method interface: `id`, `name`, `detect()`, `load(opts)`.
**When to use:** Every provider MUST implement this interface.
**Source:** CONTEXT.md locked decision

```typescript
// src/providers/types.ts

export type ProviderId = 'claude' | 'cursor' | 'opencode';

export type CostSource = 'estimated' | 'reported' | 'pre-calculated';

export interface UnifiedEvent {
  // Universal required fields
  id: string;                    // unique event ID (was 'uuid' in NormalizedEvent)
  provider: ProviderId;
  sessionId: string;
  timestamp: string;             // ISO 8601
  type: string;                  // user/assistant/system
  model?: string;

  // Token data
  tokens?: {
    input: number;
    output: number;
    cacheCreation: number;       // total cache write
    cacheRead: number;
    cacheCreation5m: number;     // Claude-specific 5-min tier; 0 for others
    cacheCreation1h: number;     // Claude-specific 1-hour tier; 0 for others
  };

  // Cost (computed by each adapter internally)
  costUsd: number;
  costSource: CostSource;

  // Session metadata
  cwd?: string;
  gitBranch?: string;
  durationMs?: number;
  message?: Record<string, unknown>;  // conversation content when preserveContent=true

  // Claude-specific optionals
  isSidechain?: boolean;
  agentId?: string;
  requestId?: string;
  unknownModel?: boolean;

  // Cursor-specific optionals (Phase 12)
  isAgentic?: boolean;
  costInCents?: number;

  // OpenCode-specific optionals (Phase 14)
  additions?: number;
  deletions?: number;
  filesChanged?: number;
  parentSessionId?: string;
  routedProvider?: string;
}

export interface LoadOptions {
  dir?: string;                  // Claude-only: --dir override
  preserveContent?: boolean;     // --show-messages: keep message field
  debug?: boolean;               // --debug: verbose logging
}

export interface ProviderAdapter {
  readonly id: ProviderId;
  readonly name: string;
  detect(): Promise<boolean>;
  load(opts: LoadOptions): Promise<UnifiedEvent[]>;
}

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  status: 'loaded' | 'not-found' | 'error';
  eventCount: number;
  error?: string;
}
```

### Pattern 2: Provider Registry with Parallel Detection/Loading

**What:** Static array of known adapters with parallel async detection and loading.
**When to use:** CLI startup orchestration.

```typescript
// src/providers/registry.ts

import { ClaudeAdapter } from './claude/adapter.js';
import type { LoadOptions, ProviderAdapter, ProviderInfo, UnifiedEvent } from './types.js';

const KNOWN_ADAPTERS: ProviderAdapter[] = [
  new ClaudeAdapter(),
  // Future: new CursorAdapter(), new OpenCodeAdapter()
];

export async function loadProviders(
  opts: LoadOptions & { exclude?: string[] },
): Promise<{ events: UnifiedEvent[]; providers: ProviderInfo[] }> {
  const adapters = KNOWN_ADAPTERS.filter(
    (a) => !(opts.exclude ?? []).includes(a.id),
  );

  // Parallel detection
  const detected = await Promise.all(
    adapters.map(async (adapter) => {
      try {
        const found = await adapter.detect();
        return { adapter, found, error: undefined };
      } catch (err) {
        return { adapter, found: false, error: String(err) };
      }
    }),
  );

  // Parallel loading of detected providers
  const loadResults = await Promise.all(
    detected.map(async ({ adapter, found, error }) => {
      if (!found || error) {
        return {
          info: {
            id: adapter.id,
            name: adapter.name,
            status: error ? 'error' as const : 'not-found' as const,
            eventCount: 0,
            ...(error ? { error } : {}),
          },
          events: [] as UnifiedEvent[],
        };
      }
      try {
        const events = await adapter.load(opts);
        return {
          info: {
            id: adapter.id,
            name: adapter.name,
            status: 'loaded' as const,
            eventCount: events.length,
          },
          events,
        };
      } catch (err) {
        return {
          info: {
            id: adapter.id,
            name: adapter.name,
            status: 'error' as const,
            eventCount: 0,
            error: String(err),
          },
          events: [] as UnifiedEvent[],
        };
      }
    }),
  );

  return {
    events: loadResults.flatMap((r) => r.events),
    providers: loadResults.map((r) => r.info),
  };
}
```

### Pattern 3: Claude Adapter Wrapping Existing Code

**What:** The Claude adapter delegates to the existing parser/cost/privacy pipeline, producing UnifiedEvent[].
**When to use:** Only for the Claude provider.

```typescript
// src/providers/claude/adapter.ts

import type { LoadOptions, ProviderAdapter, UnifiedEvent } from '../types.js';
import { computeCosts } from './cost/engine.js';
import { applyPrivacyFilter } from './cost/privacy.js';
import { DedupAccumulator } from './parser/dedup.js';
import { normalizeEvent } from './parser/normalizer.js';
import { discoverJSONLFiles, streamJSONLFile } from './parser/reader.js';

export class ClaudeAdapter implements ProviderAdapter {
  readonly id = 'claude' as const;
  readonly name = 'Claude Code';

  async detect(): Promise<boolean> {
    const files = await discoverJSONLFiles();
    return files.length > 0;
  }

  async load(opts: LoadOptions): Promise<UnifiedEvent[]> {
    // Reuse existing pipeline
    const files = await discoverJSONLFiles(opts.dir);
    const dedup = new DedupAccumulator();

    for (const file of files) {
      for await (const raw of streamJSONLFile(file)) {
        if (typeof raw !== 'object' || raw === null) continue;
        const event = normalizeEvent(
          raw as Record<string, unknown>,
          opts.preserveContent ? { preserveContent: true } : undefined,
        );
        if (event !== null) {
          dedup.add(event);
        }
      }
    }

    const normalized = dedup.results();

    // Privacy filter when not preserving content
    const filtered = opts.preserveContent ? normalized : applyPrivacyFilter(normalized);

    // Compute costs and convert to UnifiedEvent[]
    const costed = computeCosts(filtered);

    return costed.map((e) => ({
      id: e.uuid,
      provider: 'claude' as const,
      sessionId: e.sessionId,
      timestamp: e.timestamp,
      type: e.type,
      model: e.model,
      tokens: e.tokens,
      costUsd: e.costUsd as number,  // strip branded type
      costSource: 'estimated' as const,
      cwd: e.cwd,
      gitBranch: e.gitBranch,
      durationMs: e.durationMs,
      isSidechain: e.isSidechain,
      agentId: e.agentId,
      requestId: e.requestId,
      unknownModel: e.unknownModel,
      // Preserve message field if content was kept
      ...(opts.preserveContent && (e as Record<string, unknown>).message
        ? { message: (e as Record<string, unknown>).message as Record<string, unknown> }
        : {}),
    }));
  }
}
```

### Pattern 4: AppState Refactoring

**What:** AppState changes from dual `events`/`costs` arrays to a single `events: UnifiedEvent[]` with cost baked in.
**When to use:** Server creation and API route consumption.

```typescript
// src/server/server.ts (new)

export interface AppState {
  events: UnifiedEvent[];          // costUsd and costSource are ON each event
  providers: ProviderInfo[];       // provider detection results
  showMessages?: boolean;          // --show-messages flag
}
```

**Critical change:** The current API routes reference `state.costs` everywhere. After refactoring, they reference `state.events` directly because `costUsd` is a field on `UnifiedEvent`. This eliminates the separate `costs` vs `events` arrays and the separate `rawEvents` array.

### Pattern 5: API Route Migration

**What:** All API routes change from consuming `state.costs: CostEvent[]` to `state.events: UnifiedEvent[]`.
**When to use:** Every route handler in api.ts.

Key changes in routes:
1. Replace `state.costs` with `state.events`
2. Replace `e.costUsd` (EstimatedCost branded) with `e.costUsd` (plain number) -- no code change, just the type
3. Remove `PRICING_LAST_UPDATED`/`PRICING_SOURCE` imports from api.ts -- pricing metadata becomes per-provider (defer to Phase 13)
4. Chat endpoints: check `state.showMessages && e.message` instead of `state.rawEvents`
5. `unknownModel` flag preserved on UnifiedEvent -- existing warning logic works

### Anti-Patterns to Avoid

- **Dual source of truth:** Do NOT keep both `NormalizedEvent[]` and `UnifiedEvent[]` in AppState. The refactoring must collapse these into one array. Having two event arrays creates bugs where one is updated but not the other.
- **Leaking internal types:** The Claude adapter's internal `NormalizedEvent` and `CostEvent` types should NOT be exposed in the public API. `UnifiedEvent` is the only event type external consumers see.
- **Copying instead of moving:** Do NOT duplicate parser/cost code. Move files with `git mv`, then leave thin re-exports at old paths if backward compat is needed (but CONTEXT says breaking change is acceptable, so re-exports are optional).
- **Changing algorithm during refactor:** This phase must NOT change any computation logic (cost calculations, date bucketing, session grouping, etc.). Only the data types and module boundaries change. Any behavioral change makes the "zero regression" success criteria impossible to validate.
- **Assigning undefined to optional properties:** With `exactOptionalPropertyTypes: true`, you cannot write `{ message: undefined }`. Instead, conditionally spread: `...(message ? { message } : {})`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Provider detection paths | Custom path resolution per OS | `os.homedir()` + known relative paths | Platform-specific path logic is a known pitfall -- use the same approach as existing `reader.ts` |
| Parallel async with error isolation | Manual Promise.all with try/catch | Pattern shown in registry above | Each provider must fail independently without crashing others |
| Import path rewriting | Manual find-and-replace | IDE refactoring tools or systematic approach | 25+ import statements need updating; manual is error-prone |
| Type narrowing for optional fields | Type assertions everywhere | `exactOptionalPropertyTypes`-compatible conditional spreads | The project already uses this pattern in cli.ts |

**Key insight:** Phase 11 is a refactoring phase. The temptation is to "improve" things while moving code. Resist this. Move first, verify tests pass, then improve in a separate commit.

## Common Pitfalls

### Pitfall 1: Breaking the `parseAll()` Public API
**What goes wrong:** External npm consumers import `parseAll()` from `yclaude`. Moving `src/index.ts` to use the new provider architecture can break this export.
**Why it happens:** The public API is defined in `src/index.ts` and exported via `package.json` `"exports": { ".": "./dist/index.js" }`.
**How to avoid:** CONTEXT says breaking change is acceptable (v1.2 minor bump). Replace `parseAll()` with `loadProviders()` in `src/index.ts`. The old `parseAll` signature is gone.
**Warning signs:** Existing tests in `src/parser/__tests__/index.test.ts` import `parseAll` from `../../../src/index.js` -- these tests must be updated.

### Pitfall 2: `exactOptionalPropertyTypes` Violations
**What goes wrong:** TypeScript errors like "Type 'undefined' is not assignable to type 'string'" on optional fields.
**Why it happens:** `exactOptionalPropertyTypes: true` means optional fields cannot be explicitly set to `undefined`. You must either omit them or set them to a valid value.
**How to avoid:** Use conditional spread patterns: `...(value !== undefined ? { field: value } : {})`. This is already the project convention (see `cli.ts:36`, `cli.ts:48`).
**Warning signs:** TypeScript compile errors mentioning "exactOptionalPropertyTypes".

### Pitfall 3: Lost Message Content During UnifiedEvent Conversion
**What goes wrong:** The `message` field on `NormalizedEvent` is preserved via Zod `.passthrough()`. When converting to `UnifiedEvent`, this field can be lost if the mapping doesn't explicitly handle it.
**Why it happens:** `UnifiedEvent` has `message?: Record<string, unknown>` as a typed field. The spread-based conversion from `NormalizedEvent` to `UnifiedEvent` must explicitly transfer this field.
**How to avoid:** In the Claude adapter's `load()`, when `preserveContent` is true, explicitly map the `message` field from the passthrough data.
**Warning signs:** Chat/conversation endpoints return empty content blocks after the refactor.

### Pitfall 4: `EstimatedCost` Branded Type Removal Breaks Tests
**What goes wrong:** Tests that use `toEstimatedCost()` to construct test data or assert types will fail because the function no longer exists.
**Why it happens:** CONTEXT says "Drop the `EstimatedCost` branded type -- replaced by costSource tag."
**How to avoid:** In test migration, replace `toEstimatedCost(0.5)` with plain `0.5` and add `costSource: 'estimated'`. Update `makeCostEvent()` helpers in test files.
**Warning signs:** Import errors for `toEstimatedCost` from test files.

### Pitfall 5: API Routes Still Referencing `state.costs`
**What goes wrong:** The 1080-line `api.ts` file references `state.costs` approximately 20 times. Missing even one reference causes a runtime error (costs is undefined).
**Why it happens:** Mechanical find-and-replace misses some references, or the developer forgets one in a nested scope.
**How to avoid:** After refactoring, search for ALL occurrences of `state.costs` and `state.rawEvents` in `api.ts`. There should be zero. Then run the full test suite.
**Warning signs:** Tests pass but hitting `/api/v1/sessions` returns 500.

### Pitfall 6: tsup Entry Points Need Updating
**What goes wrong:** The build bundles `src/index.ts` and `src/server/cli.ts`. If new files are not importable from these entry points, the production build is incomplete.
**Why it happens:** tsup tree-shakes based on imports from entry points. If `src/providers/` code is only imported transitively, it might work, but `dts` generation may fail if the type graph changes significantly.
**How to avoid:** After the refactor, run `npm run build:prod` and verify the dist output contains the provider code. Also run `npm run typecheck`.
**Warning signs:** Build succeeds but `npx yclaude` crashes with "Cannot find module" errors.

### Pitfall 7: Detection Side Effects
**What goes wrong:** `detect()` for Cursor/OpenCode checks for SQLite files that don't exist on Claude-only machines, causing filesystem errors.
**Why it happens:** In Phase 11, only the Claude adapter is functional. But the registry still needs stub adapters for Cursor and OpenCode (CONTEXT: "Always show all known providers in banner").
**How to avoid:** In Phase 11, create minimal stub adapters for Cursor and OpenCode that return `false` from `detect()` and `[]` from `load()`. They exist only to populate the startup banner with "not found" status.
**Warning signs:** Error messages in stderr about missing Cursor/OpenCode data on machines that don't have them.

## Code Examples

### Example 1: UnifiedEvent Construction in Claude Adapter

```typescript
// Converting a NormalizedEvent + CostEvent pipeline output to UnifiedEvent
// The adapter internalizes the entire parse -> privacy -> cost pipeline

const unified: UnifiedEvent = {
  id: costEvent.uuid,
  provider: 'claude',
  sessionId: costEvent.sessionId,
  timestamp: costEvent.timestamp,
  type: costEvent.type,
  costUsd: costEvent.costUsd as number,
  costSource: 'estimated',
  // Conditional optional fields (exactOptionalPropertyTypes-safe)
  ...(costEvent.model !== undefined ? { model: costEvent.model } : {}),
  ...(costEvent.tokens !== undefined ? { tokens: costEvent.tokens } : {}),
  ...(costEvent.cwd !== undefined ? { cwd: costEvent.cwd } : {}),
  ...(costEvent.gitBranch !== undefined ? { gitBranch: costEvent.gitBranch } : {}),
  ...(costEvent.durationMs !== undefined ? { durationMs: costEvent.durationMs } : {}),
  ...(costEvent.isSidechain !== undefined ? { isSidechain: costEvent.isSidechain } : {}),
  ...(costEvent.agentId !== undefined ? { agentId: costEvent.agentId } : {}),
  ...(costEvent.requestId !== undefined ? { requestId: costEvent.requestId } : {}),
  ...(costEvent.unknownModel !== undefined ? { unknownModel: costEvent.unknownModel } : {}),
};
```

### Example 2: CLI Startup with Provider Registry

```typescript
// src/server/cli.ts (refactored)

import { loadProviders } from '../providers/registry.js';

// Parse CLI args (add --exclude)
program
  .option('--exclude <providers>', 'exclude providers (comma-separated)', '')

const opts = program.opts();
const exclude = opts.exclude ? opts.exclude.split(',').map((s: string) => s.trim()) : [];

const { events, providers } = await loadProviders({
  ...(opts.dir !== undefined ? { dir: opts.dir } : {}),
  preserveContent: showMessages,
  debug: opts.debug ?? false,
  exclude,
});

// Startup banner
for (const p of providers) {
  const icon = p.status === 'loaded' ? '\x1b[32m✓\x1b[0m'
    : p.status === 'not-found' ? '\x1b[90m-\x1b[0m'
    : '\x1b[33m!\x1b[0m';
  const detail = p.status === 'loaded' ? `${p.eventCount} events`
    : p.status === 'error' ? p.error ?? 'unknown error'
    : 'not installed';
  console.log(`  ${icon} ${p.name}: ${detail}`);
}

const app = createApp({
  events,
  providers,
  ...(showMessages ? { showMessages } : {}),
});
```

### Example 3: API Route Consuming UnifiedEvent

```typescript
// Before (v1.1):
app.get('/summary', (c) => {
  let costs = state.costs;  // CostEvent[]
  // ...filter...
  const totalCost = costs.reduce((sum, e) => sum + e.costUsd, 0);

// After (v1.2):
app.get('/summary', (c) => {
  let events = state.events;  // UnifiedEvent[]
  // ...filter...
  const totalCost = events.reduce((sum, e) => sum + e.costUsd, 0);
  // costUsd is now a plain number on UnifiedEvent -- no type change needed in logic
```

### Example 4: Stub Adapter for Future Providers

```typescript
// src/providers/cursor/adapter.ts (Phase 11 stub)

import type { LoadOptions, ProviderAdapter, UnifiedEvent } from '../types.js';

export class CursorAdapter implements ProviderAdapter {
  readonly id = 'cursor' as const;
  readonly name = 'Cursor';

  async detect(): Promise<boolean> {
    // Phase 12 will implement real detection
    return false;
  }

  async load(_opts: LoadOptions): Promise<UnifiedEvent[]> {
    return [];
  }
}
```

### Example 5: Test Migration Pattern (makeCostEvent -> makeUnifiedEvent)

```typescript
// Before (v1.1):
function makeCostEvent(costUsd: number, timestamp?: string): CostEvent {
  return {
    ...makeEvent({ timestamp }),
    costUsd: toEstimatedCost(costUsd),
  };
}

// After (v1.2):
function makeUnifiedEvent(
  costUsd: number,
  overrides?: Partial<UnifiedEvent>,
): UnifiedEvent {
  return {
    id: `test-uuid-${Math.random()}`,
    provider: 'claude',
    sessionId: 'session-1',
    timestamp: '2024-01-01T00:00:00Z',
    type: 'assistant',
    costUsd,
    costSource: 'estimated',
    ...overrides,
  };
}
```

## State of the Art

| Old Approach (v1.1) | New Approach (v1.2) | Impact |
|----------------------|---------------------|--------|
| `NormalizedEvent` -> `applyPrivacyFilter` -> `computeCosts` -> `CostEvent` pipeline in cli.ts | Each adapter produces `UnifiedEvent[]` with cost already computed | Pipeline logic moves inside adapters; cli.ts becomes a thin orchestrator |
| `EstimatedCost` branded type enforces cost labeling | `costSource: 'estimated' \| 'reported' \| 'pre-calculated'` tag | More flexible -- supports non-estimated costs from Cursor/OpenCode |
| `AppState = { events, costs, rawEvents?, showMessages? }` | `AppState = { events: UnifiedEvent[], providers: ProviderInfo[], showMessages? }` | Single event array; message content on `UnifiedEvent.message` when showMessages=true |
| `state.costs` in every API route | `state.events` in every API route | Same data, different name, costUsd is a plain number |
| `src/parser/` + `src/cost/` as top-level modules | `src/providers/claude/parser/` + `src/providers/claude/cost/` | Claude-specific code encapsulated; clean separation for future providers |

**Deprecated/outdated after this phase:**
- `parseAll()` from `src/index.ts` -- replaced by `loadProviders()`
- `computeCosts()` as a public function -- internalized in each adapter
- `applyPrivacyFilter()` as a public function -- internalized in each adapter
- `EstimatedCost` branded type -- replaced by `costSource` tag on `UnifiedEvent`
- `CostEvent` type -- replaced by `UnifiedEvent` (which has costUsd + costSource)
- `NormalizedEvent` as a public type -- replaced by `UnifiedEvent`

## File Move Map

This is the definitive list of file moves for the refactoring:

| Source (v1.1) | Destination (v1.2) | Notes |
|---------------|--------------------|-------|
| `src/parser/reader.ts` | `src/providers/claude/parser/reader.ts` | No code changes |
| `src/parser/normalizer.ts` | `src/providers/claude/parser/normalizer.ts` | No code changes |
| `src/parser/dedup.ts` | `src/providers/claude/parser/dedup.ts` | Update import path for debug.ts |
| `src/parser/schema.ts` | `src/providers/claude/parser/schema.ts` | No code changes |
| `src/parser/types.ts` | `src/providers/claude/parser/types.ts` | Kept as internal type; UnifiedEvent is the public type |
| `src/cost/engine.ts` | `src/providers/claude/cost/engine.ts` | Update import for parser types |
| `src/cost/pricing.ts` | `src/providers/claude/cost/pricing.ts` | No code changes |
| `src/cost/privacy.ts` | `src/providers/claude/cost/privacy.ts` | Update import for parser types |
| `src/cost/types.ts` | `src/providers/claude/cost/types.ts` | Kept internal; EstimatedCost still used internally |
| `src/parser/__tests__/*.test.ts` | `src/providers/claude/__tests__/*.test.ts` | Update all import paths |
| `src/cost/__tests__/*.test.ts` | `src/providers/claude/__tests__/*.test.ts` | Update all import paths |
| -- (new) | `src/providers/types.ts` | UnifiedEvent, ProviderAdapter, etc. |
| -- (new) | `src/providers/registry.ts` | loadProviders() orchestration |
| -- (new) | `src/providers/claude/adapter.ts` | ClaudeAdapter class |
| -- (new) | `src/providers/cursor/adapter.ts` | CursorAdapter stub |
| -- (new) | `src/providers/opencode/adapter.ts` | OpenCodeAdapter stub |

**Import path changes across consumers (16 files affected):**
- `src/index.ts` -- complete rewrite (new public API)
- `src/server/server.ts` -- import UnifiedEvent from providers/types
- `src/server/routes/api.ts` -- import UnifiedEvent, remove CostEvent/NormalizedEvent imports
- `src/server/cli.ts` -- import loadProviders from providers/registry
- `src/server/__tests__/api.test.ts` -- update makeEvent/makeCostEvent helpers
- `src/server/__tests__/api-sessions.test.ts` -- update helpers
- `src/server/__tests__/api-chats.test.ts` -- update helpers
- `src/server/__tests__/server.test.ts` -- update AppState construction
- `src/server/__tests__/cli.test.ts` -- add --exclude test

## Open Questions

1. **Should old `src/parser/` and `src/cost/` directories be removed entirely or left with re-exports?**
   - What we know: CONTEXT says "Breaking change to public npm API is acceptable (v1.2 minor bump)" -- so re-exports are not required.
   - Recommendation: Delete old directories entirely. Clean break. This avoids confusion about which is canonical.

2. **How should `PRICING_LAST_UPDATED` and `PRICING_SOURCE` be exposed after the move?**
   - What we know: The `/api/v1/pricing-meta` endpoint returns these values. They're Claude-specific.
   - What's unclear: Should this endpoint become provider-aware in Phase 11, or stay Claude-only?
   - Recommendation: Keep it Claude-specific in Phase 11. The endpoint can be generalized in Phase 13 when `?provider=` filtering is added.

3. **Should the `id` field on UnifiedEvent use a different name than `uuid`?**
   - What we know: CONTEXT shows `id` in the UnifiedEvent definition. Existing Claude data uses `uuid`. Other providers have different ID formats.
   - Recommendation: Use `id` as the universal field name. Claude adapter maps `uuid -> id`. This is cleaner and provider-agnostic.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROV-01 | UnifiedEvent type has all required fields | unit | `npx vitest run src/providers/__tests__/types.test.ts -t "UnifiedEvent"` | Wave 0 |
| PROV-01 | ProviderAdapter interface satisfied by ClaudeAdapter | unit | `npx vitest run src/providers/claude/__tests__/adapter.test.ts` | Wave 0 |
| PROV-01 | Provider registry loadProviders() returns events + provider info | unit | `npx vitest run src/providers/__tests__/registry.test.ts` | Wave 0 |
| PROV-01 | Claude adapter produces same analytics as v1.1 (zero regression) | integration | `npx vitest run src/providers/claude/__tests__/` | Wave 0 (migrated from existing tests) |
| PROV-01 | All 174+ existing tests pass with new import paths | regression | `npx vitest run` | Existing (migrated) |
| PROV-01 | API routes work with UnifiedEvent[] (summary, sessions, chats) | integration | `npx vitest run src/server/__tests__/` | Existing (migrated) |
| PROV-02 | Auto-detection returns correct status for each provider | unit | `npx vitest run src/providers/__tests__/registry.test.ts -t "detect"` | Wave 0 |
| PROV-02 | Startup banner shows all providers with status icons | unit | `npx vitest run src/server/__tests__/cli.test.ts -t "banner"` | Wave 0 |
| PROV-02 | --exclude flag prevents specific providers from loading | unit | `npx vitest run src/server/__tests__/cli.test.ts -t "exclude"` | Wave 0 |
| PROV-02 | Provider load failure is graceful (warns, continues) | unit | `npx vitest run src/providers/__tests__/registry.test.ts -t "error"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + `npm run typecheck` + `npm run build:prod` before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/providers/__tests__/types.test.ts` -- covers PROV-01 (UnifiedEvent type validation)
- [ ] `src/providers/__tests__/registry.test.ts` -- covers PROV-01, PROV-02 (loadProviders, detect, error handling)
- [ ] `src/providers/claude/__tests__/adapter.test.ts` -- covers PROV-01 (ClaudeAdapter implements interface correctly)
- [ ] Migrate 11 test files from `src/parser/__tests__/` and `src/cost/__tests__/` to `src/providers/claude/__tests__/`
- [ ] Update 4 test files in `src/server/__tests__/` to use UnifiedEvent instead of CostEvent/NormalizedEvent

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection: `src/parser/`, `src/cost/`, `src/server/`, `src/index.ts` -- all source files read in full
- `.planning/phases/11-provider-abstraction-layer/11-CONTEXT.md` -- locked user decisions
- `.planning/research/ARCHITECTURE.md` -- project-level architecture research
- TypeScript strict mode with `exactOptionalPropertyTypes: true` verified in `tsconfig.json`
- 174 tests passing verified via `npx vitest run` (15 test files, 466ms)

### Secondary (MEDIUM confidence)
- `.planning/PROJECT.md` -- project context and tech stack
- `.planning/ROADMAP.md` -- phase dependencies and success criteria

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, pure refactoring of existing code
- Architecture: HIGH -- adapter pattern well-understood, file moves are mechanical, CONTEXT decisions are comprehensive
- Pitfalls: HIGH -- identified from direct codebase analysis (exactOptionalPropertyTypes, import paths, 1080-line api.ts)
- Test migration: HIGH -- all 15 test files inspected, import paths catalogued

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable -- internal refactoring, no external dependencies)
