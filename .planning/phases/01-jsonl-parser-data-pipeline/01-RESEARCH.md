# Phase 1: JSONL Parser & Data Pipeline - Research

**Researched:** 2026-02-28
**Domain:** Node.js JSONL file parsing, TypeScript ESM project setup, file discovery
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Tech Stack**
- TypeScript + ESM throughout the project
- This is the baseline for all phases — every subsequent phase follows the same stack

**Event Output Shape**
- Extract as many fields as possible from each JSONL line: type, tokens (input/output/cache_creation/cache_read broken out), model, session ID, project, timestamp, uuid, costUSD, durationMs, message role, tool_calls, request_id — everything available
- Unknown or unrecognized fields pass through as-is under their original key — nothing is dropped
- Future phases can consume new fields without requiring a parser change

**Error Handling**
- A global `--debug` flag controls verbose output across the entire application
- Skipped/malformed lines are logged to stderr only when `--debug` is active — silent by default
- The parser never crashes on a bad line; skip and continue

**File Discovery**
- Auto-detect all standard Claude data paths: `~/.claude/projects/**/*.jsonl`, `~/.config/claude/projects/**/*.jsonl`, and `$CLAUDE_CONFIG_DIR` if set
- When multiple paths exist, merge data from all of them — deduplication handles overlaps
- A `--dir <path>` flag overrides discovery and reads from the specified directory instead

### Claude's Discretion

- TypeScript type definitions and schema design for the event object
- Internal streaming vs batch parsing approach
- Deduplication data structure (Map by UUID, etc.)
- How CLAUDE_CONFIG_DIR interacts with the default paths (override vs append)

### Deferred Ideas (OUT OF SCOPE)

- UI error surfacing for parse errors — discussed when Phase 4+ frontend is implemented
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CORE-01 | User's JSONL data is parsed reliably — per-line error handling, UUID deduplication, handles `<persisted-output>` wrapped lines, detects both `~/.claude` and `~/.config/claude` paths, respects `CLAUDE_CONFIG_DIR` env var | Verified against real JSONL corpus; streaming approach with `readline`; deduplication via `Map<string, NormalizedEvent>`; all success criteria achievable with native Node.js APIs |
</phase_requirements>

## Summary

Phase 1 establishes the entire data foundation. This is a greenfield project with no existing code. The parser must read Claude Code JSONL files from disk, normalize each line into a structured event object, deduplicate by UUID, and expose results as an in-memory collection for Phase 2 (Cost Engine) to consume. The phase sets the canonical TypeScript + ESM pattern all subsequent phases follow.

Verified against real JSONL data on this machine (23 files, 1,823 lines across 2 projects). All critical behaviors are confirmed: `readline` with `createReadStream` handles 50KB+ lines without issues, native `node:fs/promises` glob discovers all JSONL files including subagent subdirectories, and every parse error in testing is suppressed to `null` rather than throwing. Zod v4 is now current (v4.3.6) — the project STACK.md references v3, but v4 is the right choice for new projects.

The most important finding from real data analysis: **project slug decoding is ambiguous**. The slug `-Users-ishevtsov-ai-projects-yclaude` cannot be naively decoded to `/Users/ishevtsov/ai-projects/yclaude` (dashes in directory names are indistinguishable from path separators). Use `cwd` from event records as the ground truth for project path resolution — it is available on every `assistant`, `user`, `progress`, and `system` event.

