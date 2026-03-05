---
phase: 10-conversations-viewer
plan: 01
subsystem: api
tags: [hono, cli, normalizer, privacy, conversations, chats, pagination, search]

# Dependency graph
requires:
  - phase: 03-server-api
    provides: Hono server framework, API routes structure, AppState pattern
  - phase: 01-parser
    provides: NormalizedEvent schema, normalizeEvent, parseAll
  - phase: 02-cost-engine
    provides: applyPrivacyFilter, computeCosts, CostEvent
provides:
  - "--show-messages CLI flag for conversation content gating"
  - "normalizeEvent preserveContent option to retain message field"
  - "Dual event array architecture (filtered metadata-only + raw content-bearing)"
  - "/api/v1/config endpoint returning { showMessages: boolean }"
  - "/api/v1/chats paginated chat list with firstMessage/firstMessageFull, text search"
  - "/api/v1/chats/:id full conversation thread with content blocks"
  - "403 gating on /chats endpoints when showMessages disabled"
affects: [10-02-PLAN, 10-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual event array: filtered (privacy-safe) for existing endpoints, rawEvents (content-bearing) for /chats"
    - "ContentBlock extraction from Claude API message format (text, tool_use, tool_result; thinking excluded)"
    - "403 gating pattern with showMessages flag for privacy-sensitive endpoints"

key-files:
  created:
    - src/server/__tests__/api-chats.test.ts
  modified:
    - src/server/cli.ts
    - src/server/server.ts
    - src/server/routes/api.ts
    - src/parser/normalizer.ts
    - src/parser/types.ts
    - src/index.ts
    - src/server/__tests__/cli.test.ts
    - src/parser/__tests__/normalizer.test.ts
    - src/cost/__tests__/privacy.test.ts

key-decisions:
  - "AppState.showMessages is optional (not required) to avoid breaking 50+ existing test instantiations"
  - "preserveContent passes message through extractUnknownFields without mutating KNOWN_FIELDS set"
  - "rawEvents conditionally included in AppState via spread (exactOptionalPropertyTypes compat)"
  - "Chat list provides both firstMessage (truncated ~80 chars) and firstMessageFull (full text)"
  - "Text search uses case-insensitive substring across concatenated user/assistant text content"
  - "Tool result content truncated at 10000 chars server-side to limit response size"
  - "Thinking blocks excluded from conversation thread output"

patterns-established:
  - "Dual event pipeline: cli.ts creates filtered (applyPrivacyFilter) + rawEvents (preserveContent) arrays"
  - "403 gating: check state.showMessages before serving content-bearing data"
  - "ContentBlock extraction: extractContentBlocks() for structured message parsing"

requirements-completed: [CHAT-01]

# Metrics
duration: 6min
completed: 2026-03-05
---

# Phase 10 Plan 01: Conversations Viewer Backend Summary

**CLI --show-messages flag, dual event array architecture, /config + /chats + /chats/:id endpoints with 403 gating, text search, and pagination**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-05T08:55:23Z
- **Completed:** 2026-03-05T09:01:19Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Built dual event array pipeline: filtered (metadata-only) for existing endpoints, rawEvents (content-bearing) for new /chats endpoints
- Added --show-messages CLI flag wired through normalizeEvent(preserveContent) to retain message fields
- Implemented /api/v1/config, /api/v1/chats (paginated list with search), /api/v1/chats/:id (full thread with content blocks)
- All 174 tests pass (159 existing + 15 new), zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: CLI flag, normalizer preserveContent, AppState expansion, /config endpoint** - `2e1c6da` (feat)
2. **Task 2: /chats and /chats/:id endpoints with 403 gating, search, pagination** - `8ae8537` (feat)

## Files Created/Modified
- `src/parser/types.ts` - Added preserveContent to ParseOptions
- `src/parser/normalizer.ts` - normalizeEvent accepts preserveContent option, passes message through when true
- `src/index.ts` - parseAll passes preserveContent to normalizeEvent
- `src/server/server.ts` - AppState gains rawEvents and showMessages fields
- `src/server/cli.ts` - --show-messages flag, dual event array creation, wired to createApp
- `src/server/routes/api.ts` - /config endpoint, content extraction helpers, /chats and /chats/:id endpoints with 403 gating
- `src/server/__tests__/api-chats.test.ts` - 15 tests for config, chat list, chat detail, 403 enforcement, search, privacy regression
- `src/server/__tests__/cli.test.ts` - --show-messages flag parsing tests
- `src/parser/__tests__/normalizer.test.ts` - preserveContent option tests
- `src/cost/__tests__/privacy.test.ts` - Regression guard for privacy filter stripping content fields

## Decisions Made
- AppState.showMessages is optional (not required boolean) to maintain backward compatibility with 50+ existing test instantiations that create `{ events: [], costs: [] }`
- preserveContent implemented via runtime check in extractUnknownFields rather than mutating KNOWN_FIELDS set -- clean, safe approach
- rawEvents conditionally included in AppState object via ternary spread (not undefined assignment) to satisfy exactOptionalPropertyTypes
- Chat list items expose both firstMessage (truncated ~80 chars + "...") and firstMessageFull (full first user message text) per plan requirement

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] exactOptionalPropertyTypes compat in cli.ts**
- **Found during:** Task 1
- **Issue:** Passing `rawEvents: undefined` to createApp violated exactOptionalPropertyTypes -- undefined cannot be assigned to optional NormalizedEvent[] property
- **Fix:** Used ternary to conditionally include rawEvents in the AppState object (only when showMessages is true)
- **Files modified:** src/server/cli.ts
- **Verification:** `npx tsc --noEmit` passes (except pre-existing api.test.ts errors)
- **Committed in:** 2e1c6da (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal -- TypeScript strictness required conditional object construction instead of simple undefined assignment. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in api.test.ts (4 occurrences of `body` typed as `unknown`) -- out of scope per deviation rules, not caused by this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All backend endpoints ready for frontend consumption (Plan 02: chat list page, Plan 03: thread page)
- /api/v1/config enables frontend to detect showMessages state for nav and routing
- Content block extraction handles text, tool_use, tool_result (thinking excluded) -- frontend can render these directly

---
*Phase: 10-conversations-viewer*
*Completed: 2026-03-05*
