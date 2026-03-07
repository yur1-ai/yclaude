# Project Research Summary

**Project:** yclaude v1.2 Multi-Provider Analytics
**Domain:** Multi-provider AI coding analytics dashboard (local-first)
**Researched:** 2026-03-07
**Confidence:** MEDIUM-HIGH

## Executive Summary

yclaude v1.2 extends the existing Claude Code-only analytics dashboard to support Cursor, OpenCode, and Ollama. All four providers produce structurally similar data -- session identifiers, timestamps, model names, token counts -- but store it in fundamentally different formats. Claude Code uses JSONL files (`~/.claude/`). Cursor uses SQLite key-value databases (`state.vscdb`) with versioned JSON blobs. OpenCode uses SQLite (v1.2+) or legacy JSON files (`~/.local/share/opencode/`). Ollama stores nothing persistent -- it has no historical usage data, only transient per-response API metrics. The architecture research converges on a **Provider Adapter pattern**: each provider implements a self-contained adapter behind a shared `ProviderAdapter` interface that produces `UnifiedEvent[]`, letting the existing cost engine, privacy filter, API routes, and frontend components work with minimal modification.

The recommended approach requires **zero new npm dependencies**. Node.js 24+ (already required by yclaude) includes `node:sqlite` as a built-in module, which handles both Cursor and OpenCode SQLite databases without native compilation, prebuild downloads, or bundle size increases. This preserves the zero-friction `npx yclaude` experience. The existing Claude Code pipeline moves to `src/providers/claude/` as a reference adapter, and all API endpoints gain a `?provider=` query parameter for provider-scoped filtering. The frontend adds provider tabs in the sidebar -- each tab filters all views to one provider; an "All" tab shows cross-provider totals.

The **primary risk** is Cursor's undocumented, frequently-changing `state.vscdb` format. The database schema uses an internal `_v` version field (currently v3), has at least three historical key patterns, files can reach 25GB+, and Cursor ships weekly updates that may change the schema without notice. Defensive parsing with version detection, targeted SQL queries (never `SELECT *`), and fixture-based tests across multiple Cursor versions are essential. The **secondary risk** is cost model incommensurability: Claude Code has exact API pricing, Cursor has subscription-based credits, OpenCode often stores `cost: 0` requiring token-based estimation, and Ollama is free. Cross-provider cost totals must carry explicit disclaimers and distinct visual treatments. The **strategic opportunity** is that no competitor offers a unified local-first web dashboard across all four providers -- tokscale has breadth (16+ providers) but is CLI-only; yclaude fills the "polished web dashboard for multi-tool developers" gap.

## Key Findings

### Recommended Stack

The existing stack (Node 24+, TypeScript, Hono v4, React 19, Vite 7, Tailwind v4, tsup, Commander, Zod 4, TanStack Query 5, Zustand 5, Recharts 3, Vitest 4) is unchanged. The only addition is `node:sqlite` -- a built-in Node.js module requiring no installation.

**Core technologies for v1.2:**
- `node:sqlite` (DatabaseSync): Read Cursor `state.vscdb` and OpenCode `opencode.db` -- built-in, zero install friction, synchronous API, read-only mode, no bundling issues with tsup's `noExternal: [/.*/]`
- Static pricing tables per provider: Claude pricing exists; add OpenAI/Google/DeepSeek/Mistral tables for OpenCode; Ollama gets cloud-equivalent estimates -- all in-source, no network calls
- No `better-sqlite3`, `sql.js`, `ollama` npm package, or any ORM -- each was evaluated and rejected for specific reasons (native compilation, memory overhead, unnecessary abstraction)

**Critical version requirement:** Node >=24.0.0 (already in `package.json`). `node:sqlite` is Stability 1.1 in Node 22-24, Release Candidate in Node 25. The API surface used (DatabaseSync, prepare(), get(), all(), close()) is minimal and stable.

### Expected Features