**Primary recommendation:** Use `node:readline` + `node:fs/promises` glob with native ESM `for-await-of` — no third-party parsing library needed. Zod v4 for schema validation of normalized events. A `Map<string, NormalizedEvent>` for deduplication. Project paths resolved from event `cwd` fields, not slug decoding.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Language | Non-negotiable; strict mode from day 1 as established in project decisions |
| Node.js built-ins (`readline`, `fs/promises`) | Node 22+ | JSONL streaming, file discovery, glob | Native ESM, zero deps, sufficient for all parsing needs |
| Zod | 4.3.6 | Event schema validation and type inference | `z.infer<>` generates TypeScript types from schemas; `.safeParse()` is the correct error-handling pattern for per-line validation |
| tsup | 8.5.1 | CLI bundler | Produces ESM output; esbuild-powered; the project-established bundler |
| Vitest | 4.0.18 | Test framework | Native Vite integration; fastest in ecosystem; no config needed for pure Node tests |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs/promises` `glob()` | Node 22 built-in | File discovery | Replaces the `glob` npm package entirely for Node 22+ targets |
| `node:readline` `createInterface` | Node built-in | Line-by-line streaming | `for await (const line of rl)` is idiomatic ESM; handles 50KB+ lines natively |
| `node:os` `homedir()` | Node built-in | `~` path resolution | Required for detecting `~/.claude` and `~/.config/claude` |
| `node:path` | Node built-in | Path manipulation | Used for constructing discovery patterns |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `glob()` | `glob` npm package (10.x) | Native is sufficient and zero-dep; `glob` npm adds 200KB to bundle |
| `readline` built-in | `split2` or `ndjson` packages | Adds npm deps; readline handles the 50KB line case equally well |
| Zod v4 | Zod v3 | v4 is current as of 2026; project STACK.md references v3 (written pre-v4-stable) — use v4 |
| `Map<string, NormalizedEvent>` dedup | `Set<string>` of seen UUIDs | Map approach retains the canonical event for debugging; Set approach uses less memory; both are O(1) per lookup |

**Installation:**
```bash
npm install zod
npm install -D typescript tsup vitest @types/node
```

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

```
src/
├── parser/
│   ├── types.ts           # NormalizedEvent, RawEvent, ParseResult interfaces
│   ├── schema.ts          # Zod schemas for raw event validation
│   ├── reader.ts          # File discovery + JSONL streaming
│   ├── normalizer.ts      # Raw event → NormalizedEvent transformation
│   └── dedup.ts           # UUID deduplication logic
├── shared/
│   └── debug.ts           # Global --debug flag + stderr logging helper
└── index.ts               # Public API: parseAll(options) → NormalizedEvent[]
```

This is a subset of the full architecture from ARCHITECTURE.md. Phase 1 establishes `src/parser/` and `src/shared/debug.ts`. Phase 2 adds `src/aggregation/`. Phase 3 adds `src/cli/` and `src/server/`.

### Pattern 1: Streaming JSONL Parsing with readline

**What:** Use `node:readline` `createInterface` with `createReadStream` for line-by-line processing. Wrap each `JSON.parse` in a try/catch. Emit parsed objects via `for await`.

**When to use:** Always — never load entire JSONL files into memory.

**Example:**
```typescript
// src/parser/reader.ts
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export async function* streamJSONLFile(filePath: string): AsyncGenerator<unknown> {
  const stream = createReadStream(filePath);
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      yield JSON.parse(trimmed);
    } catch {
      // Caller handles error reporting — generator just skips bad lines
    }
  }
}
```

### Pattern 2: Native Glob for File Discovery

**What:** Use `node:fs/promises` `glob()` (Node 22 built-in) to discover all JSONL files. Supports `**` recursive patterns natively.

**When to use:** Always — zero deps, available on Node 22 LTS.

**Example:**
```typescript
// src/parser/reader.ts
import { glob } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function discoverJSONLFiles(overrideDir?: string): Promise<string[]> {
  const claudeDir = process.env['CLAUDE_CONFIG_DIR'];

  let baseDirs: string[];
  if (overrideDir) {
    baseDirs = [overrideDir];
  } else if (claudeDir) {
    baseDirs = [claudeDir];
  } else {
    const home = os.homedir();
    baseDirs = [
      path.join(home, '.claude', 'projects'),
      path.join(home, '.config', 'claude', 'projects'),
    ];
  }

  const allFiles: string[] = [];
  for (const base of baseDirs) {
    try {
      for await (const file of glob(`${base}/**/*.jsonl`)) {
        allFiles.push(file);
      }
    } catch {
      // Directory doesn't exist — skip silently
    }
  }

  return allFiles;
}
```

**CLAUDE_CONFIG_DIR behavior (Claude's Discretion):** When `CLAUDE_CONFIG_DIR` is set, use it as the ONLY base directory (override, not append). This mirrors how Claude Code itself uses the variable. When `--dir` is provided by the user, it also overrides everything and is used exclusively. The two default paths (`~/.claude` and `~/.config/claude`) are both checked in parallel only when neither override is active.

### Pattern 3: Zod Schema Validation for Normalized Events

**What:** Define the canonical `NormalizedEvent` shape in Zod. Use `.safeParse()` to validate each raw event. Use `z.infer<typeof NormalizedEventSchema>` to generate TypeScript types automatically.

**When to use:** For the output contract (NormalizedEvent). Raw event parsing uses permissive schemas with `.passthrough()` to allow unknown fields per the user's decision.

**Example:**
```typescript
// src/parser/types.ts
import { z } from 'zod';

