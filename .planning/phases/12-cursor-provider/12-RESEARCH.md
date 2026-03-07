# Phase 12: Cursor Provider - Research

**Researched:** 2026-03-07
**Domain:** Cursor IDE state.vscdb SQLite parsing, provider adapter implementation
**Confidence:** HIGH

## Summary

Phase 12 implements the Cursor provider adapter by parsing Cursor's local SQLite database (`state.vscdb`) to extract session analytics, cost data, and agent mode breakdown. The data architecture is well understood through direct inspection of the actual database on this machine.

Cursor stores data across TWO database locations: per-workspace `state.vscdb` files contain composer metadata (heads), while the global `state.vscdb` (1.3GB+) stores full bubble data and composer conversation details in a `cursorDiskKV` key-value table. The bubble schema has versions `_v: 2` (1,804 entries) and `_v: 3` (31,572 entries) with slightly different field sets. Cost data (`costInCents`) is sparse -- only found on 4 out of 403 composer entries in this database, stored in `usageData` at the composer level, not per-bubble. Token counts are reliably available per-bubble (`tokenCount.inputTokens/outputTokens`).

The implementation follows the existing `ProviderAdapter` pattern established in Phase 11 -- implement `detect()` and `load()` on the existing `CursorAdapter` stub. The adapter reads with `node:sqlite` (`DatabaseSync`, synchronous API), available on Node.js 24+. Direct read-only access works even while Cursor is running (WAL mode active).

