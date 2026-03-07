# Pitfalls Research

**Domain:** Multi-provider AI coding tool analytics (v1.2 milestone -- adding Cursor, OpenCode, Ollama to existing Claude Code-only dashboard)
**Researched:** 2026-03-07
**Confidence:** MEDIUM-HIGH (Cursor storage format verified via multiple community sources and reverse-engineering posts; OpenCode schema confirmed via GitHub issues; Ollama API verified via official docs; existing codebase audited directly)

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or breaking existing functionality.

### Pitfall 1: Cursor's vscdb Storage Is Undocumented, Versioned, and Frequently Breaking

**What goes wrong:**
Cursor stores all chat history, composer data, and session metadata in SQLite databases (`.vscdb` files) using a generic key-value table (`cursorDiskKV` or `ItemTable` with `key TEXT PRIMARY KEY, value TEXT`). The values are JSON blobs with an internal `_v` version field (currently version 3 for composer data). Different Cursor versions store data under different keys: `composerData:<id>` for sessions, `bubbleId:<composerId>:<bubbleId>` for individual messages, `composer.composerData` for the primary chat list (new format), `workbench.panel.aichat.view.aichat.chatdata` for legacy chat format, and `aiService.prompts` / `aiService.generations` for older builds. Cursor 2.1 (November 2025) corrupted chat histories during migration. Users regularly report 25-50GB `state.vscdb` files from bloated data. The SQL migration from one internal schema version to another has caused "Loading Chat" infinite loops.

**Why it happens:**
Cursor treats `.vscdb` as a private internal format inherited from VS Code's storage layer. They optimize for their own product, not third-party parsers. Cursor ships updates approximately weekly, and any update can change the internal key naming scheme, the JSON structure within values, or the `_v` version field. There are at least three distinct historical storage formats (legacy aichat, composer v2, composer v3).