// Permissive schema for raw events — unknown fields pass through
export const RawAssistantUsageSchema = z.object({
  input_tokens: z.number().default(0),
  output_tokens: z.number().default(0),
  cache_creation_input_tokens: z.number().default(0),
  cache_read_input_tokens: z.number().default(0),
  cache_creation: z.object({
    ephemeral_5m_input_tokens: z.number().default(0),
    ephemeral_1h_input_tokens: z.number().default(0),
  }).optional(),
  server_tool_use: z.record(z.unknown()).optional(),
  service_tier: z.string().optional(),
  inference_geo: z.string().optional(),
  speed: z.string().optional(),
  iterations: z.array(z.unknown()).optional(),
}).passthrough();  // unknown fields pass through per user decision

export const NormalizedEventSchema = z.object({
  uuid: z.string(),
  type: z.string(),
  timestamp: z.string(),
  sessionId: z.string(),
  // Token fields — only present on assistant events
  tokens: z.object({
    input: z.number(),
    output: z.number(),
    cacheCreation: z.number(),
    cacheRead: z.number(),
    cacheCreation5m: z.number(),
    cacheCreation1h: z.number(),
  }).optional(),
  model: z.string().optional(),
  requestId: z.string().optional(),
  isSidechain: z.boolean().optional(),
  agentId: z.string().optional(),
  gitBranch: z.string().optional(),
  cwd: z.string().optional(),
  // Pass-through for all other fields
}).passthrough();

export type NormalizedEvent = z.infer<typeof NormalizedEventSchema>;
```

### Pattern 4: UUID Deduplication with Map

**What:** As events are parsed from (potentially overlapping) JSONL files, track all seen UUIDs in a `Map<string, NormalizedEvent>`. First-seen wins; subsequent entries with the same UUID are silently dropped.

**When to use:** Always — the user decision states deduplication is required.

**Example:**
```typescript
// src/parser/dedup.ts
export function deduplicateEvents(events: NormalizedEvent[]): NormalizedEvent[] {
  const seen = new Map<string, NormalizedEvent>();
  for (const event of events) {
    if (!seen.has(event.uuid)) {
      seen.set(event.uuid, event);
    }
  }
  return Array.from(seen.values());
}

// Alternative: streaming dedup (better for memory)
export class DedupAccumulator {
  private seen = new Map<string, NormalizedEvent>();

  add(event: NormalizedEvent): boolean {
    if (this.seen.has(event.uuid)) return false;  // duplicate
    this.seen.set(event.uuid, event);
    return true;  // new event
  }

  results(): NormalizedEvent[] {
    return Array.from(this.seen.values());
  }
}
```

### Pattern 5: Global Debug Flag

**What:** A module-level singleton that reads `process.argv` for `--debug` or an environment variable. Other modules import and call `debugLog()` which writes to stderr.

**When to use:** Phase 1 establishes the debug pattern; Phase 3 CLI wires it to the `--debug` flag via commander.

**Example:**
```typescript
// src/shared/debug.ts
let debugEnabled = process.argv.includes('--debug') ||
                   process.env['YCLAUDE_DEBUG'] === '1';

