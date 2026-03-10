# Phase 13: Multi-Provider API & Dashboard - Research

**Researched:** 2026-03-09
**Domain:** Multi-provider UI/UX, API filtering, cross-provider analytics, Zustand state management, Recharts stacked charts
**Confidence:** HIGH

## Summary

Phase 13 transforms yclaude from a single-provider Claude Code dashboard into a multi-provider analytics platform. The work divides into four distinct areas: (1) a Zustand-based provider store with sidebar tab navigation, (2) cross-cutting API endpoint filtering via `?provider=` query parameter on all 12 endpoints, (3) new cross-provider overview UI with stacked area charts, provider breakdown cards, and unified heatmap, and (4) provider-aware personality copy and cost source display.

The existing codebase is well-structured for this change. Every `UnifiedEvent` already carries a `.provider` field (`ProviderId`), the `AppState.providers` array already contains `ProviderInfo[]` for tab rendering, and the Zustand store pattern (`useDateRangeStore`) provides a proven template for `useProviderStore`. The API layer (`api.ts`) has a consistent pattern where every endpoint starts with date filtering -- provider filtering slots in at the same location. Recharts v3.7.0 (already installed) supports stacked area charts via `stackId` on `<Area>` components.

The main implementation risk is the breadth of change: all 14 hooks, all 12 API endpoints, the Layout component, the Overview page, the Sessions/Chats pages, and three component extensions (ActivityHeatmap, CostBarChart, CostInfoTooltip) all need modification. However, each change is mechanical and follows established patterns. One notable gap: the Cursor `sessionType` ('composer'|'edit') field exists on the internal `ParsedSession` type but is NOT propagated to `UnifiedEvent` -- adding it requires a small type extension.

