---
phase: 10-conversations-viewer
plan: 02
subsystem: ui
tags: [react, hooks, chat-list, pagination, search, dark-mode, react-markdown, react-syntax-highlighter]

# Dependency graph
requires:
  - phase: 10-conversations-viewer
    plan: 01
    provides: "/api/v1/config, /api/v1/chats endpoints, ChatItem shape with firstMessage/firstMessageFull"
  - phase: 08-dark-mode-personality
    provides: Dark mode CSS vars, quips system, StatCard dark tokens
provides:
  - "useConfig hook for showMessages flag detection"
  - "useChats hook with pagination, project filter, text search, date range"
  - "ChatCard component with expand/collapse, search highlighting"
  - "Chats page with info banner, filters, card list, pagination, empty state"
  - "ChatsDisabled explanation page with enable instructions"
  - "Chats nav item in sidebar with conditional locked indicator"
  - "/chats route in App.tsx"
  - "empty_chats and feature_disabled quip arrays"
  - "react-markdown, remark-gfm, react-syntax-highlighter installed (for Plan 03)"
affects: [10-03-PLAN]

# Tech tracking
tech-stack:
  added: [react-markdown, remark-gfm, react-syntax-highlighter, "@types/react-syntax-highlighter"]
  patterns:
    - "useConfig hook with staleTime: Infinity for server-lifetime config"
    - "Debounced search input (300ms) via useState + useEffect + setTimeout"
    - "ChatCard expand/collapse with firstMessage (truncated) and firstMessageFull (full text)"
    - "Search highlighting via regex split + <mark> tags"
    - "Conditional nav item with locked indicator based on config"

key-files:
  created:
    - web/src/hooks/useConfig.ts
    - web/src/hooks/useChats.ts
    - web/src/components/ChatCard.tsx
    - web/src/pages/Chats.tsx
    - web/src/pages/ChatsDisabled.tsx
  modified:
    - web/src/App.tsx
    - web/src/components/Layout.tsx
    - web/src/lib/quips.ts
    - web/package.json
    - web/package-lock.json

key-decisions:
  - "Chats NavLink placed outside navItems array (separate JSX) to support conditional locked indicator"
  - "Search debounce uses local state + useEffect + setTimeout (no external debounce library)"
  - "ChatCard is a standalone component (not SortableTable row) since cards are a different pattern from tables"
  - "HighlightedText splits on regex and wraps matches in <mark> for search highlighting"
  - "biome-ignore for noArrayIndexKey on HighlightedText parts and useExhaustiveDependencies on debounce/page-reset effects"

patterns-established:
  - "Card-based list layout (ChatCard) as alternative to SortableTable for entity browsing"
  - "Debounced search input pattern: searchInput (immediate) + debouncedSearch (delayed) state pair"
  - "Config-gated feature pattern: useConfig() -> conditionally render enabled/disabled page"

requirements-completed: [CHAT-01]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 10 Plan 02: Conversations Viewer Frontend Summary

**Chat list page with useConfig/useChats hooks, ChatCard expand/collapse, debounced search, project filter, pagination, conditional nav item with locked state, and ChatsDisabled explanation page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T09:03:50Z
- **Completed:** 2026-03-05T09:07:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Built full chat browsing experience: card list with expand/collapse, search highlighting, project filter, date range, pagination
- Created useConfig hook for detecting --show-messages flag, useChats hook mirroring useSessions pattern
- Added Chats nav item to sidebar with locked indicator when disabled, ChatsDisabled page with helpful enable instructions
- Installed react-markdown, remark-gfm, react-syntax-highlighter for Plan 03 conversation thread rendering
- All 174 tests pass, zero regressions, TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, useConfig hook, Layout nav update, App.tsx routes** - `65ccc8e` (feat)
2. **Task 2: useChats hook, ChatCard component, and Chats list page** - `6f53f9c` (feat)

## Files Created/Modified
- `web/src/hooks/useConfig.ts` - Fetches /api/v1/config with staleTime: Infinity
- `web/src/hooks/useChats.ts` - Fetches /api/v1/chats with pagination, search, project filter, date range
- `web/src/components/ChatCard.tsx` - Chat card with expand/collapse, search highlighting, view conversation button
- `web/src/pages/Chats.tsx` - Full chat list page with info banner, filters, card list, pagination, empty state
- `web/src/pages/ChatsDisabled.tsx` - Explanation page when --show-messages not active
- `web/src/App.tsx` - Added /chats route
- `web/src/components/Layout.tsx` - Added Chats NavLink with conditional locked indicator
- `web/src/lib/quips.ts` - Added empty_chats and feature_disabled quip arrays
- `web/package.json` - Added react-markdown, remark-gfm, react-syntax-highlighter, @types/react-syntax-highlighter
- `web/package-lock.json` - Updated lockfile

## Decisions Made
- Chats NavLink placed as separate JSX after the navItems.map() loop rather than adding to the navItems array -- needed to support conditional locked indicator based on useConfig() data
- Search debounce implemented with useState + useEffect + setTimeout rather than adding a debounce utility library -- simple, no new dependency
- ChatCard is a standalone component using div-based card layout, not SortableTable -- cards are a fundamentally different browsing pattern from tables
- HighlightedText component splits text on regex matches and wraps in `<mark>` tags -- handles case-insensitive highlighting without dangerouslySetInnerHTML

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Chat list page fully functional, ready for Plan 03 (conversation thread page)
- react-markdown and syntax highlighter already installed for Plan 03 markdown rendering
- ChatCard "View full conversation" button navigates to /chats/:sessionId (route to be added in Plan 03)
- useConfig hook reusable by Plan 03's ChatDetail page for showMessages gating

## Self-Check: PASSED

All 6 created files verified on disk. Both task commits (65ccc8e, 6f53f9c) confirmed in git history.

---
*Phase: 10-conversations-viewer*
*Completed: 2026-03-05*