export function enableDebug(): void {
  debugEnabled = true;
}

export function debugLog(message: string, ...args: unknown[]): void {
  if (debugEnabled) {
    process.stderr.write(`[debug] ${message}\n`);
    if (args.length > 0) {
      process.stderr.write(JSON.stringify(args, null, 2) + '\n');
    }
  }
}
```

### Anti-Patterns to Avoid

- **`fs.readFileSync` on JSONL files:** Loads the entire file into memory. Files can be 12MB+ (per GitHub issue #23948 which documented `<persisted-output>` bloat). Always use `createReadStream` + `readline`.
- **`JSON.parse` without per-line try/catch:** One malformed line crashes the entire parser. Per the user decision, each line must be independently wrapped.
- **Naive slug decoding:** The formula `slug.replace(/-/g, '/')` produces incorrect paths when directory names contain dashes (e.g., `ai-projects`, `fat-panda`). Use `cwd` from event records instead.
- **Treating each JSONL file as a separate session:** A `sessionId` appears across multiple files including subagent files under `{sessionId}/subagents/agent-*.jsonl`. Aggregate by `sessionId`, not by file.
- **Hardcoding only `~/.claude`:** The path moved to `~/.config/claude` in Claude Code v1.0.30. Check both defaults.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSONL line streaming | Custom buffer/split implementation | `node:readline` createInterface | Handles any line length, edge cases, backpressure natively |
| File glob/discovery | Custom `readdir` recursion | `node:fs/promises` `glob()` | Native in Node 22; handles `**` patterns, symlinks, permissions |
| Event schema + TypeScript types | Manual interface declarations | Zod v4 `z.infer<>` | Single source of truth; validates at parse time; types derived automatically |
| Cross-platform home dir | `process.env.HOME || process.env.USERPROFILE` | `node:os` `homedir()` | Handles all platforms correctly including edge cases |

**Key insight:** The parser's complexity is entirely in the normalization logic (understanding Claude Code's field structure), not in the I/O mechanics. Native Node.js handles all I/O concerns correctly — invest effort in the event type mapping, not the streaming infrastructure.

## Common Pitfalls

### Pitfall 1: Assuming `<persisted-output>` Wraps Entire JSONL Lines

**What goes wrong:** Documentation and GitHub issues describe `<persisted-output>` as causing problems with JSONL parsing. Developers assume these tags appear as standalone lines that break JSON.parse.

**Why it happens:** The GitHub issue #23948 describes file size bloat from these tags. It's natural to assume they are wrapping JSONL lines at the top level.

**How to avoid:** Verified against real data on this machine — `<persisted-output>` tags appear ONLY inside JSON string values (specifically inside `message.content[].content` tool result strings). Every line in our corpus is valid JSON even when `<persisted-output>` is present. The per-line `try/catch` handles any edge case. No special tag-stripping logic is needed.

**Warning signs:** Test against real JSONL files before building special-case handling.

### Pitfall 2: Wrong `CLAUDE_CONFIG_DIR` Interaction Logic

**What goes wrong:** Treating `CLAUDE_CONFIG_DIR` as an additional path to append to the default list, rather than as a complete override. This causes double-counting of data.

**Why it happens:** The variable name suggests "config dir" not "replace all defaults."

**How to avoid:** When `CLAUDE_CONFIG_DIR` is set, use it exclusively. When `--dir` is provided by the user, use it exclusively. Only fall back to checking both `~/.claude/projects` and `~/.config/claude/projects` when neither override is active.

### Pitfall 3: Missing Subagent JSONL Files

**What goes wrong:** Parser discovers `~/.claude/projects/{slug}/*.jsonl` but misses `~/.claude/projects/{slug}/{sessionId}/subagents/agent-*.jsonl`. Subagent token usage (which can be significant) is entirely excluded.

**Why it happens:** The glob pattern `**/*.jsonl` should match recursively, but developers sometimes use `*/*.jsonl` (single level only).

**How to avoid:** Use `{base}/**/*.jsonl` (double star) to recurse into all subdirectories. Verified: `node:fs/promises` `glob()` with `**` correctly finds files at all depths including `{slug}/{sessionId}/subagents/agent-*.jsonl`.

**Warning signs:** Token counts seem lower than expected; sessions with `isSidechain: true` events are present but lack `assistant` events.

### Pitfall 4: Token Count Inflation from Duplicate UUIDs

**What goes wrong:** The same API response appears in multiple JSONL lines (duplicated across overlapping file reads, or from Claude Code's own serialization bugs). Summing tokens without UUID deduplication inflates counts 2-8x.

**Why it happens:** Claude Code has documented bugs with token count duplication (issues #5904 and #6805). The `--dir` flag with both default paths active could also read overlapping data.

**How to avoid:** UUID deduplication is non-negotiable. Every event with a `uuid` field must be tracked; subsequent occurrences silently dropped. Verified: all event types with `uuid` are `assistant`, `user`, `progress`, and `system` (not `file-history-snapshot` or `queue-operation`).

### Pitfall 5: TypeScript ESM `.js` Extension Requirement

**What goes wrong:** TypeScript with `"module": "NodeNext"` requires import paths to use `.js` extensions (e.g., `import { foo } from './foo.js'`) even though the source files are `.ts`. Developers omit the extension and get runtime errors.

**Why it happens:** NodeNext module resolution follows Node's ESM spec which requires explicit extensions.

**How to avoid:** Configure `tsup` to handle this automatically. tsup 8.5.x with `format: ['esm']` resolves `.ts` imports correctly. If writing manual imports, always use `.js` extension in import paths.

## Code Examples

Verified patterns from testing against real JSONL data:

### Complete Event Discovery and Streaming

```typescript
// src/parser/reader.ts
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { glob } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { debugLog } from '../shared/debug.js';

