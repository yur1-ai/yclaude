# Phase 1: JSONL Parser & Data Pipeline - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the data foundation: read Claude Code JSONL files from disk, parse each line into a structured event object, deduplicate by UUID, and expose the result for downstream consumption. Error handling, file discovery, and the data contract are all in scope. UI rendering and cost calculation are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Tech Stack
- TypeScript + ESM throughout the project
- This is the baseline for all phases — every subsequent phase follows the same stack

### Event Output Shape
- Extract as many fields as possible from each JSONL line: type, tokens (input/output/cache_creation/cache_read broken out), model, session ID, project, timestamp, uuid, costUSD, durationMs, message role, tool_calls, request_id — everything available
- Unknown or unrecognized fields pass through as-is under their original key — nothing is dropped
- Future phases can consume new fields without requiring a parser change

### Error Handling
- A global `--debug` flag controls verbose output across the entire application
- Skipped/malformed lines are logged to stderr only when `--debug` is active — silent by default
- The parser never crashes on a bad line; skip and continue

### File Discovery
- Auto-detect all standard Claude data paths: `~/.claude/projects/**/*.jsonl`, `~/.config/claude/projects/**/*.jsonl`, and `$CLAUDE_CONFIG_DIR` if set
- When multiple paths exist, merge data from all of them — deduplication handles overlaps
- A `--dir <path>` flag overrides discovery and reads from the specified directory instead (consistent with the `--dir` flag planned for Phase 3's CLI)

### Claude's Discretion
- TypeScript type definitions and schema design for the event object
- Internal streaming vs batch parsing approach
- Deduplication data structure (Map by UUID, etc.)
- How CLAUDE_CONFIG_DIR interacts with the default paths (override vs append)

</decisions>

<specifics>
## Specific Ideas

- The `--debug` flag is global to the app, not parser-specific — all verbose output across all phases flows through this single toggle
- The `--dir` flag introduced here should be the same flag that Phase 3's CLI exposes (design for consistency now)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — greenfield project

### Established Patterns
- None yet — this phase establishes the baseline patterns for TypeScript + ESM

### Integration Points
- Phase 2 (Cost Engine) consumes the parsed event objects from this phase
- Phase 3 (CLI) will wire up the `--dir` and `--debug` flags introduced here

</code_context>

<deferred>
## Deferred Ideas

- UI error surfacing for parse errors — discussed when Phase 4+ frontend is implemented (how to surface skipped/malformed lines in the dashboard UI)

</deferred>

---

*Phase: 01-jsonl-parser-data-pipeline*
*Context gathered: 2026-02-28*
