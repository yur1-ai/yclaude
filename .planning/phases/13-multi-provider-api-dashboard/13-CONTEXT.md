# Phase 13: Multi-Provider API & Dashboard - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Provider-tabbed navigation in the sidebar, API filtering by provider via ?provider= query parameter, cross-provider analytics overview with per-provider breakdown cards, unified activity heatmap, and model comparison across providers. Session type filter (composer vs edit) included per Phase 12 deferred item.

Requirements: PROV-03, PROV-04, PROV-05, CROSS-01, CROSS-02, CROSS-03

</domain>

<decisions>
## Implementation Decisions

### Provider Navigation
- Sidebar tabs at top of sidebar: [All] [Claude] [Cursor] — below the "yclaude" header, above nav items
- Tabs only appear when 2+ providers are loaded; single-provider = same as v1.1 (no tabs, no visual change)
- Claude is the default selected tab when multiple providers are present
- Switching provider stays on the current page (Sessions stays on Sessions), date range preserved
- Tab labels are name only — no counts or costs inline
- Provider selection managed via Zustand store (useProviderStore), same pattern as useDateRangeStore
- All hooks pass provider to API calls as ?provider= query param
- Pages not supported by a provider (e.g., Projects for Cursor) show as disabled/grayed-out in nav — not hidden

### Cross-Provider Overview
- "All Providers" overview shows merged totals at top (total cost, sessions, tokens), then per-provider breakdown cards below
- Provider breakdown cards: flat numbers — provider name, total cost, session count, cost source label. No sparklines
- Provider cards are clickable — clicking a provider card switches to that provider's tab
- All-view shows only universal metrics (cost, sessions, tokens, models, heatmap). Provider-specific stats (cache efficiency, subagent split, agent mode) only in that provider's tab
- Stacked area chart for cost-over-time in All-view (one color per provider). Single-color chart in per-provider views
- Single merged activity heatmap in All-view, with per-provider breakdown in day tooltip on hover
- Session type filter (All / Composer / Edit) added alongside provider filter on Sessions page (Phase 12 deferred item)

### Session & Chat Lists
- Unified chronological session list in All-view with provider badge per session row
- Provider filter dropdown on Sessions page alongside existing Branch filter
- Chats page follows same pattern: mixed list with provider badges, filtered by sidebar provider selection
- Combined models table with provider column and badge per model row in All-view

### Cost Source Display
- Cross-provider total shown normally with footnote breakdown: per-provider cost + methodology label (API-estimated, provider-reported)
- Subtle inline cost source badges in tables/lists: "est." for estimated, "rep." for reported
- CostInfoTooltip expanded to be provider-aware — explains mixed sources in All-view, single methodology in per-provider view
- Cursor $0.00 cost included in totals with tooltip note: "Cost data unavailable in recent Cursor versions"

### Provider Personality
- Same yclaude voice/tone, just with provider-specific references in copy
- Claude jokes reference Claude behaviors; Cursor jokes reference tab completions/ghost text; All-view jokes reference "AI friends"
- Personality copy appears on Overview stat callouts and empty states per provider — other pages keep generic copy
- Distinct provider colors used consistently: Claude = purple (#7c3aed), Cursor = green (#22c55e), OpenCode = orange (#f59e0b), All = blue (#3b82f6)
- Colored dots (not logos) + text names for provider identification everywhere (tabs, badges, chart segments, cards)

### API Changes
- All existing endpoints accept optional ?provider= query param (backward compatible — no param returns all data)
- /api/v1/config response extended with loaded providers list for frontend tab rendering

### Claude's Discretion
- Exact Zustand store implementation details
- API route filter implementation (middleware vs per-route)
- Stacked area chart Recharts configuration
- Provider color dark mode variants
- Exact personality copy text
- Session type filter implementation approach
- Provider card layout/sizing details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `web/src/components/Layout.tsx`: Sidebar with navItems array — extend with provider tabs above nav
- `web/src/store/useDateRangeStore.ts`: Zustand store pattern to replicate for useProviderStore
- `web/src/components/StatCard.tsx`: Reuse for provider breakdown cards
- `web/src/components/ActivityHeatmap.tsx`: Extend tooltip to show per-provider breakdown
- `web/src/components/CostBarChart.tsx`: Extend to stacked area chart variant for All-view
- `web/src/components/CostInfoTooltip.tsx`: Expand to handle multi-provider cost methodology
- `web/src/components/SortableTable.tsx`: Add provider column for Models and Sessions tables
- All 16 hooks in `web/src/hooks/`: Each needs provider param in API query key + URL

### Established Patterns
- Zustand for global filters (date range, theme) — provider follows same pattern
- TanStack Query with staleTime: 5min, retry: 1, no refetchOnWindowFocus
- Hash routing via createHashRouter — no changes needed for provider selection
- All aggregation server-side — provider filtering happens in api.ts before aggregation
- `state.events: UnifiedEvent[]` has `.provider` field on every event — filtering is trivial

### Integration Points
- `src/server/routes/api.ts`: All 12 endpoints need ?provider= filter (cross-cutting)
- `web/src/App.tsx`: No route changes needed — provider is Zustand state, not URL
- `src/server/server.ts`: AppState.providers already has ProviderInfo[] for tab rendering
- `src/providers/types.ts`: ProviderId type already exists for type-safe provider filtering

</code_context>

<specifics>
## Specific Ideas

- Single-provider users (Claude only) should see zero UI changes from v1.1 — tabs only appear with 2+ providers
- Provider cards on All-view should feel like the existing StatCard component but with provider color accent
- Stacked area chart should use provider colors as the fill colors
- Session type filter is explicitly included because user flagged it as high priority in Phase 12 discussion
- "AI friends" personality for All-view total: "You spent $142 across all your AI friends. They're expensive friends."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-multi-provider-api-dashboard*
*Context gathered: 2026-03-09*