**How to avoid:**
- Treat the Cursor parser as the HIGHEST fragility risk in the entire v1.2 milestone. Budget significant time for reverse-engineering and format detection.
- Implement version detection: read the `_v` field from composer JSON blobs and branch to version-specific parsers. Default to "best effort" parsing for unknown versions.
- Support BOTH storage locations: `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` (global) and `~/Library/Application Support/Cursor/User/workspaceStorage/<hash>/state.vscdb` (per-workspace). Cross-platform: `~/.config/Cursor/User/` on Linux, `%APPDATA%\Cursor\User\` on Windows.
- Enumerate ALL known key patterns: `composerData:*`, `composer.composerData`, `workbench.panel.aichat.view.aichat.chatdata`, `aiService.prompts`, `aiService.generations`. Try each pattern and merge results.
- Never assume the database is well-formed. Wrap every SQLite read in try/catch. Handle locked databases (Cursor may have the file open), corrupt databases (migration failures), and missing tables gracefully.
- Build a snapshot corpus: capture real `state.vscdb` files from at least 3 Cursor versions (2.2.x, 2.3.x, current) as test fixtures. These are the ground truth for parser correctness.

**Warning signs:**
- Cursor ships a major version update and the parser starts returning zero sessions
- Users report "no Cursor data found" despite having Cursor installed
- New `_v` values appearing in the JSON that the parser doesn't recognize
- The `cursorDiskKV` table name changes or a new table appears

**Phase to address:**
Phase 2 (Cursor provider implementation) -- this is the highest-risk provider and should be implemented with the most defensive parsing.

---

### Pitfall 2: Over-Abstracting the Provider Layer Causes Lowest-Common-Denominator Analytics

**What goes wrong:**
The natural instinct when adding multiple providers is to build a generic `Provider` interface that all providers implement. The trap: each provider's data has fundamentally different characteristics. Claude Code has per-turn token breakdowns with 5-minute and 1-hour cache tiers. Cursor has subscription-based pricing where "cost per request" is an estimate at best. OpenCode has per-message cost fields that are always zero (it stores `cost: 0`). Ollama is entirely local with no real cost. If you force all providers into a single `{ tokens: { input, output }, costUsd }` shape, you lose the most valuable provider-specific analytics (cache efficiency for Claude, savings-vs-cloud for Ollama, subscription utilization for Cursor).

**Why it happens:**
DRY principle taken too far. Developers see duplication between provider dashboards and prematurely unify them. The existing `CostEvent` type is Claude-specific (has `cacheCreation5m`, `cacheCreation1h`, `isSidechain`, `agentId`) but looks generic enough to tempt reuse. The v1.1 codebase already has `NormalizedEvent` as the canonical type -- extending it for all providers would bloat it with provider-specific optional fields.

**How to avoid:**
- Use a THIN shared interface for what's truly universal: `{ provider: string; sessionId: string; timestamp: string; model: string; tokens?: { input: number; output: number }; costUsd: EstimatedCost }`. This is the minimum needed for cross-provider aggregation (total cost, total tokens, model breakdown).
- Keep provider-specific types SEPARATE. `ClaudeCodeEvent extends BaseEvent` has cache tiers. `CursorEvent extends BaseEvent` has composer metadata. `OllamaEvent extends BaseEvent` has eval_duration and no cost.
- Each provider tab in the dashboard renders provider-specific visualizations. The Overview page uses only the shared interface for cross-provider totals.
- The provider abstraction should be at the DATA LAYER (how events are loaded), not at the PRESENTATION layer. Each provider dashboard page can import provider-specific types directly.
- Resist the urge to build a `ProviderRegistry` or plugin system for v1.2. Three hardcoded providers with a shared interface is simpler and more maintainable than a generic plugin architecture with only three implementations.

**Warning signs:**
- The shared `NormalizedEvent` type growing to 30+ optional fields, most relevant to only one provider
- Provider-specific pages showing only generic data because the "common" type doesn't carry enough information
- Conversations about "how do we represent cache tiers for providers that don't have them"
- Loss of Claude Code analytics quality after the refactor (cache efficiency score, subagent breakdown)

**Phase to address:**
Phase 1 (Provider abstraction layer) -- the interface design must happen BEFORE any provider implementation. Getting this wrong means rewriting all three providers.

---

### Pitfall 3: Breaking Existing Claude Code Analytics During Refactoring

**What goes wrong:**
The v1.1 codebase has 174 tests and 8,264 LOC that work correctly for Claude Code. Refactoring to add multi-provider support touches nearly every layer: the parser pipeline (`parseAll` -> `discoverJSONLFiles` -> `streamJSONLFile`), the cost engine (`computeCosts` with `MODEL_PRICING`), the privacy filter (`applyPrivacyFilter`), the server state (`AppState`), and all API routes. If the refactoring changes the data pipeline, any regression in Claude Code analytics is a shipping blocker. Users who upgrade from v1.1 to v1.2 and see broken or changed cost numbers will lose trust immediately.

**Why it happens:**
The current codebase is tightly coupled to Claude Code. The `parseAll()` function hardcodes JSONL file discovery. The `AppState` holds a flat `costs: CostEvent[]` array with no provider discrimination. API routes like `/api/v1/summary` aggregate ALL events. Adding provider awareness requires touching these core paths.

**How to avoid:**
- RULE: Claude Code analytics must remain IDENTICAL between v1.1 and v1.2. No cost calculation changes, no token counting changes, no API response shape changes for existing endpoints.
- Start by wrapping, not rewriting. Create a `providers/claude-code/` module that re-exports the existing `parseAll`, `computeCosts`, `applyPrivacyFilter` unchanged. The new provider layer calls into this module. The existing tests continue to pass against the same code paths.
- Add new API routes for multi-provider data (`/api/v2/summary`, `/api/v2/models`) instead of modifying existing v1 routes. The v1 routes continue to serve Claude Code data only. This prevents breaking existing frontend code.
- Run the full v1.1 test suite as a regression gate in CI. If any existing test breaks, the PR is blocked.
- Add snapshot tests for key API responses (summary, sessions list, session detail) using real fixture data. Snapshot drift = regression.
- Deploy the provider abstraction as a WRAPPER around existing code, not as a replacement. The existing parser pipeline feeds into `providers/claude-code/`. New providers feed into `providers/cursor/`, etc. A top-level aggregator merges results.

**Warning signs:**
- Existing test failures during refactoring ("just need to update the snapshot")
- Cost calculations producing different numbers for the same fixture data
- API response shapes changing for v1 endpoints
- Privacy filter being bypassed for new provider data paths

**Phase to address:**
Phase 1 (Provider abstraction) -- the refactoring strategy must be designed before any code moves. "Wrap, don't rewrite" is the guiding principle.

---

### Pitfall 4: Cost Model Incommensurability Across Providers

**What goes wrong:**
Claude Code has per-token API pricing (well-understood: $X per million input tokens, $Y per million output tokens, with cache tier multipliers). Cursor has a hybrid subscription model: $20/month buys a credit pool, and requests consume credits at variable rates depending on the model used. There is no clean way to say "this Cursor session cost $2.43" because the cost depends on how much of the monthly credit pool was consumed, which depends on the user's plan tier and all other usage that month. OpenCode stores `cost: 0` in its message files -- it has no local cost data, so cost must be estimated from token counts using external pricing databases. Ollama is entirely free (local inference), but users want "equivalent cloud cost" estimates. Showing all four providers in a unified "Total Cost" dashboard with incompatible cost semantics produces misleading numbers.

**Why it happens:**
The existing dashboard was designed around a single cost model (Anthropic per-token API pricing). The `EstimatedCost` branded type and "estimated" label work well for Claude Code. But extending the same concept to Cursor (subscription amortization), OpenCode (zero-cost local data requiring external lookup), and Ollama (hypothetical cloud cost) creates a unit mismatch. A dollar from Claude Code API pricing is not the same as a dollar from Cursor subscription amortization.

**How to avoid:**
- Define three distinct cost categories with explicit labels in the UI:
  1. **API-estimated cost** (Claude Code): "Based on Anthropic published API token pricing"
  2. **Token-estimated cost** (OpenCode): "Based on estimated token pricing via LiteLLM/published rates" -- requires maintaining a broader model pricing database or fetching from an external source
  3. **Equivalent cloud cost** (Ollama): "What this would have cost using cloud APIs" -- clearly hypothetical
- For Cursor: show token counts and session metrics WITHOUT a dollar cost by default. Optionally allow users to input their plan tier for rough credit consumption estimates, but never present Cursor costs with the same confidence as Claude Code costs.
- Never show a "Total Cost Across All Providers" number that mixes these categories without clear labeling. If you do show a cross-provider total, add a prominent disclaimer: "Combined estimate. Cost methodologies differ by provider."
- Use distinct visual treatments: Claude Code costs in the current style, OpenCode estimates in a different shade with an "est." badge, Ollama hypothetical costs in a clearly different color with "saved" language.

**Warning signs:**
- Users comparing Cursor "cost" with Claude Code "cost" and drawing incorrect conclusions
- The "Total Cost" number on the Overview page becoming meaningless when multiple providers are active
- Debates about "which cost methodology to use for OpenCode" during implementation
- Ollama users confused about why a free local tool shows dollar amounts

**Phase to address:**
Phase 1 (Provider abstraction) for cost model design, Phase 2-4 (individual providers) for implementation. The cost categorization scheme must be agreed upon before any provider dashboard is built.

---

### Pitfall 5: Privacy Model Breaks for Cursor Data

**What goes wrong:**
The existing privacy model strips `message`, `content`, and `text` fields from `NormalizedEvent` objects before routes see them. This works because Claude Code JSONL has a clean separation: metadata fields (uuid, type, timestamp, sessionId, tokens) vs. content fields (message with the actual conversation). Cursor's `state.vscdb` does NOT have this separation. The entire conversation is stored as a JSON blob in the `value` column of `cursorDiskKV`, with session metadata and message content interleaved in the same object. Simply reading the database to extract token counts or session timestamps inherently loads conversation content into memory. Additionally, Cursor data may contain file contents, diffs, and code that the user was editing -- potentially more sensitive than Claude Code conversations.

**Why it happens:**
Cursor's storage wasn't designed for selective field extraction. It's a key-value store where each value is a complete session dump. The privacy filter pattern (load everything, strip content fields) doesn't work when the content IS the data source you need to parse.

**How to avoid:**
- Design provider-specific privacy boundaries. The Cursor parser should extract ONLY the fields needed for analytics (session ID, timestamp, model, token counts if available) and NEVER pass raw conversation content to the normalized event layer.
- Implement privacy filtering AT THE PARSER LEVEL for Cursor, not at the pipeline level. The Cursor parser function should return events that already have content stripped, unlike Claude Code where stripping happens after normalization.
- Audit: Cursor `state.vscdb` keys may contain file paths in workspace contexts. File paths can reveal project names, customer names, or internal codenames. Decide whether to treat file paths as sensitive (strip them) or non-sensitive (preserve for project grouping).
- OpenCode has a similar issue: session files may contain the full prompt and response. Apply the same parser-level privacy filtering.
- Ollama: if reading from API responses or logs, the actual prompt/completion text may be present. Strip at source.
- Add per-provider privacy tests: "given this raw Cursor vscdb data, verify that no conversation content appears in the output events."

**Warning signs:**
- Raw conversation text appearing in API responses during development
- Test fixtures containing actual user conversations (use synthetic data only)
- The privacy filter not being called for a new provider's code path
- File paths from workspace storage leaking into the dashboard

**Phase to address:**
Phase 1 (Provider abstraction) for privacy boundary design, then enforced in each provider's implementation phase. Every provider PR must include privacy assertion tests.

---

### Pitfall 6: SQLite Dependency Bloats npx Install or Requires Native Compilation

**What goes wrong:**
Cursor and OpenCode both store data in SQLite databases. The current yclaude package has ZERO native dependencies -- it's pure JavaScript/TypeScript. Adding SQLite reading capability typically requires either `better-sqlite3` (native C addon, requires compilation or prebuilt binaries, adds ~15MB to package) or `sql.js` (WebAssembly SQLite, adds ~2MB but is slower). Either option significantly impacts the zero-friction `npx yclaude` experience. `better-sqlite3` is the worst offender: it requires `node-gyp` and a C compiler on systems without prebuilt binaries (Alpine Linux, unusual architectures), and prebuilt binaries add download weight. This can turn a 3-second `npx` install into a 30-second build step.

**Why it happens:**
SQLite is a C library. Node.js doesn't natively bundle a JavaScript-accessible SQLite binding as a stable API. The built-in `node:sqlite` module exists but is still a release candidate (Stability 1.2) as of Node.js v25.7.0. It was removed from the experimental flag requirement in v23.4.0/v22.13.0.

**How to avoid:**
- USE `node:sqlite` (the built-in module). yclaude already requires Node >= 24 (`"engines": { "node": ">=24.0.0" }`). The `node:sqlite` module is available without flags in Node 24+ and provides synchronous `DatabaseSync` API which is perfect for reading `.vscdb` and `opencode.db` files. Zero additional dependencies. Zero native compilation. Zero package size increase.
- Verify that `node:sqlite` can open Cursor's `.vscdb` files (they are standard SQLite3 databases). Test with a real `state.vscdb` file.
- If `node:sqlite` proves insufficient (unlikely for read-only use), fall back to `sql.js` (WASM, no native compilation). Never use `better-sqlite3` -- the native compilation requirement is a dealbreaker for `npx` distribution.
- Make SQLite reading OPTIONAL at runtime. If no Cursor/OpenCode data directories exist, never import the SQLite module. This prevents errors for users who only use Claude Code.
- Handle `node:sqlite` import failures gracefully: if running on an older Node.js that doesn't support it, disable Cursor/OpenCode providers with a clear warning message.

**Warning signs:**
- `npm pack` size growing by more than 500KB after adding SQLite support
- CI failures on unusual platforms (Alpine, ARM) due to native compilation
- Users reporting "npx yclaude failed to install" after adding SQLite deps
- Import errors for `node:sqlite` on Node 22 or older

**Phase to address:**
Phase 2 (first SQLite-dependent provider) -- validate `node:sqlite` approach in the first provider that needs it. Do not add `better-sqlite3` to `package.json`.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode Cursor DB paths per platform | Fast implementation | Breaks when Cursor changes data location, as they did with VS Code migration paths | Never -- use a discovery function that checks multiple known paths |
| Store all provider events in one flat array | Simple aggregation | No way to filter by provider efficiently; cross-provider pages must scan all events | MVP only -- add provider-keyed maps by Phase 3 |
| Copy-paste Claude Code route logic for each provider | Quick route creation | Three copies of session list logic diverge over time | Never -- extract shared aggregation helpers, use provider-specific types |
| Use LiteLLM pricing API for all cost lookups | No local pricing maintenance | Network dependency for a local-first tool; breaks offline usage; rate limits | Never for core path -- cache aggressively or bundle pricing data |
| Parse Ollama server logs instead of using API | Access to historical data | Log format is not stable; rotation deletes old data; debug mode changes format | Never -- use `/api/generate` response metrics from live sessions only |
| Add all provider fields to NormalizedEvent | One type for everything | 30+ optional fields; TypeScript autocomplete becomes useless; no compile-time provider safety | Never -- use discriminated union or provider-specific types |
| Skip Cursor parser tests because "I don't have Cursor installed" | Faster development | Parser silently breaks; no regression detection; bugs discovered by users | Never -- use fixture-based tests with captured vscdb data |

## Integration Gotchas

Common mistakes when integrating with each provider's data source.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Cursor vscdb | Opening the database without `PRAGMA journal_mode` / read-only mode, causing locking conflicts with running Cursor | Open with `{ readOnly: true }` flag. Cursor may have WAL mode active; read-only access avoids locking. Copy the file to a temp location if locking persists. |
| Cursor vscdb | Assuming all workspaces have the same key schema | Enumerate ALL `workspaceStorage/*/state.vscdb` files. Each workspace may have different Cursor versions and different key schemas. Merge results. |
| Cursor vscdb | Parsing `globalStorage/state.vscdb` only | Workspace-level databases (`workspaceStorage/*/state.vscdb`) contain per-workspace session data. Global storage has the composer list but may not have per-turn message details. |
| OpenCode DB | Assuming the SQLite database exists on all installations | OpenCode v1.1.x and earlier used JSON files in `~/.local/share/opencode/storage/`. The SQLite migration (v1.2.0+) may have failed silently (GitHub issue #13654). Check for both JSON files AND the SQLite database. |
| OpenCode DB | Reading during active OpenCode session | OpenCode uses a single global SQLite database with WAL mode. Concurrent access from yclaude while OpenCode is running can hit `SQLITE_BUSY` or locking protocol errors (GitHub issue #15188). Use read-only mode and retry with backoff. |
| OpenCode cost | Trusting the `cost` field in message files | OpenCode stores `cost: 0` for all messages. Cost must be calculated from `tokens_input` and `tokens_output` using external pricing data. |
| OpenCode models | Using model IDs directly for pricing lookup | OpenCode model aliases (e.g., `gemini-3-pro-high` -> `gemini-3-pro-preview`) don't match standard API model IDs. Need an alias resolution layer. |
| Ollama API | Calling `/api/generate` to get historical usage | Ollama has no historical usage endpoint. The `/api/generate` and `/api/chat` responses include per-request metrics, but there is no "show me all past usage" API. Ollama history is only tracked in `.ollama/history` for CLI interactions, not API calls. |
| Ollama API | Assuming Ollama is always running | Ollama server may not be running. The API at `http://localhost:11434` returns connection refused. Detect gracefully with a timeout, don't crash. |
| Ollama API | Trying to calculate token costs for local models | Ollama models are free to run locally. Calculating "cost" requires knowing which cloud model is equivalent (e.g., local llama3 ~= Claude Haiku quality?). This mapping is inherently subjective. |

