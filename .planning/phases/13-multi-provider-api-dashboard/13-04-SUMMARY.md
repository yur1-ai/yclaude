---
phase: 13-multi-provider-api-dashboard
plan: 04
subsystem: ui
tags: [react, recharts, provider-overview, stacked-area-chart, heatmap, quips]

# Dependency graph
requires:
  - phase: 13-multi-provider-api-dashboard
    plan: 01
    provides: "API providerBreakdown on /summary, per-provider columns on cost-over-time/activity"
  - phase: 13-multi-provider-api-dashboard
    plan: 02
    provides: "useProviderStore, PROVIDER_COLORS, PROVIDER_NAMES, ProviderBadge, provider-aware hooks"
provides:
  - "ProviderCard component with clickable provider breakdown display"
  - "CostAreaChart stacked area chart for multi-provider cost-over-time"
  - "Provider-aware Overview page with conditional All-view vs per-provider rendering"
  - "ActivityHeatmap with per-provider session breakdown in tooltip"
  - "CostInfoTooltip with mixed/single cost source explanation"
  - "Provider-keyed personality copy (PROVIDER_QUIPS) with pickProviderQuip helper"
  - "StatCard accentColor prop for provider-colored left border"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["Conditional All-view vs per-provider rendering in Overview", "Provider-keyed quips system", "Extended Activity type with providers field for tooltip breakdown"]

key-files:
  created:
    - web/src/components/ProviderCard.tsx
    - web/src/components/CostAreaChart.tsx
  modified:
    - web/src/pages/Overview.tsx
    - web/src/components/ActivityHeatmap.tsx
    - web/src/components/CostInfoTooltip.tsx
    - web/src/components/StatCard.tsx
    - web/src/lib/quips.ts

key-decisions:
  - "Overview casts SummaryData to extended type with providerBreakdown rather than modifying the shared SummaryData interface (avoids breaking useSummary consumers)"
  - "CostAreaChart extracts provider IDs dynamically from first data row keys (future-proof for new providers)"
  - "ActivityHeatmap casts Activity to ActivityWithProviders for extended providers field (react-activity-calendar type is fixed)"
  - "CostInfoTooltip pricing date only shown for Claude provider (other providers lack pricing-meta context)"
  - "Cache efficiency and subagent share conditionally shown based on Claude data presence, not just provider filter"

patterns-established:
  - "Conditional chart rendering: CostAreaChart for All-view, CostBarChart for per-provider"
  - "Provider-keyed personality copy via PROVIDER_QUIPS with pickProviderQuip fallback to generic QUIPS"
  - "Extended tooltip data via type assertion (ActivityWithProviders) for library components with fixed types"

requirements-completed: [CROSS-01, CROSS-03, PROV-05]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 13 Plan 04: Cross-Provider Overview Summary

**Cross-provider Overview with clickable ProviderCards, stacked CostAreaChart, per-provider heatmap tooltips, provider-aware CostInfoTooltip, and provider-keyed personality copy**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T03:45:36Z
- **Completed:** 2026-03-10T03:49:45Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Overview page conditionally renders All-view (provider breakdown cards + stacked area chart) vs per-provider view (single bar chart)
- ProviderCard shows cost, sessions, cost source with provider-colored accent border; clicking switches to that provider's tab
- CostAreaChart renders stacked areas with per-provider colors, custom tooltip with breakdown and total
- ActivityHeatmap tooltip shows per-provider session counts in All-view (e.g., "Claude Code: 3, Cursor: 2")
- CostInfoTooltip adapts text: mixed methodology explanation for All-view, provider-specific for single provider
- PROVIDER_QUIPS with Claude, Cursor, OpenCode, and All-view personality copy following dry/deadpan register
- StatCard supports optional accentColor for provider-colored left border
- Cache efficiency and subagent share only shown when Claude data is present

## Task Commits

Each task was committed atomically:

1. **Task 1: ProviderCard + CostAreaChart + StatCard accent + quips extension** - `18cf732` (feat)
2. **Task 2: Overview page rework + ActivityHeatmap extension + CostInfoTooltip provider-awareness** - `51557ab` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `web/src/components/ProviderCard.tsx` - Clickable provider breakdown card with colored border accent, cost, sessions, cost source (new)
- `web/src/components/CostAreaChart.tsx` - Stacked area chart for multi-provider cost-over-time with custom tooltip (new)
- `web/src/pages/Overview.tsx` - Conditional All-view vs per-provider rendering with provider cards, chart switching, personality copy
- `web/src/components/ActivityHeatmap.tsx` - Extended tooltip to show per-provider session breakdown in All-view
- `web/src/components/CostInfoTooltip.tsx` - Provider-aware tooltip text (mixed sources for All-view, specific for single provider)
- `web/src/components/StatCard.tsx` - Added accentColor prop for provider-colored left border
- `web/src/lib/quips.ts` - Added PROVIDER_QUIPS, pickProviderQuip helper, extended pickSpendQuip with optional provider param

## Decisions Made
- Overview casts SummaryData to SummaryWithBreakdown rather than modifying the shared interface, to avoid breaking other useSummary consumers
- CostAreaChart dynamically extracts provider IDs from the first data row's keys, making it future-proof for new providers
- ActivityHeatmap uses type assertion (ActivityWithProviders) since react-activity-calendar's Activity type is fixed
- CostInfoTooltip only shows pricing verification date for Claude (other providers lack that context)
- Cache efficiency and subagent share visibility based on Claude data presence, not just the active provider filter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - plan executed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Cross-provider Overview is complete -- users see unified picture across all providers
- All Phase 13 UI components are in place (Plan 02 tabs, Plan 03 sessions/models/chats, Plan 04 overview)
- Phase 13 may be fully complete pending Plan 03 execution

## Self-Check: PASSED

All files exist, both task commits verified (18cf732, 51557ab). 268/268 tests pass. Zero TypeScript errors. Build succeeds.

---
*Phase: 13-multi-provider-api-dashboard*
*Completed: 2026-03-10*