export async function discoverJSONLFiles(overrideDir?: string): Promise<string[]> {
  const claudeConfigDir = process.env['CLAUDE_CONFIG_DIR'];
  const home = os.homedir();

  let patterns: string[];
  if (overrideDir) {
    patterns = [`${path.resolve(overrideDir)}/**/*.jsonl`];
  } else if (claudeConfigDir) {
    patterns = [`${path.resolve(claudeConfigDir)}/projects/**/*.jsonl`];
  } else {
    patterns = [
      path.join(home, '.claude', 'projects', '**', '*.jsonl'),
      path.join(home, '.config', 'claude', 'projects', '**', '*.jsonl'),
    ];
  }

  const files: string[] = [];
  for (const pattern of patterns) {
    try {
      for await (const file of glob(pattern)) {
        files.push(file);
      }
    } catch {
      debugLog(`Directory not found for pattern: ${pattern}`);
    }
  }

  debugLog(`Discovered ${files.length} JSONL files`);
  return files;
}

export async function* streamJSONLFile(filePath: string): AsyncGenerator<unknown> {
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      yield JSON.parse(trimmed);
    } catch (err) {
      debugLog(`Skipping malformed line ${lineNum} in ${filePath}: ${err}`);
      // Per user decision: never crash, just skip
    }
  }
}
```

### Normalizer for Claude Code Assistant Events

```typescript
// src/parser/normalizer.ts
import type { NormalizedEvent } from './types.js';

