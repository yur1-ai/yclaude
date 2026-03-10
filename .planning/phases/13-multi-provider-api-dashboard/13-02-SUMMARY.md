---
phase: 13-multi-provider-api-dashboard
plan: 02
subsystem: ui
tags: [zustand, react-query, provider-filter, frontend-hooks]

# Dependency graph
requires:
  - phase: 11-dashboard-core
    provides: "All 14 hooks with date-range filtering pattern"
  - phase: 12-cursor-provider
    provides: "ProviderId type with claude/cursor/opencode union"
provides:
  - "useProviderStore Zustand store for provider selection"
  - "PROVIDER_COLORS and PROVIDER_NAMES maps for UI rendering"
  - "ProviderBadge component (colored dot + name)"
  - "All 14 hooks include provider in queryKey and pass ?provider= to API"
affects: [13-03, 13-04]

# Tech tracking
tech-stack:
  added: []
  patterns: ["provider-aware hooks with queryKey invalidation", "ProviderFilter type union"]

key-files:
  created:
    - web/src/lib/providers.ts
    - web/src/store/useProviderStore.ts
    - web/src/components/ProviderBadge.tsx
  modified:
    - web/src/hooks/useConfig.ts
    - web/src/hooks/useSummary.ts
    - web/src/hooks/useAllTimeSummary.ts
    - web/src/hooks/useCostOverTime.ts
    - web/src/hooks/useModels.ts
    - web/src/hooks/useProjects.ts
    - web/src/hooks/useSessions.ts
    - web/src/hooks/useSessionDetail.ts
    - web/src/hooks/useChats.ts
    - web/src/hooks/useChatDetail.ts
    - web/src/hooks/useActivityData.ts
    - web/src/hooks/useBranches.ts
    - web/src/hooks/usePriorSummary.ts
    - web/src/hooks/usePricingMeta.ts

key-decisions:
  - "ProviderId re-declared locally in web/src/lib/providers.ts to avoid cross-package imports (web tsconfig only includes web/src)"
  - "ProviderBadge uses inline style with light color for dot -- reads well on both light and dark backgrounds"
  - "usePricingMeta: provider in queryKey only, no ?provider= param (global endpoint)"
  - "useSessionDetail/useChatDetail: provider in queryKey only, no ?provider= param (session-scoped)"

patterns-established:
  - "Provider hook pattern: import useProviderStore, destructure provider, add to queryKey and URL params"
  - "ProviderFilter type: ProviderId | 'all' used across store and helpers"

requirements-completed: [PROV-03, PROV-04]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 13 Plan 02: Frontend Provider Plumbing Summary

**Zustand provider store, color/name helpers, ProviderBadge component, and all 14 hooks wired with provider-aware queryKeys and ?provider= API params**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T03:30:20Z
- **Completed:** 2026-03-10T03:34:49Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Created provider store (useProviderStore) following existing Zustand patterns with provider selection and providers list management
- Created providers.ts with PROVIDER_COLORS, PROVIDER_NAMES, ProviderId, and ProviderFilter exports for all UI plans
- Created ProviderBadge component with colored dot and human-readable provider name
- Updated all 14 hooks with provider in queryKey for automatic cache invalidation on provider tab switch
- Extended useConfig AppConfig interface with optional providers array for Layout population
- Added ?provider= URL params to all applicable hooks (with documented exceptions for pricing-meta, session-detail, chat-detail)

## Task Commits

Each task was committed atomically:

1. **Task 1: Provider store + helpers + badge component** - `9e29f6d` (feat)
2. **Task 2: Update all 14 hooks with provider awareness** - `8e1dda8` (feat)

## Files Created/Modified
- `web/src/lib/providers.ts` - Provider colors, names, and filter types (new)
- `web/src/store/useProviderStore.ts` - Zustand store for provider selection (new)
- `web/src/components/ProviderBadge.tsx` - Colored dot + name badge component (new)
- `web/src/hooks/useConfig.ts` - Extended AppConfig with providers[], added provider to queryKey
- `web/src/hooks/useSummary.ts` - Added provider to queryKey and ?provider= param
- `web/src/hooks/useAllTimeSummary.ts` - Added provider to queryKey and ?provider= param
- `web/src/hooks/useCostOverTime.ts` - Added provider to queryKey and ?provider= param
- `web/src/hooks/useModels.ts` - Added provider to queryKey and ?provider= param
- `web/src/hooks/useProjects.ts` - Added provider to queryKey and ?provider= param
- `web/src/hooks/useSessions.ts` - Added provider to queryKey and ?provider= param
- `web/src/hooks/useSessionDetail.ts` - Added provider to queryKey only (session-scoped)
- `web/src/hooks/useChats.ts` - Added provider to queryKey and ?provider= param
- `web/src/hooks/useChatDetail.ts` - Added provider to queryKey only (session-scoped)
- `web/src/hooks/useActivityData.ts` - Added provider to queryKey and ?provider= param
- `web/src/hooks/useBranches.ts` - Added provider to queryKey and ?provider= param
- `web/src/hooks/usePriorSummary.ts` - Added provider to queryKey and ?provider= param
- `web/src/hooks/usePricingMeta.ts` - Added provider to queryKey only (global endpoint)

## Decisions Made
- ProviderId re-declared locally in web/src/lib/providers.ts rather than importing from ../../src/providers/types.ts, because the web tsconfig only includes web/src and there's no existing cross-package import pattern
- ProviderBadge uses inline style with the light theme color for the dot, which provides sufficient contrast on both light and dark backgrounds
- usePricingMeta gets provider in queryKey for consistency but no ?provider= URL param since pricing meta is a global endpoint
- useSessionDetail and useChatDetail get provider in queryKey for cache invalidation but no ?provider= URL param since they operate on specific session/chat IDs which are already provider-scoped

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures in server-side tests (api-provider-filter.test.ts, api.test.ts, api-chats.test.ts) are from Plan 13-01's TDD RED phase. These are failing tests written before the server-side implementation. They are NOT regressions from this plan's frontend changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Provider store, helpers, and badge ready for Plan 03 (Provider Tab Bar) and Plan 04 (Provider Breakdown Charts)
- All hooks will automatically refetch when provider tab changes due to provider in queryKey
- Server-side ?provider= filtering (Plan 13-01) is the prerequisite for the params to have effect

## Self-Check: PASSED

- All 3 created files exist on disk
- Both task commits verified (9e29f6d, 8e1dda8)
- All 14 hooks contain useProviderStore import
- TypeScript compiles clean (zero errors)

---
*Phase: 13-multi-provider-api-dashboard*
*Completed: 2026-03-10*