**Primary recommendation:** Use `node:sqlite` with `readOnly: true` for direct access. Fall back to temp copy only if direct access fails (SQLITE_BUSY). Parse both workspace-level composer heads and global bubble data. Cost data from `usageData.costInCents` is sparse -- show 'N/A' for sessions without it.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Sessions without costInCents show 'N/A' label with tooltip ("No cost data available")
- Fallback cost estimation from tokens deferred to future phase
- Sessions with N/A cost excluded from aggregated cost totals and charts (prevent misleading $0 in averages)
- Subtle 'reported' / 'estimated' badge per cost value for cost source distinction
- Trust provider data as-is -- no outlier flagging or validation of costInCents values
- Convert costInCents / 100 to costUsd at adapter level; raw cents preserved on UnifiedEvent.costInCents for debug/export
- Include all sessions regardless of token count (zero-token but non-zero-cost sessions included)
- Overview page changes (provider summary cards) deferred to Phase 13
- Unknown schema version: warning banner + parse whatever is possible (partial data better than nothing)
- DB locked by Cursor: copy state.vscdb + WAL/SHM to temp directory, read from copy
- If temp copy fails (disk full, permission): fall back to direct read-only open
- Validate schema version BEFORE copying to temp (quick probe on original DB avoids wasted copy)
- Clean up temp copy immediately after reading (state.vscdb can be 100MB+)
- Corrupt individual sessions: include in session list with 'parse error' marker (not silently skipped)
- Always show Cursor schema version in startup banner (not just debug mode)
- Support current schema version + one prior major version
- Single default path per platform (no multi-DB scanning)
- Show raw model IDs as-is from state.vscdb (no normalization mapping table)
- Models mixed on Models page alongside Claude models; provider-scoped views in Phase 13
- One Cursor composer = one session in yclaude
- Each bubble (AI response) = one UnifiedEvent (per-turn granularity, matches Claude's per-turn model)
- Duration computed as first-to-last bubble timestamp within a composer
- isAgentic flag is per-session (per-composer), not per-bubble
- Include inline edits (Cmd+K) alongside composers -- same session list, tagged as 'edit' type
- Inline edits marked as non-agentic (isAgentic=false)
- Empty composers (zero bubbles) excluded from session list
- Show workspace path as project label if available in state.vscdb
- Show git branch if available in state.vscdb
- macOS + Linux supported (Windows deferred)
- Check both Cursor stable AND Cursor Insiders directories
- Merge stable + Insiders events as one 'Cursor' provider (no separate provider entries)
- No --cursor-dir override flag; auto-detect only
- Load all available data (no time-based limit on historical data)
- SQL WHERE clauses for filtering at database level (not load-all-then-filter-in-JS)
- No indexing on temp copy (state.vscdb is key-value store, sequential key reads)
- Parse once at startup, results cached in AppState.events for server lifetime
- Progress/event count logging in --debug mode only
- Cursor conversation content included in Phase 12 behind --show-messages flag
- Same privacy enforcement as Claude: content not loaded at all without --show-messages (server-side 403)
- Reuse existing react-markdown + react-syntax-highlighter pipeline for rendering
- Show both user messages and AI responses (full conversation thread)
- Show thinking/reasoning content if available (collapsible section)
- Show model label per AI response (Cursor can switch models mid-conversation)
- Provider icon/badge per conversation in the conversation list
- Fully loaded with virtual scroll for long conversations (no pagination)
- Synthetic SQLite fixtures created in test setup code (deterministic, no external dependencies)
- Adapter + parser test coverage (~15-25 tests)
- Test against current schema version + one prior version
- Explicit graceful degradation test for completely unknown schema

### Claude's Discretion
- Internal SQLite query structure and key extraction logic
- Exact schema version detection mechanism
- Temp file naming and location strategy
- Parse error marker visual design
- Debug log format and verbosity levels
- Exact test count and edge case selection

### Deferred Ideas (OUT OF SCOPE)
- Fallback cost estimation from token-based sources when costInCents is missing/zero
- Session type filter in session explorer (composer vs edit vs all) -- Phase 13
- Cursor conversation viewer refinements -- future phase
- Windows platform support
- --cursor-dir override flag for custom Cursor data locations
- Tab completion analytics from Cursor (not in state.vscdb, enterprise API only)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CURS-01 | User can view Cursor session list with tokens, models, timestamps, and duration parsed from state.vscdb | Database schema fully mapped: composer heads in workspace DBs, bubbles in global DB. Token counts from `tokenCount.inputTokens/outputTokens`. Timestamps from `createdAt` (v3 bubbles) or `timingInfo.clientRpcSendTime` (v2 bubbles). Model from `modelConfig.modelName` on composerData entries. Duration from first-to-last bubble timestamp. |
| CURS-02 | User can view accurate Cursor cost data extracted from usageData.costInCents field | `usageData` found on `composerData:<id>` entries in global cursorDiskKV. Format: `{ "default": { "costInCents": 20, "amount": 5 }, "claude-3.5-sonnet": { "costInCents": 4, "amount": 1 } }`. Sparse data -- only 4 of 403 composers had it. Convert cents to USD at adapter level. |
| CURS-03 | User can see Cursor agent mode vs manual mode analytics | `isAgentic` boolean available per-bubble AND `unifiedMode` string on composer heads ("agent", "chat", "edit", "debug"). Per-session `isAgentic` derived from composer-level `unifiedMode` or `isAgentic` flag. Token/cost comparison enabled by aggregating per-mode. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:sqlite | Built-in (Node 24+) | Read Cursor state.vscdb SQLite databases | Zero dependencies, synchronous API matches startup-load pattern, already required by project (engines >= 24) |
| zod | ^4.3.6 | Schema validation for parsed bubble/composer JSON | Already in project dependencies, defensive parsing requirement |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:fs/promises | Built-in | File existence checks, temp file operations | detect() path probing, temp copy |
| node:os | Built-in | Platform detection, tmpdir, homedir | macOS vs Linux path resolution |
| node:path | Built-in | Path construction | Cross-platform path joining |
| node:crypto | Built-in | UUID generation for events | randomUUID() for UnifiedEvent.id |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| node:sqlite | better-sqlite3 | External dependency; node:sqlite is built-in on Node 24+ and sufficient |
| Temp file copy | In-memory copy | state.vscdb can be 1.3GB+; in-memory copy not feasible |
| Zod validation | Manual type guards | Zod provides structured error messages for debugging malformed data |

**Installation:**
```bash
# No new dependencies needed -- all built-in or already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/providers/cursor/
├── adapter.ts           # CursorAdapter class (detect + load)
├── paths.ts             # Platform-specific path resolution
├── db.ts                # SQLite database access layer (open, read, close)
├── parser.ts            # Parse composer heads + bubbles -> UnifiedEvent[]
├── schema.ts            # Zod schemas for bubble/composer JSON validation
├── types.ts             # Internal Cursor-specific types (not exported)
└── __tests__/
    ├── adapter.test.ts  # Integration tests with synthetic SQLite fixtures
    ├── parser.test.ts   # Unit tests for parsing logic
    ├── paths.test.ts    # Platform path resolution tests
    └── db.test.ts       # Database access tests
```

### Pattern 1: Two-Phase Database Reading
**What:** Cursor splits data across workspace-level DBs (composer heads) and one global DB (bubble data, full composer data). Reading requires scanning workspace dirs, then joining with global data.
**When to use:** Always -- this is how Cursor stores data.
**Example:**
```typescript
// Phase 1: Discover workspaces and read composer heads
const workspaceDirs = await discoverWorkspaceStorageDirs(cursorDataDir);
const composerHeads: ComposerHead[] = [];
for (const wsDir of workspaceDirs) {
  const wsDbPath = path.join(wsDir, 'state.vscdb');
  const wsJson = await readWorkspaceJson(wsDir);
  const heads = readComposerHeads(wsDbPath);
  composerHeads.push(...heads.map(h => ({ ...h, workspacePath: wsJson?.folder })));
}

// Phase 2: Read full composer data + bubbles from global DB
const globalDbPath = path.join(cursorDataDir, 'User', 'globalStorage', 'state.vscdb');
const events = parseComposersToEvents(composerHeads, globalDbPath, opts);
```

### Pattern 2: Defensive JSON Parsing with Zod
**What:** Each bubble/composer JSON blob is validated through a Zod schema before use. Unknown fields are stripped, missing required fields produce a parse-error marker.
**When to use:** Every JSON.parse of database values.
**Example:**
```typescript
const BubbleSchema = z.object({
  _v: z.number().optional(),
  type: z.number(), // 1=user, 2=AI
  bubbleId: z.string(),
  tokenCount: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
  }).optional(),
  isAgentic: z.boolean().optional(),
  text: z.string().optional(),
  // ... more fields
}).passthrough(); // Allow unknown fields for forward compat

function parseBubble(raw: unknown): ParsedBubble | ParseError {
  const result = BubbleSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.message, raw };
  }
  return mapToParsedBubble(result.data);
}
```

### Pattern 3: Conditional Spread for Optional Fields
**What:** Due to `exactOptionalPropertyTypes: true` in tsconfig, optional fields must never be assigned `undefined`. Use conditional spread.
**When to use:** Every UnifiedEvent construction.
**Example:**
```typescript
// Source: established pattern from ClaudeAdapter (src/providers/claude/adapter.ts)
return {
  id: crypto.randomUUID(),
  provider: 'cursor',
  sessionId: composerId,
  timestamp: bubble.createdAt ?? deriveTimestamp(bubble),
  type: bubble.type === 1 ? 'user' : 'assistant',
  costUsd: composerCostUsd ?? 0,
  costSource: 'reported',
  ...(bubble.tokenCount ? { tokens: mapTokens(bubble.tokenCount) } : {}),
  ...(composerHead.workspacePath ? { cwd: composerHead.workspacePath } : {}),
  ...(composerHead.createdOnBranch ? { gitBranch: composerHead.createdOnBranch } : {}),
  ...(isAgentic !== undefined ? { isAgentic } : {}),
  ...(costInCents !== undefined ? { costInCents } : {}),
};
```

### Pattern 4: Read-Only Direct Access with Fallback
**What:** Open database in read-only mode directly. Only copy to temp if direct access fails with SQLITE_BUSY.
**When to use:** Database access layer.
**Example:**
```typescript
function openCursorDb(dbPath: string): DatabaseSync {
  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    // Quick validation probe
    db.prepare("SELECT COUNT(*) FROM ItemTable").get();
    return db;
  } catch (err) {
    if (isBusyError(err)) {
      return openFromTempCopy(dbPath);
    }
    throw err;
  }
}
```

### Anti-Patterns to Avoid
- **Loading all bubble data into memory at once:** The global state.vscdb can be 1.3GB+. Read only the bubbles needed for detected composers, not all 33,000+ bubble entries.
- **Assigning `undefined` to optional fields:** Triggers TypeScript error with `exactOptionalPropertyTypes`. Always use conditional spread.
- **Using async sqlite:** `node:sqlite` provides only `DatabaseSync` (synchronous). Do not try to import `Database` (async) -- it does not exist.
- **Parsing composer.content entries as JSON:** These are raw file content blobs (markdown, code, etc.), not structured data. Only `composerData:` and `bubbleId:` entries are JSON.
- **Reading workspace state.vscdb for bubble data:** Workspace DBs only have composer heads (metadata). Bubble data lives exclusively in the global `globalStorage/state.vscdb`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema validation | Manual type checks with typeof chains | Zod schemas with safeParse | Structured errors, forward-compat with passthrough(), composable |
| UUID generation | Custom ID generation | crypto.randomUUID() | Built-in, RFC 4122 compliant |
| Temp file handling | Manual mktemp + cleanup | node:fs/promises mkdtemp + try/finally | Guaranteed cleanup even on error |
| Platform paths | Hardcoded if/else | Centralized paths.ts module | Single source of truth, testable |

**Key insight:** The biggest complexity in this phase is the two-database join pattern and handling sparse data gracefully. The libraries needed are all built-in.

## Common Pitfalls

### Pitfall 1: Global DB Size (1.3GB+)
**What goes wrong:** Attempting to copy the entire global state.vscdb to temp takes too long and may fail on disk space.
**Why it happens:** The global DB stores all bubble data, code block diffs, agent blobs -- far more than needed for analytics.
**How to avoid:** Use direct read-only access (confirmed working even with WAL mode active). Only fall back to temp copy if SQLITE_BUSY. Even then, copy just the file (not WAL/SHM -- the read will still work, just potentially missing very recent writes).
**Warning signs:** Slow startup, temp directory filling up, ENOSPC errors.

### Pitfall 2: Sparse Cost Data
**What goes wrong:** Most sessions will show 'N/A' for cost. Developers might think the feature is broken.
**Why it happens:** Only 4 out of 403 composers had `usageData.costInCents` in the real database examined. The `usageData` field is usually `{}` (empty object).
**How to avoid:** Clear UI messaging ("No cost data available" tooltip). Exclude N/A costs from aggregates (per CONTEXT.md decision). Show token data even when cost is unavailable.
**Warning signs:** All sessions showing N/A cost; cost aggregates showing $0.

### Pitfall 3: Bubble Timestamps Differ Between Versions
**What goes wrong:** Duration calculations are wrong because v2 and v3 bubbles store timestamps differently.
**Why it happens:** v2 bubbles have `timingInfo.clientRpcSendTime` (epoch ms) but no `createdAt`. v3 bubbles have `createdAt` (ISO string) but `timingInfo` is often absent.
**How to avoid:** Create a unified timestamp extraction function that checks `createdAt` first, then falls back to `timingInfo.clientRpcSendTime`.
**Warning signs:** Duration showing as 0ms or NaN for some sessions.

### Pitfall 4: exactOptionalPropertyTypes
**What goes wrong:** TypeScript errors when setting optional UnifiedEvent fields to `undefined`.
**Why it happens:** `exactOptionalPropertyTypes: true` in tsconfig.json means `field?: T` does NOT accept `undefined`.
**How to avoid:** Always use conditional spread pattern: `...(value !== undefined ? { field: value } : {})`.
**Warning signs:** TypeScript compile errors about "Type 'undefined' is not assignable".

### Pitfall 5: Model Name Not in Bubbles
**What goes wrong:** Per-bubble model information is not available, only per-composer `modelConfig.modelName`.
**Why it happens:** Cursor stores model config at the composer level, not per-turn. The actual model names in `modelConfig.modelName` are often generic ("default", "composer-1", "composer-1.5"), not actual model IDs like "claude-sonnet-4-6".
**How to avoid:** Show `modelConfig.modelName` as-is (per CONTEXT.md: "show raw model IDs"). Accept that model granularity is per-composer, not per-turn. The `usageData` keys sometimes contain actual model names (e.g., "claude-3.5-sonnet").
**Warning signs:** Most sessions showing "default" as model name.

### Pitfall 6: node:sqlite BLOB Returns Uint8Array
**What goes wrong:** Reading BLOB columns returns `Uint8Array`, not `Buffer` or `string`.
**Why it happens:** `node:sqlite` returns BLOB values as `Uint8Array` per the Node.js documentation.
**How to avoid:** Convert explicitly: `Buffer.from(row.value).toString('utf-8')` before JSON.parse.
**Warning signs:** "Unexpected token" JSON parse errors, garbled output.

### Pitfall 7: Workspace Directory Hash Mismatch
**What goes wrong:** Cannot correlate workspace storage directories to actual workspace paths.
**Why it happens:** Workspace storage uses opaque hashes as directory names. The mapping is in `workspace.json` inside each directory.
**How to avoid:** Read `workspace.json` from each workspace storage directory. Parse the `folder` or `workspace` field for the actual path.
**Warning signs:** All sessions showing unknown project, no workspace paths.

## Code Examples

### Opening and Reading state.vscdb
```typescript
// Source: Direct exploration of real Cursor installation
import { DatabaseSync } from 'node:sqlite';

function readComposerHeads(dbPath: string): ComposerHead[] {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const row = db.prepare(
      "SELECT value FROM ItemTable WHERE key = 'composer.composerData'"
    ).get() as { value: Uint8Array } | undefined;

    if (!row) return [];

    const json = JSON.parse(Buffer.from(row.value).toString('utf-8'));
    return (json.allComposers ?? []) as ComposerHead[];
  } finally {
    db.close();
  }
}
```

### Reading Bubble Data from Global DB
```typescript
// Source: Direct exploration of real Cursor installation
// Key pattern: bubbleId:<composerId>:<bubbleId>
function readBubblesForComposer(
  globalDb: DatabaseSync,
  composerId: string,
): RawBubble[] {
  const prefix = `bubbleId:${composerId}:`;
  const rows = globalDb.prepare(
    "SELECT key, value FROM cursorDiskKV WHERE key LIKE ? || '%'"
  ).all(prefix) as Array<{ key: string; value: Uint8Array }>;

  return rows.map(row => {
    const json = JSON.parse(Buffer.from(row.value).toString('utf-8'));
    return json as RawBubble;
  });
}
```

### Reading Full Composer Data from Global DB
```typescript
// Source: Direct exploration of real Cursor installation
// Key pattern: composerData:<composerId>
function readComposerData(
  globalDb: DatabaseSync,
  composerId: string,
): ComposerFullData | null {
  const row = globalDb.prepare(
    "SELECT value FROM cursorDiskKV WHERE key = ?"
  ).get(`composerData:${composerId}`) as { value: Uint8Array } | undefined;

  if (!row) return null;

  return JSON.parse(Buffer.from(row.value).toString('utf-8'));
}
```

### Extracting Timestamp from Bubble
```typescript
// v3 bubbles have createdAt, v2 use timingInfo
function getBubbleTimestamp(bubble: RawBubble): string | null {
  // v3: ISO string
  if (typeof bubble.createdAt === 'string') {
    return bubble.createdAt;
  }
  // v2: epoch ms in timingInfo
  if (bubble.timingInfo?.clientRpcSendTime) {
    return new Date(bubble.timingInfo.clientRpcSendTime).toISOString();
  }
  return null;
}
```

### Extracting Cost Data from Composer
```typescript
// usageData format: { "default": { costInCents: 20, amount: 5 }, "claude-3.5-sonnet": { ... } }
function extractCostFromComposer(
  composerData: ComposerFullData,
): { costInCents: number; models: string[] } | null {
  const usage = composerData.usageData;
  if (!usage || typeof usage !== 'object' || Object.keys(usage).length === 0) {
    return null;
  }

  let totalCents = 0;
  const models: string[] = [];

  for (const [modelKey, data] of Object.entries(usage)) {
    if (data && typeof data === 'object' && 'costInCents' in data) {
      totalCents += (data as { costInCents: number }).costInCents;
      models.push(modelKey);
    }
  }

  return totalCents > 0 ? { costInCents: totalCents, models } : null;
}
```

### Platform Path Resolution
```typescript
// Source: Direct filesystem exploration + web search verification
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

function getCursorDataDirs(): string[] {
  const home = homedir();
  const dirs: string[] = [];

  if (platform() === 'darwin') {
    dirs.push(join(home, 'Library', 'Application Support', 'Cursor'));
    dirs.push(join(home, 'Library', 'Application Support', 'Cursor - Insiders'));
  } else if (platform() === 'linux') {
    dirs.push(join(home, '.config', 'Cursor'));
    dirs.push(join(home, '.config', 'Cursor - Insiders'));
  }
  // Windows deferred

  return dirs;
}
```

### Creating Synthetic SQLite Fixture for Tests
```typescript
// Source: node:sqlite API exploration + Claude adapter test pattern
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function createTestDb(composers: TestComposer[], bubbles: TestBubble[]): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'yclaude-cursor-test-'));
  const dbPath = join(dir, 'state.vscdb');
  const db = new DatabaseSync(dbPath);

  db.exec("CREATE TABLE ItemTable (key TEXT UNIQUE, value BLOB)");
  db.exec("CREATE TABLE cursorDiskKV (key TEXT UNIQUE, value BLOB)");

  // Insert composer heads
  const composerData = { allComposers: composers };
  db.prepare("INSERT INTO ItemTable (key, value) VALUES (?, ?)").run(
    'composer.composerData',
    Buffer.from(JSON.stringify(composerData)),
  );

  // Insert bubbles
  for (const bubble of bubbles) {
    db.prepare("INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)").run(
      `bubbleId:${bubble.composerId}:${bubble.bubbleId}`,
      Buffer.from(JSON.stringify(bubble)),
    );
  }

  db.close();
  return dir;
}
```

## Cursor state.vscdb Schema Reference

### Data Architecture (verified on real installation)

```
~/Library/Application Support/Cursor/
├── User/
│   ├── globalStorage/
│   │   └── state.vscdb                    # 1.3GB, global bubble data
│   │       ├── ItemTable (key TEXT, value BLOB)
│   │       │   ├── cursorai/serverConfig   # Model migrations, config
│   │       │   └── aiCodeTracking.*        # Daily stats
│   │       └── cursorDiskKV (key TEXT, value BLOB)  # 74,948 rows
│   │           ├── bubbleId:<composerId>:<bubbleId>  # 33,416 entries
│   │           ├── composerData:<composerId>         # 403 entries
│   │           ├── agentKv:blob:<hash>               # 29,679 entries
│   │           ├── checkpointId:<hash>               # 5,225 entries
│   │           ├── composer.content.<hash>            # 993 entries (file content, NOT JSON)
│   │           └── codeBlockDiff:<hash>              # 2,946 entries
│   └── workspaceStorage/
│       └── <hash>/                        # 40 workspace dirs
│           ├── workspace.json             # { "folder": "file:///path/to/project" }
│           └── state.vscdb                # Small, per-workspace metadata
│               └── ItemTable
│                   └── 'composer.composerData' → { allComposers: ComposerHead[] }
```

### Composer Head (per-workspace state.vscdb → ItemTable → 'composer.composerData')
```typescript
interface ComposerHead {
  type: 'head';
  composerId: string;          // UUID
  createdAt: number;           // Epoch ms
  lastUpdatedAt?: number;      // Epoch ms
  unifiedMode: 'agent' | 'chat' | 'edit' | 'debug' | undefined;
  forceMode: 'edit' | 'chat';
  name?: string;               // User-visible session name
  subtitle?: string;           // "Edited file1.ts, file2.ts"
  totalLinesAdded: number;
  totalLinesRemoved: number;
  filesChangedCount?: number;
  committedToBranch?: string;  // Git branch
  createdOnBranch?: string;    // Git branch at creation
  isArchived: boolean;
  isDraft: boolean;
  contextUsagePercent?: number;
  // ... many more UI state fields
}
```

### Full Composer Data (global state.vscdb → cursorDiskKV → 'composerData:<id>')
```typescript
interface ComposerFullData {
  _v?: number;                 // Schema version
  composerId: string;
  unifiedMode: string;         // 'agent', 'chat', 'edit'
  forceMode: string;
  isAgentic?: boolean;
  usageData: Record<string, {  // KEY: model name or 'default'
    costInCents: number;
    amount: number;            // Request count
  }>;                          // Often {} (empty)
  modelConfig?: {
    modelName: string;         // 'default', 'composer-1', 'composer-1.5'
    maxMode: boolean;
  };
  fullConversationHeadersOnly?: Array<{
    bubbleId: string;
    type: number;              // 1=user, 2=AI
    serverBubbleId?: string;
  }>;
  createdAt: number;           // Epoch ms
  lastUpdatedAt?: number;
  // ... many more fields
}
```

### Bubble Data (global state.vscdb → cursorDiskKV → 'bubbleId:<composerId>:<bubbleId>')
```typescript
interface RawBubble {
  _v: 2 | 3;                  // Schema version
  type: 1 | 2;                // 1=user, 2=AI response
  bubbleId: string;            // UUID
  isAgentic: boolean;

  // Tokens (may be {0, 0} for some entries)
  tokenCount: {
    inputTokens: number;
    outputTokens: number;
  };

  // Content
  text?: string;               // Message text
  richText?: string;           // Rich text (user messages)
  codeBlocks?: unknown[];      // Code suggestions

  // v3 only
  createdAt?: string;          // ISO timestamp (v3)
  thinking?: string;           // Thinking content
  thinkingDurationMs?: number;
  thinkingStyle?: number;      // 1 = thinking enabled
  requestId?: string;

  // v2 only
  timingInfo?: {
    clientStartTime: number;
    clientRpcSendTime: number;  // Epoch ms - best timestamp for v2
    clientSettleTime: number;
    clientEndTime: number;
  };
  tokenCountUpUntilHere?: number;
  tokenDetailsUpUntilHere?: string[];

  // Shared
  unifiedMode?: number;        // 2=normal, 3=agent
  usageUuid?: string;
  serverBubbleId?: string;
  isChat?: boolean;
  toolResults?: unknown[];
  images?: unknown[];
  allThinkingBlocks?: unknown[];
  context?: Record<string, unknown>;
}
```

### Version Differences (v2 vs v3)
| Field | v2 | v3 |
|-------|----|----|
| `createdAt` | Absent | ISO string |
| `timingInfo` | Present (epoch ms) | Usually absent |
| `tokenCountUpUntilHere` | Present | Absent |
| `tokenDetailsUpUntilHere` | Present | Absent |
| `thinking` | Absent | Present (thinking content) |
| `thinkingDurationMs` | Absent | Present |
| `requestId` | Absent | Present |
| `capabilityContexts` | Absent | Present |
| `isRefunded` | Absent | Present |
| `consoleLogs` | Absent | Present |
| `knowledgeItems` | Absent | Present |
| Distribution | 1,804 entries (5%) | 31,572 entries (95%) |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| v2 bubble schema (timingInfo for timestamps) | v3 bubble schema (createdAt, thinking support) | ~2025 Q3 | v3 is 95% of current data; v2 support needed for historical data |
| composerData in workspace state.vscdb (with inline conversation) | Older format: conversation inline; Newer format: conversation in global cursorDiskKV via fullConversationHeadersOnly | ~2025 Q2 | Workspace DBs now only have heads; full data in global DB |
| No usageData | usageData with costInCents (sparse) | ~2025 Q2 | Only older composers have cost data; newer ones show empty usageData |

**Deprecated/outdated:**
- Inline `conversation` array on composerData entries in cursorDiskKV: Only present on older (pre-2025) composers. Newer ones use `fullConversationHeadersOnly` + separate bubble entries.
- `modelName` field on bubbles: Was expected per CONTEXT.md discussion but NOT actually present in current data. Model info is only at composer level via `modelConfig.modelName`.

## Open Questions

1. **Model Name Accuracy**
   - What we know: `modelConfig.modelName` contains generic values like "default", "composer-1", "composer-1.5" -- not actual model IDs.
   - What's unclear: Whether actual model names (e.g., "claude-sonnet-4-6") can be reliably extracted. The `usageData` keys sometimes contain real model names (e.g., "claude-3.5-sonnet"), but this is sparse.
   - Recommendation: Show `modelConfig.modelName` as-is per the locked decision. When `usageData` contains model-specific entries, use those model names. Accept "default" as a valid display value.

2. **Inline Edit (Cmd+K) Detection**
   - What we know: The CONTEXT.md says "Include inline edits (Cmd+K) alongside composers". Composer heads have `unifiedMode: 'edit'` which might represent these.
   - What's unclear: Whether Cmd+K edits appear as separate composers or as a different data structure entirely. Only 1 of 120 composers in the tested workspace had `unifiedMode: 'edit'`.
   - Recommendation: Treat `unifiedMode === 'edit'` composers as inline edit sessions. Tag them as `type: 'edit'` in the session list.

3. **costInCents Availability Going Forward**
   - What we know: Only 4 of 403 composers had `costInCents` data, and all were from mid-2025 (~June). The `usageData` field exists on newer composers but is typically `{}`.
   - What's unclear: Whether Cursor has stopped populating this field, or if it depends on subscription tier / usage pattern.
   - Recommendation: Implement the full cost extraction pipeline but expect most sessions to show 'N/A'. The UI must handle this gracefully as a first-class state, not an error.

4. **Database Locking Behavior**
   - What we know: Read-only direct access works even with WAL mode active and Cursor running. No SQLITE_BUSY errors observed during testing.
   - What's unclear: Whether this is guaranteed under all conditions (e.g., during Cursor auto-save, heavy write operations).
   - Recommendation: Implement the temp-copy fallback as planned, but make direct read-only the default path. Log when fallback is triggered.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/providers/cursor/` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CURS-01 | Parse composer heads from workspace DB | unit | `npx vitest run src/providers/cursor/__tests__/parser.test.ts -x` | Wave 0 |
| CURS-01 | Extract tokens from bubbles | unit | `npx vitest run src/providers/cursor/__tests__/parser.test.ts -x` | Wave 0 |
| CURS-01 | Extract timestamps (v2 + v3) | unit | `npx vitest run src/providers/cursor/__tests__/parser.test.ts -x` | Wave 0 |
| CURS-01 | Session duration calculation | unit | `npx vitest run src/providers/cursor/__tests__/parser.test.ts -x` | Wave 0 |
| CURS-01 | detect() finds/misses state.vscdb | unit | `npx vitest run src/providers/cursor/__tests__/adapter.test.ts -x` | Wave 0 |
| CURS-01 | load() produces UnifiedEvent[] | integration | `npx vitest run src/providers/cursor/__tests__/adapter.test.ts -x` | Wave 0 |
| CURS-02 | Extract costInCents from usageData | unit | `npx vitest run src/providers/cursor/__tests__/parser.test.ts -x` | Wave 0 |
| CURS-02 | Handle empty usageData (N/A cost) | unit | `npx vitest run src/providers/cursor/__tests__/parser.test.ts -x` | Wave 0 |
| CURS-02 | costUsd = costInCents / 100 | unit | `npx vitest run src/providers/cursor/__tests__/parser.test.ts -x` | Wave 0 |
| CURS-03 | isAgentic flag from composer mode | unit | `npx vitest run src/providers/cursor/__tests__/parser.test.ts -x` | Wave 0 |
| CURS-03 | Agent vs manual aggregation | unit | `npx vitest run src/providers/cursor/__tests__/parser.test.ts -x` | Wave 0 |
| ALL | Graceful degradation for unknown schema | unit | `npx vitest run src/providers/cursor/__tests__/parser.test.ts -x` | Wave 0 |
| ALL | Corrupt session handling (parse error marker) | unit | `npx vitest run src/providers/cursor/__tests__/parser.test.ts -x` | Wave 0 |
| ALL | Schema version detection | unit | `npx vitest run src/providers/cursor/__tests__/db.test.ts -x` | Wave 0 |
| ALL | Platform path resolution (macOS/Linux) | unit | `npx vitest run src/providers/cursor/__tests__/paths.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/providers/cursor/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/providers/cursor/__tests__/adapter.test.ts` -- covers CURS-01 detect/load
- [ ] `src/providers/cursor/__tests__/parser.test.ts` -- covers CURS-01/02/03 parsing
- [ ] `src/providers/cursor/__tests__/db.test.ts` -- covers schema version detection, DB access
- [ ] `src/providers/cursor/__tests__/paths.test.ts` -- covers platform path resolution
- [ ] Synthetic SQLite fixture helper function (shared across test files)

## Sources

### Primary (HIGH confidence)
- Direct filesystem exploration of real Cursor installation at `~/Library/Application Support/Cursor/` -- all schema details verified
- `node:sqlite` API verified on Node.js v25.8.0 (DatabaseSync, StatementSync methods, BLOB handling)
- Existing codebase: `src/providers/types.ts`, `src/providers/cursor/adapter.ts`, `src/providers/claude/adapter.ts`, `src/providers/registry.ts`
- Project `tsconfig.json` -- confirmed `exactOptionalPropertyTypes: true`, `target: ES2022`, `module: NodeNext`
- Project `package.json` -- confirmed `engines.node >= 24.0.0`, existing dependencies

### Secondary (MEDIUM confidence)
- [Cursor Forum - state.vscdb size discussion](https://forum.cursor.com/t/cursor-state-vscdb-25gb/153661) -- confirms DB can grow very large
- [Cursor Forum - global state.vscdb deletion effects](https://forum.cursor.com/t/deleting-global-state-vscdb-causes-infinite-loading-chat-in-projects-history-not-recoverable-without-corrupted-backup/153220) -- confirms global DB stores chat history
- Linux path (`~/.config/Cursor/`) verified via web search of multiple sources

### Tertiary (LOW confidence)
- `costInCents` availability trend -- only 4 data points from mid-2025. May not be representative of all Cursor versions/plans.
- Inline edit (`unifiedMode: 'edit'`) identification -- only 1 example found in 120 composers. Behavior may differ across Cursor versions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all built-in node modules, zero new dependencies, verified API surface
- Architecture: HIGH - direct database exploration with real data, two-database pattern fully understood
- Pitfalls: HIGH - discovered through actual data inspection (sparse costs, BLOB handling, timestamp differences)
- Schema: HIGH for v2/v3 bubble format, MEDIUM for cost data availability (sparse)
- Platform paths: MEDIUM - macOS verified directly, Linux from web search

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (Cursor schema is undocumented and may change with Cursor updates -- HIGH risk noted in STATE.md)