export function normalizeAssistantEvent(raw: Record<string, unknown>): NormalizedEvent | null {
  // Only assistant events with usage data contribute to token counts
  if (raw['type'] !== 'assistant') return null;

  const msg = raw['message'] as Record<string, unknown> | undefined;
  if (!msg) return null;

  const usage = msg['usage'] as Record<string, unknown> | undefined;
  const cacheCreation = (usage?.['cache_creation'] as Record<string, unknown>) ?? {};

  return {
    uuid: raw['uuid'] as string,
    type: 'assistant',
    timestamp: raw['timestamp'] as string,
    sessionId: raw['sessionId'] as string,
    tokens: usage ? {
      input: (usage['input_tokens'] as number) ?? 0,
      output: (usage['output_tokens'] as number) ?? 0,
      cacheCreation: (usage['cache_creation_input_tokens'] as number) ?? 0,
      cacheRead: (usage['cache_read_input_tokens'] as number) ?? 0,
      cacheCreation5m: (cacheCreation['ephemeral_5m_input_tokens'] as number) ?? 0,
      cacheCreation1h: (cacheCreation['ephemeral_1h_input_tokens'] as number) ?? 0,
    } : undefined,
    model: msg['model'] as string | undefined,
    requestId: raw['requestId'] as string | undefined,
    isSidechain: raw['isSidechain'] as boolean | undefined,
    agentId: raw['agentId'] as string | undefined,
    gitBranch: raw['gitBranch'] as string | undefined,
    cwd: raw['cwd'] as string | undefined,
    // Pass through all other fields per user decision
    ...Object.fromEntries(
      Object.entries(raw).filter(([k]) =>
        !['uuid', 'type', 'timestamp', 'sessionId', 'requestId',
          'isSidechain', 'agentId', 'gitBranch', 'cwd', 'message'].includes(k)
      )
    ),
  };
}
```

### Full Parse Pipeline Entry Point

```typescript
// src/index.ts (Phase 1 public API)
import { discoverJSONLFiles, streamJSONLFile } from './parser/reader.js';
import { normalizeAssistantEvent } from './parser/normalizer.js';
import { DedupAccumulator } from './parser/dedup.js';
import type { NormalizedEvent } from './parser/types.js';

export interface ParseOptions {
  dir?: string;     // --dir override
  debug?: boolean;  // --debug flag
}

export async function parseAll(options: ParseOptions = {}): Promise<NormalizedEvent[]> {
  if (options.debug) {
    const { enableDebug } = await import('./shared/debug.js');
    enableDebug();
  }

  const files = await discoverJSONLFiles(options.dir);
  const dedup = new DedupAccumulator();

  for (const file of files) {
    for await (const raw of streamJSONLFile(file)) {
      if (typeof raw !== 'object' || raw === null) continue;
      const event = normalizeAssistantEvent(raw as Record<string, unknown>);
      if (event?.uuid) {
        dedup.add(event);
      }
    }
  }

  return dedup.results();
}
```

### Confirmed JSONL Event Field Map

Verified from real Claude Code v2.1.63 data on this machine:

```
event type "assistant" — token data source:
  .uuid              → deduplication key
  .timestamp         → ISO 8601 string
  .sessionId         → session grouping
  .requestId         → API request ID
  .isSidechain       → true = subagent event
  .agentId           → present when isSidechain
  .gitBranch         → branch name at time of event
  .cwd               → ACTUAL project path (use this, not slug)
  .slug              → human slug (e.g., "foamy-booping-cascade")
  .version           → Claude Code version that wrote this event
  .message.model     → API model identifier (e.g., "claude-sonnet-4-6")
  .message.usage.input_tokens                   → base input
  .message.usage.output_tokens                  → output
  .message.usage.cache_creation_input_tokens    → total cache write
  .message.usage.cache_read_input_tokens        → cache read
  .message.usage.cache_creation.ephemeral_5m_input_tokens   → 5-min tier write
  .message.usage.cache_creation.ephemeral_1h_input_tokens   → 1-hour tier write
  .message.usage.server_tool_use                → web search/fetch counts (optional)
  .message.usage.service_tier                   → "standard" or "priority"
  .message.usage.speed                          → "standard" or "fast"

event type "system" / subtype "turn_duration":
  .durationMs        → turn duration in milliseconds