**Must have (table stakes for "multi-provider" label):**
- PROV-01: Provider abstraction layer (UnifiedEvent, ProviderAdapter, registry)
- PROV-02: Auto-detect which tools are installed (no manual config)
- PROV-03: Provider-tabbed navigation (per-provider views + "All" tab)
- PROV-04: `?provider=` filter on all existing API endpoints (backward compatible)
- CURS-01: Cursor session parsing (composerData v3 + bubbles from state.vscdb)
- CURS-02: Cursor cost extraction (usageData.costInCents)
- OC-01: OpenCode session parsing (SQLite + JSON fallback)
- CROSS-01: Cross-provider overview (total spend, provider breakdown)

**Should have (differentiators):**
- CURS-03: Cursor agent mode analytics (isAgentic flag segmentation)
- OC-02: OpenCode multi-model pricing (use pre-calculated cost when available)
- OC-03: OpenCode code-change metrics (summary_additions, summary_deletions)
- CROSS-02: Cross-provider model comparison
- CROSS-03: Unified activity heatmap
- PROV-05: Provider-specific personality copy

**Defer to v1.3+:**
- OLMA-01/OLMA-02: Ollama analytics + savings calculator -- defer entirely. Ollama has no persistent usage data. The recommended approach is to surface Ollama usage through client tools that call it (if Cursor/OpenCode routes through Ollama, those providers already track it). A proxy or log parser can come in v1.3 with more context.
- Conversation viewer for Cursor/OpenCode
- GitHub Copilot support (no accessible local data)
- CSV/JSON export per provider
- Real-time monitoring for any provider

### Architecture Approach

The Provider Adapter pattern with static imports (not a plugin system) is the right fit for 3-4 known providers. Each provider is a directory under `src/providers/` containing reader, normalizer, pricing, and types -- fully self-contained. The existing `src/parser/` code moves (not copies) to `src/providers/claude/`, with thin re-exports at old paths for npm API backward compatibility. The cost engine gains provider-dispatched pricing lookup. API routes add a single `filterByProvider()` helper. The frontend adds a Zustand `useProviderStore` that propagates the active provider through all TanStack Query hooks via `queryKey`. No page component duplication -- one `Overview.tsx` renders data for any provider.