## Performance Traps

Patterns that work at small scale but fail with real user data.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all Cursor vscdb files into memory at startup | Startup time goes from 2s to 30s+ | Cursor `state.vscdb` files can be 25-50GB (confirmed by forum reports). Use streaming SQLite queries with `LIMIT`/`OFFSET` or only read keys matching known patterns. Never `SELECT * FROM cursorDiskKV`. | Immediately for heavy Cursor users |
| Scanning all `workspaceStorage/*/state.vscdb` files synchronously | Startup blocks for 10+ seconds with many workspaces | Scan workspace directories in parallel. Skip workspaces with no AI-related keys (probe with a single SELECT before full parse). | >20 Cursor workspaces |
| Parsing all providers before serving any response | Dashboard shows blank spinner for 30+ seconds | Load providers in parallel. Serve whichever provider finishes first. Show progressive loading states per provider tab. | When user has all four providers with substantial data |
| Re-reading Cursor/OpenCode databases on every API request | Each request takes 500ms+ from SQLite reads | Read once at startup (like the current Claude Code approach), cache in memory. Offer a "refresh" button/endpoint for re-scanning. | First request from dashboard |
| Polling Ollama API on a timer for "live" metrics | API calls to `/api/ps` every second burn CPU, add latency | Only poll when Ollama tab is active. Use 10-second intervals minimum. Cache `/api/ps` response for 5 seconds. | When Ollama tab is left open |
| Concatenating all provider events into a single sorted array | Sorting 500K+ events takes seconds; filtering requires full scan | Keep provider events in separate collections. Only merge for cross-provider views. Index by provider, then by sessionId. | >100K total events across providers |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Cursor workspace paths in API responses without sanitization | Leaks internal project names, customer codenames, directory structure to anyone with local network access | Strip or hash full paths. Only show the last path segment (project name), consistent with existing `assignProjectNames()` approach. |
| Reading Cursor `state.vscdb` files that contain stored credentials (API keys, OAuth tokens) | Cursor stores settings including possible API keys in the same database. Accidentally indexing these exposes secrets in the dashboard. | Only read keys matching known chat/composer patterns. Never read `telemetry.*`, `remote.*`, `credentials.*`, or arbitrary keys. Use an allowlist, not a blocklist. |
| Ollama API responses containing system prompts | Some Ollama configurations include system prompts with sensitive instructions. If yclaude displays the Ollama response verbatim, system prompts leak. | Apply the same privacy filter philosophy: extract only metrics (model, tokens, timing), never display prompt or completion text. |
| Not validating `node:sqlite` input for SQL injection | If session IDs from one provider are used to query another provider's SQLite database, malicious session IDs could be SQL injection vectors | Always use parameterized queries (`db.prepare('SELECT value FROM cursorDiskKV WHERE key = ?').get(key)`). Never interpolate strings into SQL. |
| Serving Cursor/OpenCode data without the same CSP and localhost-only protections | New data sources bypass existing security boundaries | Verify that ALL new routes go through the same Hono middleware chain. Add integration tests that check CSP headers on new provider endpoints. |