event types without token data (normalize to null or skip):
  "progress"                → tool execution progress messages
  "user"                    → user messages + tool results
  "file-history-snapshot"   → internal snapshot (no uuid on this type)
  "queue-operation"         → agent task queue events (no uuid on this type)
  "system/local_command"    → local command output
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `glob` npm package | `node:fs/promises` `glob()` built-in | Node 22 (2024) | Zero deps for file discovery |
| `split2` or `ndjson` packages | `node:readline` `for-await-of` | Node 12+ ESM | Zero deps for JSONL streaming |
| Zod v3 schema validation | Zod v4 (4.3.6) | Zod 4.0 (2025) | Improved performance, smaller bundle; API mostly compatible |
| `~/.claude` only | Both `~/.claude` and `~/.config/claude` | Claude Code v1.0.30 | Must check both paths |
| Single JSONL file per session | Session file + `{sessionId}/subagents/agent-*.jsonl` | Claude Code v2.x | Must use `**/*.jsonl` recursive glob |
| Top-level `<persisted-output>` line wrapping | `<persisted-output>` only appears inside JSON string values | N/A | No special line pre-processing needed |

**Deprecated/outdated:**
- Slug-based project path decoding: Slug `replace(/-/g, '/')` produces wrong results for directory names with dashes. Use `cwd` from events.
- Synchronous `fs.readFileSync` for JSONL: Files can be 50KB+ per line due to file content embedding. Always stream.
- Single `~/.claude` path detection: Data directory moved in v1.0.30; check both.

## Open Questions

1. **Zod v3 vs v4 for schema validation**
   - What we know: STACK.md (written 2026-02-28) specifies Zod v3. Zod v4.3.6 is current on npm with no known breaking changes for our use case.
   - What's unclear: Whether any other phases in the stack depend on Zod v3-specific APIs.
   - Recommendation: Use Zod v4. The API for `.object()`, `.string()`, `.number()`, `.optional()`, `.passthrough()`, and `z.infer<>` is identical. If a compatibility concern arises, pin to `zod@3.25.76`.

2. **Parallel file reading vs sequential**
   - What we know: With 23 files on this machine, sequential is fast enough. Users with months of heavy use may have 100+ files.
   - What's unclear: Whether `Promise.all` parallel reads cause EMFILE (too many open files) on large corpora.
   - Recommendation: Use sequential streaming as the default (simpler, avoids EMFILE). Add a batched-parallel path (e.g., 10 concurrent) as an optimization if startup time becomes a problem. This is Claude's discretion territory.

3. **CLAUDE_CONFIG_DIR as override or append to defaults**
   - What we know: CONTEXT.md marks this as Claude's Discretion. Claude Code itself uses it as an override.
   - Recommendation: Treat as override (exclusive) when set, matching Claude Code's own behavior. Document this clearly in the `--help` output.

## Validation Architecture

`nyquist_validation` is not configured in `.planning/config.json` (key is absent). Skipping this section per instructions.

## Sources

### Primary (HIGH confidence)
- Real JSONL data on this machine (Claude Code v2.1.63, 23 files, 1,823 lines) — verified event shapes, field presence, line sizes, glob behavior, readline behavior
- `node:fs/promises` glob() — tested with `**/*.jsonl` pattern, correctly discovers subagent files
- `node:readline` createInterface — tested with 50.9KB lines, no issues
- Zod v4.3.6 npm registry — current version confirmed
- tsup 8.5.1 npm registry — current version confirmed
- Vitest 4.0.18 npm registry — current version confirmed

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` (2026-02-28) — project stack decisions; note Zod v3 reference is outdated
- `.planning/research/PITFALLS.md` (2026-02-28) — real-world failure modes from ccusage issues tracker
- `.planning/research/ARCHITECTURE.md` (2026-02-28) — full system architecture this phase starts building

### Tertiary (LOW confidence, needs validation)
- GitHub issue anthropics/claude-code#23948 (persisted-output JSONL bloat) — referenced in PITFALLS.md; our test corpus did not exhibit top-level XML wrapping, but more diverse Claude Code versions may

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry; native Node.js APIs confirmed working
- Architecture: HIGH — verified against real JSONL data; patterns tested end-to-end in Node 25.6.0
- Pitfalls: HIGH — most verified against real data or confirmed from ccusage issue tracker
- Slug decoding: HIGH — directly tested and confirmed broken; `cwd`-based approach confirmed working

**Research date:** 2026-02-28
**Valid until:** 2026-04-28 (stable domain; Zod and Node.js built-ins are stable; recheck if Claude Code releases a major format change)