**Major components:**
1. `src/providers/types.ts` + `registry.ts` -- UnifiedEvent type, ProviderAdapter interface, detection + loading orchestration
2. `src/providers/{claude,cursor,opencode}/` -- Self-contained provider adapters with reader, normalizer, pricing
3. `src/cost/engine.ts` -- Provider-dispatched pricing (delegates to each adapter's `getModelPricing()`)
4. `src/server/routes/api.ts` -- `?provider=` filter on all endpoints + new `/api/v1/providers` endpoint
5. `web/src/store/useProviderStore.ts` -- Active provider state driving all API calls

### Critical Pitfalls

1. **Cursor state.vscdb format fragility** -- Undocumented, versioned (_v:2 to _v:3 already observed), three+ key patterns, 25GB+ files, weekly Cursor updates. **Avoid:** Version detection in parser, targeted SQL queries only (`WHERE key LIKE 'composerData:%'`), read-only mode, fixture-based tests from 3+ Cursor versions, graceful fallback for unknown versions.

2. **Over-abstracting the provider layer** -- Forcing all providers into a single `{ tokens, costUsd }` shape loses the most valuable provider-specific analytics (cache efficiency for Claude, agent mode for Cursor, code-change metrics for OpenCode). **Avoid:** Thin shared interface (<10 universal fields) plus provider-specific types. `providerMeta` bag for rare cross-cutting data. Per-provider dashboard layouts that show relevant features, not "N/A" placeholders.

3. **Breaking existing Claude Code analytics** -- 174 tests, 8,264 LOC. Refactoring touches parser, cost engine, privacy filter, AppState, all API routes. Any regression in cost numbers destroys user trust. **Avoid:** Wrap, don't rewrite. Claude pipeline moves to `src/providers/claude/` unchanged. All existing tests pass against same code paths. API snapshot tests for regression detection.

4. **Cost model incommensurability** -- Claude has per-token API pricing. Cursor has subscription credits with `costInCents`. OpenCode stores `cost: 0` for most entries. Ollama is free. Cross-provider "total cost" is meaningless without labeling. **Avoid:** Three cost categories with explicit UI labels: "API-estimated" (Claude), "provider-reported" (Cursor), "token-estimated" (OpenCode). Use `costSource` discriminator type. Never show unlabeled cross-provider totals.

5. **Privacy model breaks for Cursor data** -- Cursor stores session metadata and conversation content interleaved in the same JSON blob. The existing "strip content after parsing" approach fails when content IS the data source. **Avoid:** Privacy filtering at the parser level for Cursor/OpenCode -- extract only analytics fields, never pass raw conversation content upstream. Per-provider privacy assertion tests.

## Implications for Roadmap

Based on combined research, the recommended phase structure follows the dependency chain: abstraction -> highest-risk provider -> UI infrastructure -> additional providers.

### Phase 1: Provider Abstraction Layer
**Rationale:** Everything depends on the provider interface. Getting the data model wrong means rewriting all providers. Must be done first and validated against the existing Claude pipeline before adding new providers.
**Delivers:** `UnifiedEvent` type, `ProviderAdapter` interface, provider registry, Claude provider module (moved from `src/parser/`), backward-compatible public API. `npx yclaude` works identically to v1.1.
**Addresses:** PROV-01 (abstraction), PROV-02 (detection)
**Avoids:** Pitfall 2 (over-abstraction -- design the thin shared interface here), Pitfall 3 (breaking Claude -- wrap, don't rewrite)
**Stack elements:** No new dependencies. Pure TypeScript refactoring.
**Estimated effort:** 3-4 days

### Phase 2: Cursor Provider
**Rationale:** Highest-risk provider due to undocumented format. Validating the abstraction against the most complex data source ensures it can handle anything. Cursor has the largest user base among AI coding tools -- high-value target.
**Delivers:** Full Cursor session parsing, cost extraction from usageData.costInCents, agent mode flag extraction. Cursor data visible in API responses.
**Addresses:** CURS-01 (session parsing), CURS-02 (cost extraction), CURS-03 (agent mode)
**Avoids:** Pitfall 1 (vscdb fragility -- version detection, targeted queries), Pitfall 5 (privacy -- parser-level filtering), Pitfall 6 (SQLite dependency -- use node:sqlite)
**Stack elements:** `node:sqlite` (built-in), first SQLite reader
**Estimated effort:** 4-6 days

### Phase 3: API + Frontend Provider Support
**Rationale:** Requires at least two working providers (Claude + Cursor) to properly test multi-provider UX. Building after Cursor validates the abstraction with real multi-provider data.
**Delivers:** Provider-tabbed navigation, `?provider=` filter on all endpoints, `/api/v1/providers` endpoint, cross-provider overview, provider Zustand store, updated TanStack Query hooks.
**Addresses:** PROV-03 (tabs), PROV-04 (API filter), CROSS-01 (cross-provider overview), CROSS-02 (model comparison), CROSS-03 (unified heatmap), PROV-05 (personality copy)
**Avoids:** Pitfall 4 (cost incommensurability -- distinct cost labels per provider in UI)
**Stack elements:** React, Zustand, TanStack Query (existing)
**Estimated effort:** 4-7 days

### Phase 4: OpenCode Provider
**Rationale:** Second new provider, moderate risk. Cleaner relational SQLite schema than Cursor. Adding after the provider abstraction is battle-tested reduces risk. Exercises multi-provider pricing (OpenCode supports 75+ AI providers).
**Delivers:** OpenCode session parsing (SQLite + JSON fallback), pre-calculated cost extraction, code-change metrics, session hierarchy, provider breakdown.
**Addresses:** OC-01 (session parsing), OC-02 (multi-model pricing), OC-03 (code-change metrics), OC-04 (session hierarchy), OC-05 (provider breakdown)
**Avoids:** OpenCode cost: 0 pitfall (use session.cost when available, token-estimate when not), format migration pitfall (detect SQLite vs JSON)
**Stack elements:** `node:sqlite` (reuse from Phase 2), multi-provider pricing tables
**Estimated effort:** 3-5 days

### Phase 5: Polish, Testing, and Ollama Preparation
**Rationale:** Integration testing, performance optimization, and preparing Ollama support architecture for v1.3.
**Delivers:** Comprehensive cross-provider integration tests, performance benchmarks (3-second startup target), Ollama pricing tables for cloud-equivalent cost mapping (used when Cursor/OpenCode route through Ollama), documentation.
**Addresses:** Startup performance pitfall, cross-provider cost display UX, test coverage gaps
**Avoids:** Shipping a half-baked Ollama provider with fragile log parsing -- defer the actual Ollama data collection to v1.3
**Stack elements:** Vitest (existing)
**Estimated effort:** 2-4 days

### Phase Ordering Rationale

- **Phase 1 gates everything.** The UnifiedEvent type and ProviderAdapter interface are the contract that all subsequent phases implement against. Getting this wrong costs the most to fix.
- **Phase 2 (Cursor) before Phase 4 (OpenCode)** because Cursor is harder. If the abstraction survives the most complex provider, it will handle OpenCode easily. Fail fast on the hardest problem.
- **Phase 3 (UI) after Phase 2** because multi-provider UX cannot be properly designed or tested with only one provider. Claude + Cursor gives two real data sources to validate tab navigation, filtering, and cross-provider aggregation.
- **Phase 4 (OpenCode) after Phase 3** because by this point the adapter pattern is proven and the UI infrastructure exists. OpenCode becomes "just another adapter" -- low risk, fast implementation.
- **Ollama deferred to v1.3.** Three providers (Claude + Cursor + OpenCode) is a strong v1.2. Ollama has no persistent data and requires either a proxy server or fragile log parsing. The effort-to-value ratio is poor for v1.2. Surface Ollama model usage indirectly through client tools that call it.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Cursor):** HIGH risk. Need hands-on exploration of real state.vscdb files from Cursor 2.2.x, 2.3.x, and current versions. Build a test fixture corpus before writing the parser. Validate that `node:sqlite` can open vscdb files in read-only mode without Cursor locking conflicts.
- **Phase 4 (OpenCode):** MEDIUM risk. Dual storage format (SQLite + JSON) needs hands-on validation. Model alias resolution (e.g., `gemini-3-pro-high` vs standard API model IDs) needs a reference corpus. Verify OpenCode's `cost` field reliability (STACK.md says cumulative, FEATURES.md says often zero -- need to reconcile with real data).

Phases with standard patterns (skip research-phase):
- **Phase 1 (Abstraction):** Well-understood adapter pattern. The existing codebase structure maps cleanly to the provider directory layout. No unknowns.
- **Phase 3 (API+UI):** Standard `?provider=` query parameter filtering and Zustand store patterns. Tab navigation is a solved UI problem.
- **Phase 5 (Polish):** Testing and performance optimization follow established patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. `node:sqlite` is built-in, documented, and tested. tsup bundling unaffected. |
| Features | MEDIUM-HIGH | Feature parity matrix is clear. Cursor/OpenCode field availability confirmed by 5+ community tools each. Ollama limitations well-understood. |
| Architecture | HIGH | Provider adapter pattern is well-established. Existing codebase structure supports the move cleanly. Data flow end-to-end is mapped. |
| Pitfalls | HIGH | Every pitfall backed by specific GitHub issues, forum posts, or direct code review. Recovery strategies documented. |
| Cursor data format | MEDIUM | Reverse-engineered from 7+ community sources (cursor-view, cursor-conversations-mcp, Cursor extension blog, cursor-db-mcp, etc.). Schema confirmed but not officially documented. |
| OpenCode data format | MEDIUM | Confirmed by ccusage, OpenCode Monitor, opencode-tokenscope, and GitHub issues. SQLite schema stable but actively evolving. |
| Ollama data availability | LOW | No persistent usage history. Log parsing is fragile. Deferred to v1.3. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Cursor state.vscdb hands-on validation:** Community articles provide the schema, but real database files from multiple Cursor versions must be captured and analyzed before committing to parser implementation. Key unknown: whether `usageData.costInCents` is populated on all Cursor plans and versions.
- **node:sqlite + WAL mode compatibility:** Verify that `node:sqlite` can open Cursor's vscdb files (SQLite3 with possible WAL mode) and OpenCode's db (Drizzle ORM, WAL mode) in read-only mode without locking conflicts. Test with Cursor/OpenCode actively running.
- **OpenCode cost field reliability:** STACK.md says `session.cost` is cumulative and authoritative. FEATURES.md says OpenCode stores `cost: 0` for messages. PITFALLS.md says cost must be calculated from tokens. Need to reconcile: likely session-level cost is reliable, but per-message cost is zero. Must verify with real databases.
- **OpenCode dual-format prevalence:** Unknown what percentage of OpenCode users are on v1.2+ (SQLite) vs older (JSON). Both must be supported, but knowing the ratio helps prioritize testing effort.
- **Cross-provider cost UX:** The cost confidence levels differ dramatically across providers. How to present "API-estimated" vs "provider-reported" vs "token-estimated" costs in a unified Overview page needs UX exploration during Phase 3 planning.
- **Cursor database size handling:** Forum reports of 25-50GB state.vscdb files. Must validate that targeted SQL queries with `node:sqlite` handle large files without excessive memory or time. Consider caching parsed results.

## Sources

### Primary (HIGH confidence)
- `src/parser/`, `src/cost/`, `src/server/` -- existing codebase, read directly
- [Node.js v25 SQLite Documentation](https://nodejs.org/api/sqlite.html) -- built-in SQLite API, Release Candidate status
- [Node.js v22 LTS SQLite Documentation](https://nodejs.org/docs/latest-v22.x/api/sqlite.html) -- Stability 1.1, no flag since 22.13
- [Ollama API Reference (GitHub)](https://github.com/ollama/ollama/blob/main/docs/api.md) -- full API specification
- [Ollama token tracking request #11118](https://github.com/ollama/ollama/issues/11118) -- confirms no persistent tracking
- [OpenCode GitHub](https://github.com/opencode-ai/opencode) -- official repository
- [tokscale GitHub](https://github.com/junhoyeo/tokscale) -- multi-provider reference (16+ providers)
- [ccusage GitHub](https://github.com/ryoppippi/ccusage) -- CLI ecosystem reference

### Secondary (MEDIUM confidence)
- [Cursor Chat Architecture & Storage](https://dasarpai.com/dsblog/cursor-chat-architecture-data-flow-storage/) -- state.vscdb structure, cursorDiskKV schema
- [Cursor Extension for Opik Export](https://jacquesverre.com/blog/cursor-extension) -- composerData/bubble JSON schema, usageData.costInCents, tokenCount
- [Cursor Conversations MCP](https://glama.ai/mcp/servers/@vltansky/cursor-conversations-mcp/) -- ComposerData v3 schema
- [cursor-view GitHub](https://github.com/saharmor/cursor-view) -- vscdb parsing reference
- [OpenCode Session Management (DeepWiki)](https://deepwiki.com/opencode-ai/opencode/5.2-session-management) -- session schema, token accumulation
- [ccusage OpenCode guide](https://ccusage.com/guide/opencode/) -- data paths, message format
- [OpenCode Monitor](https://ocmonitor.vercel.app/) -- reference analytics tool
- [opencode-tokenscope](https://github.com/ramtinJ95/opencode-tokenscope) -- per-turn token analysis reference

### Tertiary (LOW confidence -- needs validation)
- Cursor `_v` schema versioning -- v3 as of early 2026, may change with any Cursor update
- OpenCode model alias resolution -- `gemini-3-pro-high` vs standard IDs unconfirmed
- Cursor `usageData.costInCents` population consistency across plans/versions
- Ollama server log format stability across versions

---
*Research completed: 2026-03-07*
*Milestone: v1.2 Multi-Provider Analytics*
*Ready for roadmap: yes*