## UX Pitfalls

Common user experience mistakes when presenting multi-provider analytics.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing empty provider tabs for uninstalled tools | Dashboard looks broken: "Cursor (0 sessions)" next to "Claude Code (847 sessions)" | Auto-detect which providers have data. Only show tabs for providers with discoverable data. Show a single "Add More Providers" link for undetected ones. |
| Using identical UI for all providers | Cache efficiency charts make no sense for Ollama. Subscription cost estimates don't apply to Claude Code. | Design provider-specific dashboard layouts. Claude Code: cache efficiency prominent. Cursor: session/model breakdown. Ollama: performance metrics + cloud-cost savings. |
| Mixing provider events in the Sessions list | User sees Claude Code and Cursor sessions interleaved, can't tell which is which | Add clear provider badges/icons on each session row. Default to provider-filtered views. Offer "All Providers" as an explicit toggle, not the default. |
| Showing $0.00 cost for OpenCode/Ollama without explanation | Users think the tool is broken or OpenCode is free (it's not -- they pay via their provider subscription) | Show "Cost data unavailable" or "Estimated from token pricing" with an info tooltip explaining why. For Ollama, show "Local inference -- no API cost" with optional cloud equivalent. |
| Requiring Ollama to be running to see the Ollama tab | User ran Ollama yesterday, wants to see history, but Ollama server is off | If yclaude has cached previous Ollama session data, show it. Only require live Ollama for "Current Models" / live status features. |
| Provider detection taking too long at startup | "npx yclaude" takes 15 seconds because it's scanning for Cursor, OpenCode, AND Ollama before showing anything | Detect providers in parallel. Show the dashboard immediately with loading states per provider tab. Claude Code (existing, fastest) loads first. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Cursor parser:** Often missing workspace-level data -- verify both `globalStorage/state.vscdb` AND all `workspaceStorage/*/state.vscdb` files are read
- [ ] **Cursor parser:** Often missing legacy format support -- verify `workbench.panel.aichat.view.aichat.chatdata` key (old format) is handled alongside `composerData:*` (new format)
- [ ] **Cursor parser:** Often missing token counts -- Cursor JSON blobs may not always include token usage; verify graceful handling when token data is absent
- [ ] **OpenCode parser:** Often missing JSON fallback -- verify that pre-v1.2.0 JSON file storage (`~/.local/share/opencode/storage/`) is supported alongside the SQLite database
- [ ] **OpenCode parser:** Often missing model alias resolution -- verify that `gemini-3-pro-high` and similar aliases are mapped to pricing-compatible model IDs
- [ ] **Ollama integration:** Often missing offline state handling -- verify dashboard works when Ollama server is not running (shows cached data or graceful empty state)
- [ ] **Ollama integration:** Often missing "equivalent cost" explanation -- verify that cloud-cost estimates have clear "hypothetical" labeling
- [ ] **Privacy filter:** Often missing per-provider coverage -- verify that privacy assertion tests exist for EACH provider, not just Claude Code
- [ ] **Cross-provider overview:** Often missing cost category labels -- verify that the Overview page distinguishes cost estimation methodologies per provider
- [ ] **API backwards compatibility:** Often missing v1 route preservation -- verify that ALL existing `/api/v1/*` endpoints return identical responses to v1.1 for Claude Code data
- [ ] **Test coverage:** Often missing multi-provider fixture data -- verify test fixtures exist for Cursor (real vscdb dump), OpenCode (both JSON and SQLite formats), and Ollama (API response snapshots)
- [ ] **Distribution:** Often missing `node:sqlite` error handling -- verify graceful degradation when `node:sqlite` is unavailable (older Node.js) or when databases are locked

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cursor format change breaks parser | MEDIUM | 1. Add new format detection case in Cursor parser. 2. Ship patch release. 3. Existing data continues to work; only new Cursor sessions affected. Recovery time: 1-2 days. |
| Over-abstracted provider layer | HIGH | 1. Split the generic interface back into provider-specific types. 2. Rewrite provider dashboards to use specific types. 3. This is essentially a rewrite of the abstraction layer. Recovery time: 1-2 weeks. |
| Claude Code regression in v1.2 | HIGH | 1. Immediate hotfix reverting the breaking change. 2. If the regression shipped to npm, publish v1.2.1 patch within hours. 3. User trust damage is the real cost -- hard to recover. Prevention is essential. |
| SQLite dependency breaks npx install | MEDIUM | 1. Remove the dependency, switch to `node:sqlite`. 2. If `node:sqlite` was already the approach, add better error messages and fallback. 3. Ship patch release. Recovery time: hours. |
| Privacy leak in new provider | CRITICAL | 1. Immediate npm unpublish of affected version. 2. Audit all provider parsers for similar leaks. 3. Add automated privacy assertion tests. 4. Post-mortem and public disclosure if any user data was exposed. Recovery time: days, trust recovery: weeks. |
| Cost calculations misleading users | LOW | 1. Add/improve disclaimers and labeling. 2. No data loss -- just UX/copy changes. 3. Ship in next regular release. Recovery time: hours. |
| Performance regression at startup | MEDIUM | 1. Profile startup to identify which provider is slow. 2. Add lazy loading / parallel loading. 3. May require architectural change if all providers were loaded sequentially. Recovery time: 1-3 days. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Cursor vscdb format fragility | Phase 2 (Cursor provider) | Fixture-based tests with 3+ Cursor versions; parser handles unknown `_v` values gracefully |
| Over-abstraction | Phase 1 (Provider abstraction design) | Shared interface has < 10 fields; provider-specific types exist; Claude Code-specific analytics (cache, subagent) preserved |
| Breaking Claude Code analytics | Phase 1 (Refactoring) | All 174 existing tests pass; API snapshot tests show zero drift; cost calculations produce identical results for v1.1 fixture data |
| Cost model incommensurability | Phase 1 (Design) + each provider phase | UI mockups show distinct cost labels per provider; no unlabeled cross-provider cost totals |
| Privacy model for Cursor | Phase 2 (Cursor provider) | Privacy assertion tests: raw Cursor data in, verify zero conversation content out; file path handling explicit |
| SQLite dependency | Phase 2 (First SQLite provider) | `npm pack` size delta < 500KB; `npx yclaude` works on clean Node 24+ machine without C compiler |
| OpenCode format migration | Phase 3 (OpenCode provider) | Tests cover both JSON storage (pre-v1.2.0) and SQLite storage (v1.2.0+); silently skipped migration detected |
| Ollama offline handling | Phase 4 (Ollama provider) | Test: Ollama tab renders gracefully when `localhost:11434` is unreachable |
| Startup performance | Phase 5 (Integration/polish) | Benchmark: dashboard serves first response within 3 seconds with all 4 providers and realistic data volumes |
| Cross-provider cost display | Phase 5 (Integration/polish) | User testing: do users understand that cost numbers have different confidence levels across providers? |

## Sources

- [Cursor Chat Architecture & Data Flow](https://dasarpai.com/dsblog/cursor-chat-architecture-data-flow-storage/) -- storage format details, cursorDiskKV schema
- [How to find old Cursor chats (Medium, Jan 2026)](https://medium.com/@furry_ai_diary/how-to-find-my-old-cursor-chats-a-complete-guide-bea510218c23) -- key naming patterns, version differences
- [Cursor vscdb 25GB+ forum report](https://forum.cursor.com/t/cursor-state-vscdb-25gb/153661) -- confirmed database size issues
- [Cursor chat lost after update forum report](https://forum.cursor.com/t/cursor-chat-lost-all-history-but-localf-complete-chat-composer-history-inaccessible-after-update-infinite-loading-sql-migration-failed/144289) -- migration failures
- [Cursor SQLite command allowlist](https://tarq.net/posts/cursor-sqlite-command-allowlist/) -- database structure confirmation
- [Cursor Pricing (Vantage, 2026)](https://www.vantage.sh/blog/cursor-pricing-explained) -- subscription-based credit pool model
- [Cursor Models & Pricing docs](https://cursor.com/docs/account/pricing) -- official token-based pricing
- [OpenCode GitHub](https://github.com/opencode-ai/opencode) -- Go-based CLI, SQLite storage
- [OpenCode SQLite migration issue #13654](https://github.com/anomalyco/opencode/issues/13654) -- JSON->SQLite migration silently skips
- [OpenCode locking issue #15188](https://github.com/anomalyco/opencode/issues/15188) -- concurrent access problems
- [OpenCode session schema (DeepWiki)](https://deepwiki.com/sst/opencode/2.1-session-management) -- Session.Info type, database row format
- [ccusage OpenCode guide](https://ccusage.com/guide/opencode/) -- OpenCode data format, cost: 0 issue, LiteLLM pricing
- [tokscale (multi-provider tracker)](https://github.com/junhoyeo/tokscale) -- data source locations for 10+ providers, LiteLLM pricing approach
- [Ollama Usage API docs](https://docs.ollama.com/api/usage) -- per-request metrics, no historical tracking
- [Ollama API docs](https://github.com/ollama/ollama/blob/main/docs/api.md) -- /api/generate, /api/chat, /api/ps endpoints
- [Ollama token tracking request #11118](https://github.com/ollama/ollama/issues/11118) -- confirms no built-in cumulative tracking
- [Ollama chat history logging issue #3193](https://github.com/ollama/ollama/issues/3193) -- confirms .ollama/history is CLI-only
- [Node.js SQLite module docs (v25.x)](https://nodejs.org/api/sqlite.html) -- Release Candidate, synchronous API, DatabaseSync class
- [Node.js 24 features (LogRocket)](https://blog.logrocket.com/node-js-24-new/) -- node:sqlite improvements, no longer requires flag
- [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3) -- native module requirements, compilation issues
- [OpenCode XDG paths issue #8235](https://github.com/anomalyco/opencode/issues/8235) -- cross-platform path issues
- [Cursor Data Use & Privacy](https://cursor.com/data-use) -- official privacy documentation

---
*Pitfalls research for: v1.2 multi-provider AI coding tool analytics*
*Researched: 2026-03-07*