**Primary recommendation:** Implement as a layer-by-layer build: (1) provider store + config API extension, (2) API ?provider= filtering middleware, (3) hook updates to pass provider, (4) sidebar tabs + navigation, (5) cross-provider overview page with stacked charts, (6) provider badges on lists, (7) personality copy + cost source display.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Sidebar tabs at top of sidebar: [All] [Claude] [Cursor] -- below the "yclaude" header, above nav items
- Tabs only appear when 2+ providers are loaded; single-provider = same as v1.1 (no tabs, no visual change)
- Claude is the default selected tab when multiple providers are present
- Switching provider stays on the current page (Sessions stays on Sessions), date range preserved
- Tab labels are name only -- no counts or costs inline
- Provider selection managed via Zustand store (useProviderStore), same pattern as useDateRangeStore
- All hooks pass provider to API calls as ?provider= query param
- Pages not supported by a provider (e.g., Projects for Cursor) show as disabled/grayed-out in nav -- not hidden
- "All Providers" overview shows merged totals at top, then per-provider breakdown cards below
- Provider breakdown cards: flat numbers -- provider name, total cost, session count, cost source label. No sparklines
- Provider cards are clickable -- clicking a provider card switches to that provider's tab
- All-view shows only universal metrics (cost, sessions, tokens, models, heatmap). Provider-specific stats (cache efficiency, subagent split, agent mode) only in that provider's tab
- Stacked area chart for cost-over-time in All-view (one color per provider). Single-color chart in per-provider views
- Single merged activity heatmap in All-view, with per-provider breakdown in day tooltip on hover
- Session type filter (All / Composer / Edit) added alongside provider filter on Sessions page (Phase 12 deferred item)
- Unified chronological session list in All-view with provider badge per session row
- Provider filter dropdown on Sessions page alongside existing Branch filter
- Chats page follows same pattern: mixed list with provider badges, filtered by sidebar provider selection
- Combined models table with provider column and badge per model row in All-view
- Cross-provider total shown normally with footnote breakdown: per-provider cost + methodology label (API-estimated, provider-reported)
- Subtle inline cost source badges in tables/lists: "est." for estimated, "rep." for reported
- CostInfoTooltip expanded to be provider-aware -- explains mixed sources in All-view, single methodology in per-provider view
- Cursor $0.00 cost included in totals with tooltip note: "Cost data unavailable in recent Cursor versions"
- Same yclaude voice/tone with provider-specific references in copy
- Claude jokes reference Claude behaviors; Cursor jokes reference tab completions/ghost text; All-view jokes reference "AI friends"
- Personality copy appears on Overview stat callouts and empty states per provider -- other pages keep generic copy
- Distinct provider colors: Claude = purple (#7c3aed), Cursor = green (#22c55e), OpenCode = orange (#f59e0b), All = blue (#3b82f6)
- Colored dots (not logos) + text names for provider identification everywhere
- All existing endpoints accept optional ?provider= query param (backward compatible)
- /api/v1/config response extended with loaded providers list for frontend tab rendering

### Claude's Discretion
- Exact Zustand store implementation details
- API route filter implementation (middleware vs per-route)
- Stacked area chart Recharts configuration
- Provider color dark mode variants
- Exact personality copy text
- Session type filter implementation approach
- Provider card layout/sizing details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROV-03 | User can switch between provider-specific dashboard views via tab navigation | Zustand useProviderStore pattern, Layout.tsx sidebar modification, config API extension with providers list |
| PROV-04 | User can filter all API endpoints by provider via ?provider= query parameter | Cross-cutting filter in api.ts using UnifiedEvent.provider field, backward compatible (no param = all) |
| PROV-05 | User sees provider-specific personality copy throughout the dashboard | quips.ts extension with provider-keyed copy, provider-aware pickQuip helper |
| CROSS-01 | User can view cross-provider overview showing total spend with per-provider breakdown cards | Overview page conditional rendering based on provider store, StatCard reuse with provider color accent |
| CROSS-02 | User can compare model usage across providers | Models endpoint extended with provider column, Models page table with provider badge in All-view |
| CROSS-03 | User can view unified activity heatmap showing all AI coding activity across providers | Activity endpoint provider-aware, ActivityHeatmap tooltip extended with per-provider session breakdown |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.11 | Provider filter state (useProviderStore) | Already used for date range + theme; proven pattern in codebase |
| recharts | ^3.7.0 | Stacked area chart for cost-over-time All-view | Already installed, used for CostBarChart and Models donut |
| react-activity-calendar | ^3.1.1 | Unified heatmap with per-provider tooltip | Already used in ActivityHeatmap component |
| @tanstack/react-query | ^5.90.21 | Provider-filtered data fetching | Already used in all 14 hooks |
| hono | ^4.12.3 | API route ?provider= filtering | Already used for all API routes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss | ^4.2.1 | Provider color classes, dot badges | Already configured, used everywhere |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand for provider state | URL query params | Would break hash router pattern, more complex than needed |
| Middleware for ?provider= filter | Per-route filter | Middleware is DRY but all endpoints share the same pattern -- helper function is simpler and more explicit |

**Installation:**
No new dependencies required. All libraries are already installed.

## Architecture Patterns

### Recommended Changes Structure
```
src/
  providers/
    types.ts              # Add sessionType? field to UnifiedEvent
  server/
    routes/
      api.ts              # Add ?provider= filter to all 12 endpoints, extend /config
    __tests__/
      api-provider-filter.test.ts  # New test file for provider filtering
web/src/
  store/
    useProviderStore.ts   # NEW: Zustand provider selection store
  hooks/
    *.ts                  # All 14 hooks: add provider param to queryKey + URL
  components/
    Layout.tsx            # Add provider tabs above nav
    ProviderTabs.tsx      # NEW: Tab component for provider switching
    ProviderBadge.tsx     # NEW: Colored dot + name badge
    ProviderCard.tsx      # NEW: Clickable breakdown card for All-view
    CostAreaChart.tsx     # NEW: Stacked area chart variant (or extend CostBarChart)
    CostBarChart.tsx      # Extend for stacked area mode
    ActivityHeatmap.tsx   # Extend tooltip for per-provider breakdown
    CostInfoTooltip.tsx   # Make provider-aware (mixed vs single methodology)
    StatCard.tsx          # Add optional color accent prop for provider cards
    SortableTable.tsx     # No changes needed (provider column added at page level)
  pages/
    Overview.tsx          # Conditional: All-view (provider cards, stacked chart) vs per-provider view
    Sessions.tsx          # Add provider badge column, session type filter dropdown
    Chats.tsx             # Add provider badge, filtered by sidebar provider
    Models.tsx            # Add provider column in All-view
  lib/
    quips.ts              # Provider-keyed quip categories
    providers.ts          # NEW: Provider color map, display name map, helper functions
```

### Pattern 1: Provider Store (Zustand)
**What:** Global store managing selected provider, mirroring useDateRangeStore pattern
**When to use:** Every component that needs to know which provider is selected
**Example:**
```typescript
// Source: Pattern from web/src/store/useDateRangeStore.ts
import { create } from 'zustand';
import type { ProviderId } from '../../src/providers/types';

type ProviderFilter = ProviderId | 'all';

interface ProviderState {
  provider: ProviderFilter;
  providers: Array<{ id: ProviderId; name: string }>; // from /config
  setProvider: (p: ProviderFilter) => void;
  setProviders: (list: Array<{ id: ProviderId; name: string }>) => void;
}

export const useProviderStore = create<ProviderState>((set) => ({
  provider: 'claude', // default when multi-provider
  providers: [],
  setProvider: (provider) => set({ provider }),
  setProviders: (providers) => set({ providers }),
}));
```

### Pattern 2: Hook Provider Parameter
**What:** Every hook reads provider from store and passes to API
**When to use:** All 14 hooks in web/src/hooks/
**Example:**
```typescript
// Source: Pattern from web/src/hooks/useSummary.ts extended
export function useSummary() {
  const { from, to } = useDateRangeStore();
  const { provider } = useProviderStore();
  const params = new URLSearchParams();
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());
  if (provider !== 'all') params.set('provider', provider);

  return useQuery<SummaryData>({
    queryKey: ['summary', from?.toISOString(), to?.toISOString(), provider],
    queryFn: async () => {
      const res = await fetch(`/api/v1/summary?${params}`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json() as Promise<SummaryData>;
    },
  });
}
```

### Pattern 3: API Provider Filtering (Helper Function)
**What:** Shared helper to filter events by provider query param
**When to use:** At the start of every API endpoint handler
**Example:**
```typescript
// Source: Pattern from api.ts date filtering, extended for provider
function filterByProvider(events: UnifiedEvent[], providerParam: string | undefined): UnifiedEvent[] {
  if (!providerParam) return events; // no filter = all providers (backward compatible)
  return events.filter((e) => e.provider === providerParam);
}

// Usage in each endpoint:
app.get('/summary', (c) => {
  const providerParam = c.req.query('provider');
  let events = filterByProvider(state.events, providerParam);
  // ... existing date filtering continues
});
```

### Pattern 4: Stacked Area Chart (Recharts)
**What:** AreaChart with multiple Area components sharing a stackId
**When to use:** Cost-over-time in All-view
**Example:**
```typescript
// Source: Recharts official docs (recharts.github.io/en-US/examples/StackedAreaChart/)
<AreaChart data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} />
  <Tooltip />
  <Area type="monotone" dataKey="claude" stackId="1" fill="#7c3aed" stroke="#7c3aed" />
  <Area type="monotone" dataKey="cursor" stackId="1" fill="#22c55e" stroke="#22c55e" />
</AreaChart>
```
**Data shape needed:** `{ date: string; claude: number; cursor: number }[]` -- one key per provider

### Pattern 5: Provider Color System
**What:** Centralized provider color map for consistent use across badges, charts, cards
**When to use:** Every visual element that is provider-specific
**Example:**
```typescript
// NEW: web/src/lib/providers.ts
import type { ProviderId } from '../../src/providers/types';

export const PROVIDER_COLORS: Record<ProviderId | 'all', { light: string; dark: string }> = {
  claude: { light: '#7c3aed', dark: '#a78bfa' },
  cursor: { light: '#22c55e', dark: '#4ade80' },
  opencode: { light: '#f59e0b', dark: '#fbbf24' },
  all: { light: '#3b82f6', dark: '#60a5fa' },
};

export const PROVIDER_NAMES: Record<ProviderId, string> = {
  claude: 'Claude Code',
  cursor: 'Cursor',
  opencode: 'OpenCode',
};
```

### Anti-Patterns to Avoid
- **Mutating state.events:** Never filter-in-place. Always create new arrays with `.filter()`. Already enforced in codebase.
- **URL-based provider state:** Don't encode provider in URL path or query -- use Zustand store like date range. Hash router doesn't support this well.
- **Separate API endpoints per provider:** Don't create /api/v1/claude/summary, /api/v1/cursor/summary etc. Use the single ?provider= pattern for backward compatibility.
- **Frontend-side event filtering:** Don't send all events to frontend and filter there. Server-side filtering is the established pattern (frontend never receives raw events).
- **Conditional route mounting:** Don't dynamically add/remove routes based on provider. Keep all routes, disable nav items visually.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Provider state management | Custom context + reducer | Zustand create() | Pattern already proven with useDateRangeStore, zero boilerplate |
| Stacked area chart | Custom SVG rendering | Recharts AreaChart + stackId | Already installed (v3.7.0), handles responsiveness, tooltips, animations |
| Activity heatmap | Custom calendar grid | react-activity-calendar | Already used, just need to extend tooltip |
| Color dark mode variants | Manual theme-switch logic | CSS variables or Tailwind dark: prefix | Tailwind dark mode already configured in project |
| Provider tab components | Custom tab implementation | Simple button group with Tailwind | Simpler than any UI library, matches existing project aesthetic |

**Key insight:** This phase is primarily about wiring existing components and patterns together, not building new infrastructure. The provider abstraction (UnifiedEvent, ProviderInfo) was already built in Phase 11.

## Common Pitfalls

### Pitfall 1: TanStack Query Key Inconsistency
**What goes wrong:** Provider filter changes but cached data doesn't update because queryKey doesn't include provider
**Why it happens:** Forgetting to add `provider` to the queryKey array in one of the 14 hooks
**How to avoid:** Every hook's queryKey MUST include the provider value. Grep for queryKey after implementation to verify all 14.
**Warning signs:** Switching tabs doesn't change data; data appears stale after tab switch

### Pitfall 2: Backward Compatibility Break
**What goes wrong:** Existing users with no provider param get empty or error responses
**Why it happens:** Filter function that treats missing ?provider= as "no provider" instead of "all providers"
**How to avoid:** `if (!providerParam) return events;` -- absence of param means return ALL. Test explicitly.
**Warning signs:** Empty responses on /api/v1/summary without ?provider= param

### Pitfall 3: Single-Provider Users See Tabs
**What goes wrong:** Users with only Claude Code installed see provider tabs (confusing, cluttered)
**Why it happens:** Tab rendering not gated on `providers.length >= 2`
**How to avoid:** Strict check: `if (providers.filter(p => p.status === 'loaded').length < 2) return null;` in ProviderTabs
**Warning signs:** Single-provider setup shows [All] [Claude] tabs

### Pitfall 4: Stacked Chart Data Shape Mismatch
**What goes wrong:** Stacked area chart shows nothing or wrong values
**Why it happens:** API returns `{ date, cost }` but stacked chart needs `{ date, claude, cursor }` with per-provider columns
**How to avoid:** API cost-over-time endpoint needs to return per-provider breakdown when in All-view, OR frontend transforms the data
**Warning signs:** Empty chart or overlapping (not stacked) areas

### Pitfall 5: Activity Heatmap Provider Breakdown
**What goes wrong:** Heatmap tooltip shows total count but no per-provider breakdown
**Why it happens:** Activity endpoint currently returns `{ date, count, level }` with no provider breakdown
**How to avoid:** API /activity endpoint needs to include per-provider counts in each day entry when no ?provider= filter
**Warning signs:** "5 sessions" tooltip without "(3 Claude, 2 Cursor)" breakdown

### Pitfall 6: sessionType Not on UnifiedEvent
**What goes wrong:** Session type filter (Composer/Edit) can't work because the field isn't available
**Why it happens:** `sessionType` exists only on Cursor's internal `ParsedSession` type, never propagated to `UnifiedEvent`
**How to avoid:** Add optional `sessionType?: string` to UnifiedEvent, propagate in cursor parser
**Warning signs:** Filter dropdown has no effect or always shows "All"

### Pitfall 7: Cost Source Display in Mixed View
**What goes wrong:** "est." badge shown for Cursor sessions where cost is "reported", or vice versa
**Why it happens:** Hardcoded "est." suffix in cost display without checking event's costSource
**How to avoid:** Use `event.costSource` to determine badge text: 'estimated' -> 'est.', 'reported' -> 'rep.'
**Warning signs:** Incorrect cost methodology labels in tables

## Code Examples

### Config API Extension
```typescript
// Source: src/server/routes/api.ts -- extend /config endpoint
app.get('/config', (c) => {
  return c.json({
    showMessages: state.showMessages ?? false,
    providers: state.providers
      .filter((p) => p.status === 'loaded')
      .map((p) => ({ id: p.id, name: p.name, eventCount: p.eventCount })),
  });
});
```

### Provider Filter Helper
```typescript
// Source: Pattern from api.ts date filtering
function filterByProvider(events: UnifiedEvent[], providerParam: string | undefined): UnifiedEvent[] {
  if (!providerParam) return events;
  return events.filter((e) => e.provider === providerParam);
}
```

### Cost-Over-Time Stacked Data
```typescript
// For All-view, cost-over-time needs per-provider columns
// API response shape change:
// When ?provider= is absent (All-view):
//   { data: [{ date: "2024-01-01", cost: 0.05, claude: 0.03, cursor: 0.02 }], bucket: "day" }
// When ?provider=claude:
//   { data: [{ date: "2024-01-01", cost: 0.03 }], bucket: "day" }
```

### Provider Badge Component
```typescript
// NEW: web/src/components/ProviderBadge.tsx
import { PROVIDER_COLORS, PROVIDER_NAMES } from '../lib/providers';
import type { ProviderId } from '../../src/providers/types';

export function ProviderBadge({ provider }: { provider: ProviderId }) {
  const color = PROVIDER_COLORS[provider];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: color.light }}
      />
      <span className="text-slate-500 dark:text-[#8b949e]">
        {PROVIDER_NAMES[provider]}
      </span>
    </span>
  );
}
```

### Sidebar Provider Tabs
```typescript
// Source: Layout.tsx sidebar pattern, extended
function ProviderTabs() {
  const { provider, setProvider, providers } = useProviderStore();
  // Only show tabs when 2+ providers loaded
  if (providers.length < 2) return null;

  const tabs = [
    { id: 'all' as const, label: 'All' },
    ...providers.map((p) => ({ id: p.id, label: p.name })),
  ];

  return (
    <div className="px-3 py-2 border-b border-slate-200 dark:border-[#30363d] flex gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setProvider(tab.id)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            provider === tab.id
              ? 'bg-slate-100 text-slate-900 dark:bg-[#21262d] dark:text-[#e6edf3]'
              : 'text-slate-500 hover:text-slate-700 dark:text-[#8b949e] dark:hover:text-[#e6edf3]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

### SessionType on UnifiedEvent
```typescript
// Source: src/providers/types.ts -- add to UnifiedEvent
// Add alongside existing Cursor-specific optionals:
sessionType?: 'composer' | 'edit'; // Cursor-specific (Phase 13 addition)
```

### Activity Endpoint Provider Breakdown
```typescript
// Extend activity response for All-view:
// { date: "2024-01-05", count: 5, level: 3, providers: { claude: 3, cursor: 2 } }
// The providers field only included when no ?provider= filter
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-provider state | UnifiedEvent with .provider field | Phase 11 (v1.2) | All events tagged -- filtering is trivial |
| No provider concept in UI | Provider-unaware hooks and pages | Current (v1.1) | All 14 hooks + 8 pages need provider awareness |
| Single bar chart | Bar chart (per-provider) + stacked area (All-view) | Phase 13 | Recharts AreaChart + stackId, same library |
| Hardcoded "est." cost labels | Dynamic cost source badges from event.costSource | Phase 13 | CostSource already on every UnifiedEvent |

**Deprecated/outdated:**
- Nothing deprecated. All existing patterns (Zustand, TanStack Query, Recharts, Hono) are current and appropriate.

## Open Questions

1. **Cost-over-time API shape for stacked chart**
   - What we know: Stacked area chart needs `{ date, claude: number, cursor: number }` shape
   - What's unclear: Whether to transform in API (add per-provider columns) or transform in frontend from separate per-provider queries
   - Recommendation: Transform in API -- return per-provider columns alongside total `cost` when no ?provider= filter. This is consistent with server-side aggregation pattern and avoids multiple API calls.

2. **Activity endpoint provider breakdown for tooltip**
   - What we know: Heatmap tooltip needs "3 Claude, 2 Cursor" per day
   - What's unclear: Whether to add `providers` field to activity response or make frontend query per-provider activity separately
   - Recommendation: Add `providers` object to each activity day in API response when no ?provider= filter. Single query, consistent with server-side pattern.

3. **Session type filter scope**
   - What we know: Session type (composer/edit) is Cursor-specific. Claude Code sessions don't have this concept.
   - What's unclear: How to handle filtering when in All-view (Claude sessions have no sessionType)
   - Recommendation: Session type filter only visible when Cursor or All-view is selected. In All-view with sessionType filter active, show only Cursor sessions matching that type plus all Claude sessions (they pass through since they don't have a type to exclude). OR: treat Claude sessions as "composer" equivalent for filtering purposes.

4. **Provider dark mode color variants**
   - What we know: Provider colors defined (Claude=#7c3aed purple, Cursor=#22c55e green, etc.)
   - What's unclear: Best dark mode variants for readability
   - Recommendation: Lighter variants in dark mode: Claude=#a78bfa, Cursor=#4ade80, OpenCode=#fbbf24, All=#60a5fa (one step lighter on the Tailwind scale)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/server/__tests__/api.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROV-03 | Provider tab rendering based on config providers | unit | `npx vitest run src/server/__tests__/api.test.ts -t "config"` | Partial (config test exists, provider list not) |
| PROV-04 | ?provider= filter on all endpoints | unit | `npx vitest run src/server/__tests__/api-provider-filter.test.ts` | No -- Wave 0 |
| PROV-05 | Provider-specific personality copy | manual-only | Manual: visual check of quip text per provider tab | N/A |
| CROSS-01 | Cross-provider overview totals + breakdown | unit | `npx vitest run src/server/__tests__/api.test.ts -t "summary"` | Partial (summary test exists, per-provider breakdown not) |
| CROSS-02 | Models with provider column in All-view | unit | `npx vitest run src/server/__tests__/api.test.ts -t "models"` | Partial (models test exists, provider column not) |
| CROSS-03 | Unified activity heatmap with per-provider breakdown | unit | `npx vitest run src/server/__tests__/api.test.ts -t "activity"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/server/__tests__/api-provider-filter.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/server/__tests__/api-provider-filter.test.ts` -- covers PROV-04 (provider filtering on all endpoints)
- [ ] Extend `src/server/__tests__/api.test.ts` -- add ?provider= test cases for summary, models, activity endpoints (CROSS-01, CROSS-02, CROSS-03)
- [ ] No frontend test infrastructure exists (no vitest in web/) -- all frontend changes require manual verification

*(Frontend testing note: The project has no frontend test infrastructure. All React component changes are verified manually. This is an existing project-wide gap, not Phase 13 specific.)*

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection: `src/server/routes/api.ts` (all 12 endpoints), `src/providers/types.ts` (UnifiedEvent with .provider field), `src/server/server.ts` (AppState.providers), `web/src/store/useDateRangeStore.ts` (Zustand pattern), `web/src/components/` (all existing components), `web/src/hooks/` (all 14 hooks)
- Recharts stacked area chart: [recharts.github.io/en-US/examples/StackedAreaChart](https://recharts.github.io/en-US/examples/StackedAreaChart/) -- uses `stackId` prop on `<Area>` components
- package.json: Confirmed recharts ^3.7.0, zustand ^5.0.11, @tanstack/react-query ^5.90.21 already installed

### Secondary (MEDIUM confidence)
- [GeeksforGeeks Recharts stacked area](https://www.geeksforgeeks.org/reactjs/create-a-stacked-area-chart-using-recharts-in-reactjs/) -- Confirmed stackId pattern and data shape requirements
- Recharts API docs: [recharts.github.io/en-US/api](https://recharts.github.io/en-US/api/)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in project, no new dependencies
- Architecture: HIGH -- all patterns are direct extensions of existing codebase patterns (Zustand stores, TanStack Query hooks, Hono routes)
- Pitfalls: HIGH -- identified through direct code inspection of the 12 API endpoints, 14 hooks, and component architecture
- API data shape for stacked chart: MEDIUM -- recommended approach (server-side per-provider columns) is sound but implementation details need validation

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no external dependency changes expected)
