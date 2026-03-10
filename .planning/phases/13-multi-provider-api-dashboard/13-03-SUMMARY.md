---
phase: 13-multi-provider-api-dashboard
plan: 03
subsystem: ui
tags: [react, zustand, provider-tabs, provider-badge, sidebar, cost-source, session-type-filter]

# Dependency graph
requires:
  - phase: 13-multi-provider-api-dashboard
    plan: 01
    provides: "Provider/costSource fields on session/chat/model API rows, sessionType filter"
  - phase: 13-multi-provider-api-dashboard
    plan: 02
    provides: "useProviderStore, PROVIDER_COLORS, ProviderBadge component, provider-aware hooks"
provides:
  - "ProviderTabs sidebar component with colored tab buttons"
  - "Provider-aware nav item disabling (Projects grayed out for Cursor)"
  - "Provider badge column on Sessions, Chats, Models in All-view"
  - "Inline cost source badges (est./rep.) on Sessions and Chats in All-view"
  - "Session type filter dropdown on Sessions page"
  - "Provider store population from config on Layout mount"
affects: [13-04]

# Tech tracking
tech-stack:
  added: []
  patterns: ["isAllView conditional column rendering", "client-side sessionType filtering", "costSourceLabel prop pass-through"]

key-files:
  created:
    - web/src/components/ProviderTabs.tsx
  modified:
    - web/src/components/Layout.tsx
    - web/src/pages/Sessions.tsx
    - web/src/pages/Chats.tsx
    - web/src/pages/Models.tsx
    - web/src/components/ChatCard.tsx

key-decisions:
  - "ProviderTabs hidden when <2 providers loaded (single-provider identical to v1.1)"
  - "Provider-aware nav uses opacity-40 pointer-events-none for grayed-out items (visible but non-interactive)"
  - "Session type filter uses client-side filtering to avoid modifying hooks"
  - "Cost source badges shown only in All-view (single-provider view all rows have same source)"
  - "ChatCard accepts costSourceLabel prop for flexible cost source display"

patterns-established:
  - "isAllView pattern: provider === 'all' gates provider columns and cost source badges"
  - "useMemo columns array: columns rebuilt when provider view changes"
  - "Client-side session type filtering with pass-through for events without sessionType"

requirements-completed: [PROV-03, CROSS-02]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 13 Plan 03: Provider Tab Navigation and List Page Badges Summary

**Sidebar provider tabs with colored indicators, provider badges and cost source badges on Sessions/Chats/Models list pages, session type filter, and provider-aware nav disabling**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T03:45:31Z
- **Completed:** 2026-03-10T03:49:55Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created ProviderTabs component with colored left-border indicators, auto-hidden for single-provider users
- Integrated ProviderTabs in Layout sidebar between header and nav, with provider store population from config
- Added provider-aware nav item disabling (Projects grayed out for Cursor, all items available for Claude/All)
- Sessions page: provider badge column in All-view, inline cost source badges (est./rep.), session type filter dropdown
- Chats page: provider badge per card in All-view, cost source label propagated through ChatCard costSourceLabel prop
- Models page: provider column with badge in All-view

## Task Commits

Each task was committed atomically:

1. **Task 1: ProviderTabs + Layout sidebar + provider-aware nav** - `70ba52f` (feat)
2. **Task 2: Provider badges + cost source badges + session type filter** - `edd8b8a` (feat)

## Files Created/Modified
- `web/src/components/ProviderTabs.tsx` - Provider tab bar with colored indicators, hidden when <2 providers (new)
- `web/src/components/Layout.tsx` - Integrates ProviderTabs, populates provider store from config, provider-aware nav disabling
- `web/src/pages/Sessions.tsx` - Provider badge column, cost source badges, session type filter dropdown
- `web/src/pages/Chats.tsx` - Provider badge per card, cost source label in All-view
- `web/src/pages/Models.tsx` - Provider column with badge in All-view
- `web/src/components/ChatCard.tsx` - Added optional costSourceLabel prop for inline cost source display

## Decisions Made
- ProviderTabs hidden for single-provider users (providers.length < 2) to maintain identical v1.1 experience
- Nav items grayed out with opacity-40 and pointer-events-none rather than hidden -- keeps layout stable
- Session type filter uses client-side filtering of API results rather than adding a new hook parameter, avoiding modification of the useSessions hook
- Cost source badges only appear in All-view since single-provider view has uniform cost source
- ChatCard extended with costSourceLabel prop rather than modifying ChatItem type, keeping the hook interface clean
- Provider columns use useMemo to avoid unnecessary re-renders when switching between All and single-provider view

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript strict cast on ChatItem to Record<string, unknown>**
- **Found during:** Task 2 (Chats page provider badge)
- **Issue:** ChatItem interface doesn't extend Record<string, unknown> (unlike SessionRow), so direct cast failed with TS2352
- **Fix:** Used double cast `chat as unknown as Record<string, unknown>` to safely access provider/costSource fields
- **Files modified:** web/src/pages/Chats.tsx
- **Verification:** npx tsc --noEmit reports zero errors
- **Committed in:** edd8b8a

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Minor type cast adjustment. No scope creep.

## Issues Encountered
None - plan executed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All list pages now show provider-specific data with badges and cost source indicators
- Provider tab switching triggers all hook refetches via queryKey invalidation (from Plan 02)
- Ready for Plan 04 (Provider Breakdown Charts on Overview page)

---
*Phase: 13-multi-provider-api-dashboard*
*Completed: 2026-03-10*
