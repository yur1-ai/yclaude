# Architecture Patterns: Dashboard Features Integration

**Domain:** npm-distributed local-first analytics dashboard (CLI + embedded SPA)
**Researched:** 2026-02-28
**Scope:** Phases 4-8 — data aggregation, charting, session views, global state, dark mode
**Overall Confidence:** HIGH (existing code read directly; patterns verified against official docs)

---

## Current Architecture Baseline (Phases 1-3, Verified)

The Phase 1-3 implementation establishes these facts:

```
src/
  parser/
    types.ts          — NormalizedEvent type (uuid, type, timestamp, sessionId,
                        tokens{input,output,cacheCreation,cacheRead,cacheCreation5m,
                        cacheCreation1h}, model, isSidechain, agentId, gitBranch, cwd)
    reader.ts         — discoverJSONLFiles(), streamJSONLFile()
    normalizer.ts     — normalizeEvent()
    dedup.ts          — DedupAccumulator (first-seen-wins by UUID)
  cost/
    types.ts          — EstimatedCost branded type, CostEvent = NormalizedEvent + costUsd
    engine.ts         — computeCosts(NormalizedEvent[]) -> CostEvent[]
    pricing.ts        — MODEL_PRICING static lookup table
    privacy.ts        — applyPrivacyFilter() strips conversation content
  server/
    server.ts         — createApp(AppState) factory; AppState = {events, costs}
    routes/api.ts     — /api/v1/summary (implemented), /events and /sessions (stubs)
    cli.ts            — Commander CLI; loads data pipeline, calls createApp(), serve()
  index.ts            — parseAll() public API, re-exports

web/src/
  App.tsx             — createHashRouter with 4 routes: /, /models, /projects, /sessions
  components/
    Layout.tsx        — left sidebar + <Outlet /> pattern
  pages/
    Overview.tsx      — placeholder "Coming soon"
    Models.tsx        — placeholder
    Projects.tsx      — placeholder
    Sessions.tsx      — placeholder
  index.css           — @import "tailwindcss" (Tailwind v4 single-line, no config file)
  main.tsx            — StrictMode + createRoot
```

**Key facts from code review:**

- `AppState` is loaded once at CLI startup (parse → filter → cost → createApp). No per-request parsing.
- `/api/v1/summary` already computes totalCost, totalTokens, eventCount from `state.costs`.
- `createHashRouter` is in use (not createBrowserRouter). Hash routing is correct for static file serving.
- Tailwind v4 is configured with just `@import "tailwindcss"` — no `tailwind.config.js`.
- web/package.json has React 19, React Router v7, Tailwind v4, Vite 7. No charting or state management libraries yet.
- root package.json has Hono, Commander, Zod, @hono/node-server. No @hono/zod-validator yet.

---

## Dashboard Integration: The Core Design Question

The fundamental question for Phases 4-8 is where aggregation lives: in the server (pre-compute in `AppState`) or per-request (compute in route handlers from raw `state.costs`).

**Decision: Aggregation layer in `src/aggregation/`, computed at startup, stored in `AppState`.**

Rationale:
- All data is in-memory already (CostEvent[] is loaded at startup).
- Date-range filtering can be done per-request by slicing pre-indexed structures.
- Route handlers stay thin — they filter, sort, and serialize, not aggregate.
- This is consistent with the existing pattern: `computeCosts()` is a pure function over events.

**What `AppState` grows into (across phases 4-8):**

```typescript
// src/server/server.ts
export interface AppState {
  events: NormalizedEvent[];
  costs: CostEvent[];
  // Added in Phase 4:
  timeline: TimelineIndex;    // pre-bucketed daily/weekly/monthly cost maps
  // Added in Phase 5:
  byModel: ModelIndex;        // Map<modelId, CostEvent[]>
  byProject: ProjectIndex;    // Map<projectPath, CostEvent[]>
  // Added in Phase 6:
  sessions: SessionIndex;     // Map<sessionId, SessionSummary>
  // Added in Phase 7:
  heatmap: HeatmapDay[];      // daily activity for the full time range
}
```

These are computed once in `src/cli/index.ts` before calling `createApp()`.

---

## New API Endpoints (Phases 4-8)

All endpoints live under `/api/v1/` in `src/server/routes/api.ts`.

### Phase 4: Cost Analytics Dashboard

| Endpoint | Query Params | Response Shape | Source in AppState |
|----------|--------------|----------------|-------------------|
| `GET /api/v1/summary` | `from?, to?` (ISO dates) | `{totalCost, totalTokens, eventCount, period}` | `state.costs` filtered |
| `GET /api/v1/timeline` | `from?, to?, bucket=day\|week\|month` | `{buckets: [{date, cost, tokens}]}` | `state.timeline` |

The existing `/api/v1/summary` can be extended with `from`/`to` query params rather than replaced.

### Phase 5: Model & Project Breakdowns

| Endpoint | Query Params | Response Shape | Source in AppState |
|----------|--------------|----------------|-------------------|
| `GET /api/v1/models` | `from?, to?` | `{models: [{modelId, label, cost, tokens, eventCount}]}` | `state.byModel` |
| `GET /api/v1/projects` | `from?, to?` | `{projects: [{path, name, cost, tokens, sessionCount}]}` | `state.byProject` |

### Phase 6: Session Explorer

| Endpoint | Query Params | Response Shape | Source in AppState |
|----------|--------------|----------------|-------------------|
| `GET /api/v1/sessions` | `from?, to?, project?, sort=cost\|date, order=asc\|desc` | `{sessions: [{sessionId, project, model, cost, startTime, durationMs, turnCount}]}` | `state.sessions` |
| `GET /api/v1/sessions/:id` | — | `{sessionId, project, model, totalCost, turns: [{timestamp, model, tokens, cost}]}` | `state.sessions` |

### Phase 7: Differentiator Features

| Endpoint | Query Params | Response Shape | Source in AppState |
|----------|--------------|----------------|-------------------|
| `GET /api/v1/cache-efficiency` | `from?, to?` | `{hitRate, totalWrites, totalReads, trend}` | computed from `state.costs` |
| `GET /api/v1/heatmap` | `year?` | `{days: [{date, cost, tokens}]}` | `state.heatmap` |

### Query Parameter Validation Pattern (Hono + Zod)

Use `@hono/zod-validator` for all query parameter validation. This package is not yet in root `package.json`.

```typescript
// src/server/routes/api.ts
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const dateRangeSchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to:   z.string().datetime({ offset: true }).optional(),
});

app.get('/timeline',
  zValidator('query', dateRangeSchema),
  (c) => {
    const { from, to } = c.req.valid('query');
    const start = from ? new Date(from) : undefined;
    const end   = to   ? new Date(to)   : undefined;
    // filter state.timeline, return buckets
  }
);
```

Validation failure returns HTTP 400 automatically. Install: `npm install @hono/zod-validator` in root.

---

## Aggregation Layer: New `src/aggregation/` Module

This module is the critical new server-side addition. It produces pre-computed indexes from `CostEvent[]`.

### File Structure

```
src/aggregation/
  timeline.ts      — bucket CostEvent[] into day/week/month maps
  by-model.ts      — group CostEvent[] by model ID, compute per-model totals
  by-project.ts    — group CostEvent[] by cwd, decode project names
  sessions.ts      — build SessionSummary map from CostEvent[]
  heatmap.ts       — compute daily activity for heatmap rendering
  types.ts         — all aggregation result types
  index.ts         — re-exports
```

### Aggregation Types

```typescript
// src/aggregation/types.ts

export interface TimelineBucket {
  date: string;          // ISO date string, start of bucket period
  cost: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface TimelineIndex {
  daily: Map<string, TimelineBucket>;    // keyed by 'YYYY-MM-DD'
  weekly: Map<string, TimelineBucket>;   // keyed by ISO week start
  monthly: Map<string, TimelineBucket>;  // keyed by 'YYYY-MM'
}

export interface ModelSummary {
  modelId: string;
  label: string;         // human-readable name from pricing table
  cost: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  eventCount: number;
}

export type ModelIndex = Map<string, ModelSummary>;

export interface ProjectSummary {
  path: string;          // cwd value from NormalizedEvent
  name: string;          // last 2 path segments for display (e.g., "work/myapp")
  cost: number;
  inputTokens: number;
  outputTokens: number;
  sessionCount: number;
  eventCount: number;
}

export type ProjectIndex = Map<string, ProjectSummary>;

export interface TurnSummary {
  timestamp: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  cost: number;
}

export interface SessionSummary {
  sessionId: string;
  project: string;       // cwd from first event
  projectName: string;   // display name
  model: string;         // model from last event (can change within session)
  cost: number;
  startTime: string;     // timestamp of first event
  endTime: string;       // timestamp of last event
  durationMs: number;
  turnCount: number;
  turns: TurnSummary[];  // full detail, used by session detail endpoint
  isSidechain: boolean;  // true if any event is sidechain
}

export type SessionIndex = Map<string, SessionSummary>;

export interface HeatmapDay {
  date: string;          // 'YYYY/MM/DD' (format required by @uiw/react-heat-map)
  count: number;         // number of events (for intensity)
  cost: number;          // for tooltip display
}
```

### Integration in CLI Startup

```typescript
// src/server/cli.ts (updated for Phase 4)
import { buildTimelineIndex } from '../aggregation/timeline.js';
import { buildModelIndex }    from '../aggregation/by-model.js';
import { buildProjectIndex }  from '../aggregation/by-project.js';
import { buildSessionIndex }  from '../aggregation/sessions.js';
import { buildHeatmapData }   from '../aggregation/heatmap.js';

const events  = await parseAll(opts.dir !== undefined ? { dir: opts.dir } : {});
const filtered = applyPrivacyFilter(events);
const costs   = computeCosts(filtered);

// Aggregation (pure functions, no I/O)
const timeline = buildTimelineIndex(costs);     // Phase 4
const byModel  = buildModelIndex(costs);        // Phase 5
const byProject = buildProjectIndex(costs);     // Phase 5
const sessions = buildSessionIndex(costs);      // Phase 6
const heatmap  = buildHeatmapData(costs);       // Phase 7

const app = createApp({ events: filtered, costs, timeline, byModel, byProject, sessions, heatmap });
```

Add indexes to `AppState` incrementally per phase. Existing `AppState` is additive — no breaking changes.

---

## Frontend Architecture: Component Map

### What Gets Added vs Modified

| Component | Status | Phase | Notes |
|-----------|--------|-------|-------|
| `web/src/index.css` | MODIFIED | 8 | Add `@custom-variant dark` for class-based dark mode |
| `web/src/main.tsx` | MODIFIED | 8 | Add theme-init inline script to `index.html` |
| `web/src/App.tsx` | MODIFIED | 4 | Wrap with `QueryClientProvider` and `ThemeProvider` |
| `web/src/components/Layout.tsx` | MODIFIED | 4, 8 | Add date range picker in header; add dark mode toggle |
| `web/src/pages/Overview.tsx` | REPLACED | 4 | Full cost analytics dashboard implementation |
| `web/src/pages/Models.tsx` | REPLACED | 5 | Model donut chart + table |
| `web/src/pages/Projects.tsx` | REPLACED | 5 | Project cost breakdown table |
| `web/src/pages/Sessions.tsx` | REPLACED | 6 | Session list with sortable table |
| `web/src/pages/SessionDetail.tsx` | NEW | 6 | Session detail with turn breakdown |
| `web/src/components/charts/AreaChart.tsx` | NEW | 4 | Cost over time — Recharts AreaChart |
| `web/src/components/charts/DonutChart.tsx` | NEW | 5 | Per-model breakdown — Recharts PieChart |
| `web/src/components/charts/Heatmap.tsx` | NEW | 7 | Activity heatmap — @uiw/react-heat-map |
| `web/src/components/ui/StatCard.tsx` | NEW | 4 | Summary stat with label + value |
| `web/src/components/ui/DateRangePicker.tsx` | NEW | 4 | shadcn/ui Calendar + Popover composition |
| `web/src/components/ui/TokenBadge.tsx` | NEW | 4 | Token type breakdown badge |
| `web/src/lib/api.ts` | NEW | 4 | Typed API client functions (fetch wrappers) |
| `web/src/lib/format.ts` | NEW | 4 | Currency, token count, date formatting |
| `web/src/hooks/useApi.ts` | NEW | 4 | TanStack Query hooks wrapping api.ts |
| `web/src/store/filters.ts` | NEW | 4 | Zustand store for global date range + dark mode |
| `web/src/store/theme.ts` | NEW | 8 | Zustand persist store for dark mode preference |

### Router: New Session Detail Route

Add to `web/src/App.tsx`:

```tsx
{ path: 'sessions/:sessionId', element: <SessionDetail /> }
```

The `createHashRouter` pattern already in use handles nested paths. Hash URLs like `/#/sessions/abc-123` work correctly.

---

## Global Date Range Filter: State Architecture

The date range picker is the central interaction element. Its state must:
1. Be accessible to all page components (Overview, Models, Projects, Sessions)
2. Trigger re-fetches when changed
3. Survive navigation between routes (not reset on route change)
4. Not require URL params (this is a local tool, not shareable state)

**Decision: Zustand store, not URL search params.**

URL search params are appropriate when state must be shareable (e.g., a web app where someone emails a link to a filtered view). yclaude is local-only in Phase 1. Zustand is simpler, has no URL pollution, and integrates naturally with TanStack Query's `queryKey` arrays.

### Filter Store

```typescript
// web/src/store/filters.ts
import { create } from 'zustand';
import { subDays } from 'date-fns';

export type DatePreset = '7d' | '30d' | '90d' | 'all';

interface FiltersState {
  dateRange: { from: Date; to: Date };
  preset: DatePreset;
  setDateRange: (from: Date, to: Date) => void;
  setPreset: (preset: DatePreset) => void;
}

export const useFilters = create<FiltersState>((set) => ({
  dateRange: { from: subDays(new Date(), 30), to: new Date() },
  preset: '30d',
  setDateRange: (from, to) => set({ dateRange: { from, to }, preset: 'all' }),
  setPreset: (preset) => {
    const to = new Date();
    const from = preset === 'all'
      ? new Date(0)
      : subDays(to, preset === '7d' ? 7 : preset === '30d' ? 30 : 90);
    set({ dateRange: { from, to }, preset });
  },
}));
```

### TanStack Query Integration

API hooks use the date range as part of the query key, so React Query re-fetches automatically when the filter changes:

```typescript
// web/src/hooks/useApi.ts
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../store/filters';
import { fetchTimeline } from '../lib/api';

export function useTimeline(bucket: 'day' | 'week' | 'month') {
  const { dateRange } = useFilters();
  return useQuery({
    queryKey: ['timeline', bucket, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: () => fetchTimeline({ bucket, from: dateRange.from, to: dateRange.to }),
    staleTime: 5 * 60 * 1000,  // 5 minutes — data loaded at startup, won't change
  });
}
```

`staleTime: Infinity` is appropriate here because the server holds data loaded at startup. Setting 5 minutes provides a reasonable balance without aggressive re-fetching.

### QueryClient Setup

```typescript
// web/src/App.tsx (updated)
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

---

## Dark Mode Architecture (Phase 8)

**Decision: Tailwind v4 `@custom-variant` class strategy with Zustand `persist` store.**

This gives system-default behavior on first visit and manual override that persists across sessions.

### CSS Configuration

```css
/* web/src/index.css */
@import "tailwindcss";

/* Enable class-based dark mode — dark: utilities activate when .dark is on <html> */
@custom-variant dark (&:where(.dark, .dark *));

/* Chart color variables with dark mode variants */
:root {
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6  0.118 184.704);
  --chart-3: oklch(0.7  0.15  60);
  --chart-4: oklch(0.55 0.18  240);
  --chart-5: oklch(0.65 0.14  140);
}
.dark {
  --chart-1: oklch(0.75 0.19  41.116);
  --chart-2: oklch(0.7  0.12  184.704);
  /* ... shifted for dark backgrounds */
}
```

### Theme Store with Persist

```typescript
// web/src/store/theme.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
    }),
    { name: 'yclaude-theme' }
  )
);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
}
```

### FOUC Prevention (Flash of Unstyled Content)

The theme must be applied before React hydrates to prevent flash. Add an inline script to `web/index.html`:

```html
<!-- web/index.html — add inside <head> before any stylesheets -->
<script>
  (function() {
    const stored = localStorage.getItem('yclaude-theme');
    const theme = stored ? JSON.parse(stored).state?.theme : 'system';
    const isDark = theme === 'dark' ||
      (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  })();
</script>
```

This reads the same `yclaude-theme` key that Zustand persist uses, ensuring consistency.

---

## Charting Components

### Cost Over Time: AreaChart (Phase 4)

Use Recharts `AreaChart` directly (not shadcn/ui wrapper) for maximum control. The shadcn ChartContainer and ChartTooltipContent are used for consistent theming.

```tsx
// web/src/components/charts/AreaChart.tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartConfig } from '../ui/chart'; // shadcn generated

const config: ChartConfig = {
  cost: { label: 'Estimated Cost', color: 'var(--chart-1)' },
};

export function CostAreaChart({ data }: { data: TimelineBucket[] }) {
  return (
    <ChartContainer config={config} className="min-h-[200px] w-full">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={(d) => formatDateShort(d)} />
        <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} />
        <Tooltip content={<ChartTooltipContent />} />
        <Area type="monotone" dataKey="cost" stroke="var(--color-cost)" fill="var(--color-cost)" fillOpacity={0.2} />
      </AreaChart>
    </ChartContainer>
  );
}
```

### Model Breakdown: PieChart (Phase 5)

```tsx
// web/src/components/charts/DonutChart.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
// Each model gets a CSS variable color from the chart config
```

### Activity Heatmap (Phase 7)

Use `@uiw/react-heat-map` (a dedicated SVG heatmap library). Not installed yet.

```tsx
// web/src/components/charts/Heatmap.tsx
import HeatMap from '@uiw/react-heat-map';

export function ActivityHeatmap({ data }: { data: HeatmapDay[] }) {
  return (
    <HeatMap
      value={data}
      startDate={new Date(new Date().getFullYear(), 0, 1)}
      panelColors={{
        0: 'var(--tw-color-slate-100)',
        5: 'var(--tw-color-violet-200)',
        20: 'var(--tw-color-violet-400)',
        50: 'var(--tw-color-violet-600)',
      }}
    />
  );
}
```

`panelColors` must use CSS variables linked to Tailwind color values or hardcoded hex. Dark mode adjustment via CSS `@custom-variant dark` selectors targeting `.w-heatmap` class.

---

## Data Flow: End-to-End (Phase 4+)

```
~/.claude/projects/{slug}/*.jsonl
    |
    | parseAll() — streaming JSONL reader + normalizer + DedupAccumulator
    v
NormalizedEvent[]
    |
    | applyPrivacyFilter() — strips conversation content fields
    v
NormalizedEvent[] (filtered)
    |
    | computeCosts() — adds costUsd to each event
    v
CostEvent[]
    |
    | buildTimelineIndex()  buildModelIndex()  buildProjectIndex()
    | buildSessionIndex()   buildHeatmapData()
    v
AppState { events, costs, timeline, byModel, byProject, sessions, heatmap }
    |
    | createApp(AppState) — Hono factory injects state into route closures
    v
Hono HTTP Server (127.0.0.1:3000)
    |
    | /api/v1/summary?from=...&to=...   GET
    | /api/v1/timeline?bucket=day       GET
    | /api/v1/models?from=...           GET
    | /api/v1/projects                  GET
    | /api/v1/sessions?sort=cost        GET
    | /api/v1/sessions/:id              GET
    | /api/v1/heatmap                   GET
    v
React SPA (hash-routed, served as static from web-dist/)
    |
    | useFilters() Zustand store → dateRange, preset
    | useTimeline() / useModels() / useSessions() TanStack Query hooks
    |   → queryKey includes dateRange ISO strings
    |   → staleTime: 5 minutes
    v
Page Components (Overview, Models, Projects, Sessions, SessionDetail)
    |
    | CostAreaChart, DonutChart, ActivityHeatmap, StatCard, SessionTable
    v
User sees dashboard
```

---

## Suggested Build Order for Phases 4-8

Phase dependencies and integration points determine this ordering.

### Phase 4: Cost Analytics Dashboard

**Builds on:** `/api/v1/summary` (already exists, needs `from`/`to` params), AppState.costs

**New server code:**
1. `src/aggregation/timeline.ts` — `buildTimelineIndex(costs)`
2. `src/aggregation/types.ts` — shared aggregation types
3. Extend `AppState` with `timeline`
4. Add `GET /api/v1/timeline` route with `bucket` + date range params
5. Extend `GET /api/v1/summary` with `from`/`to` params

**New web code:**
1. Install: `@tanstack/react-query`, `recharts`, `zustand`, `date-fns` in web/package.json
2. Install: `@hono/zod-validator` in root package.json
3. `web/src/store/filters.ts` — Zustand date range store
4. `web/src/lib/api.ts` — typed fetch functions
5. `web/src/hooks/useApi.ts` — TanStack Query hooks
6. `web/src/components/ui/DateRangePicker.tsx` — shadcn Calendar + Popover
7. `web/src/components/ui/StatCard.tsx` — stat display
8. `web/src/components/charts/AreaChart.tsx` — Recharts AreaChart
9. Update `web/src/components/Layout.tsx` — add date picker to header
10. Replace `web/src/pages/Overview.tsx` — full dashboard implementation

**Critical ordering:** Zustand store and TanStack Query must be set up before any page components. DateRangePicker before Layout update.

### Phase 5: Model & Project Breakdowns

**Builds on:** Phase 4's filter store, TanStack Query setup, AppState pattern

**New server code:**
1. `src/aggregation/by-model.ts` — `buildModelIndex(costs)`
2. `src/aggregation/by-project.ts` — `buildProjectIndex(costs)` with path display name logic
3. Extend `AppState` with `byModel`, `byProject`
4. Add `GET /api/v1/models` and `GET /api/v1/projects` routes

**New web code:**
1. `web/src/components/charts/DonutChart.tsx` — Recharts PieChart
2. Replace `web/src/pages/Models.tsx`
3. Replace `web/src/pages/Projects.tsx`

**Note:** Project display name logic — use last 2 path segments of `cwd` (e.g., `/Users/alex/work/myapp` → `work/myapp`). Do not use slug decoding (decided broken in Phase 1, cwd is ground truth).

### Phase 6: Session Explorer

**Builds on:** Phase 4's filter store, Phase 5's aggregation pattern

**New server code:**
1. `src/aggregation/sessions.ts` — `buildSessionIndex(costs)`
2. Extend `AppState` with `sessions`
3. Add `GET /api/v1/sessions` (list) and `GET /api/v1/sessions/:id` (detail) routes

**New web code:**
1. Add route `sessions/:sessionId` to `web/src/App.tsx`
2. `web/src/components/ui/SessionTable.tsx` — sortable session list
3. Replace `web/src/pages/Sessions.tsx` — session list page
4. `web/src/pages/SessionDetail.tsx` — new page, per-turn token breakdown

**Note:** Session duration = `endTime - startTime` computed from `SessionSummary`. Duration for display-only; no `durationMs` field in `NormalizedEvent` from parser (that field is from system events, not always present). Compute it.

### Phase 7: Differentiator Features

**Builds on:** Phase 5 (by-model data for cache efficiency), Phase 6 (sessions for sidechain flagging)

**New server code:**
1. `src/aggregation/heatmap.ts` — `buildHeatmapData(costs)`
2. Cache efficiency: computed per-request from `state.costs` in route handler (no separate index needed — O(n) scan is fast enough for a single user's data)
3. Add `GET /api/v1/cache-efficiency` route
4. Add `GET /api/v1/heatmap` route (serves `state.heatmap`)
5. Extend `GET /api/v1/sessions` to include `isSidechain` and `gitBranch` in response

**New web code:**
1. Install `@uiw/react-heat-map` in web/package.json
2. `web/src/components/charts/Heatmap.tsx`
3. `web/src/components/ui/CacheEfficiencyScore.tsx`
4. Update Overview, Sessions pages with new components

### Phase 8: Dark Mode & Personality

**Builds on:** All prior phases. This is a full-app pass.

**No new backend code needed.**

**Web code changes:**
1. Install `zustand` middleware (already installed from Phase 4, just use persist)
2. `web/src/store/theme.ts` — Zustand persist store for theme preference
3. `web/src/index.css` — add `@custom-variant dark` directive + dark color variables
4. `web/index.html` — add inline theme-init script in `<head>`
5. Update `web/src/components/Layout.tsx` — dark mode toggle button
6. Pass through all page/component files adding `dark:` Tailwind variants
7. `web/src/lib/copy.ts` — humor copy strings keyed by context (stat callouts, empty states, etc.)
8. Personality copy integration across all pages

---

## Integration Points: Explicit Mapping

### What Phases 4-8 Touch vs Leave Alone

| Existing File | Touched? | Why |
|---------------|----------|-----|
| `src/parser/` (all) | No | Parser is complete and stable |
| `src/cost/engine.ts` | No | computeCosts() is correct and complete |
| `src/cost/pricing.ts` | Maybe | Update when new model pricing needed |
| `src/cost/privacy.ts` | No | Privacy filter is complete |
| `src/index.ts` | Minor | Add aggregation function re-exports as needed |
| `src/server/server.ts` | Yes | AppState interface grows per phase |
| `src/server/routes/api.ts` | Yes | New routes added, summary extended |
| `src/server/cli.ts` | Yes | Add buildXxx() calls per phase |
| `web/src/index.css` | Yes (Phase 8) | Add @custom-variant dark |
| `web/src/main.tsx` | No | No changes needed |
| `web/src/App.tsx` | Yes (Phase 4, 6) | Add QueryClientProvider, new session detail route |
| `web/src/components/Layout.tsx` | Yes (Phase 4, 8) | Date picker + dark mode toggle |

### Where Each New API Endpoint Gets Its Data

| Endpoint | Data Source | Aggregation Function |
|----------|-------------|---------------------|
| `/api/v1/summary?from&to` | `state.costs` (filter inline) | None (direct reduce) |
| `/api/v1/timeline?bucket` | `state.timeline` | `buildTimelineIndex()` |
| `/api/v1/models?from&to` | `state.byModel` (filter inline) | `buildModelIndex()` |
| `/api/v1/projects?from&to` | `state.byProject` (filter inline) | `buildProjectIndex()` |
| `/api/v1/sessions` | `state.sessions` (filter + sort inline) | `buildSessionIndex()` |
| `/api/v1/sessions/:id` | `state.sessions.get(id)` | Same `buildSessionIndex()` |
| `/api/v1/heatmap` | `state.heatmap` | `buildHeatmapData()` |
| `/api/v1/cache-efficiency` | `state.costs` (inline compute) | None (O(n) reduce in route) |

---

## Anti-Patterns to Avoid (Phase 4-8 Specific)

### Anti-Pattern 1: Per-Request Aggregation

**What goes wrong:** Route handlers call `buildTimelineIndex(state.costs)` on every request.

**Why it's bad:** With months of Claude Code history, `state.costs` can be 50K+ events. Re-aggregating on every chart request adds 100-500ms per request.

**Prevention:** Aggregation indexes are computed once at startup (see CLI startup pattern above). Route handlers only filter/sort pre-built indexes.

### Anti-Pattern 2: Waterfall API Calls in Overview Page

**What goes wrong:** Overview page calls `/summary`, then waits, then calls `/timeline`, then waits, creating a chain of sequential requests.

**Prevention:** All TanStack Query hooks are called at the top of the component. React Query fires all requests in parallel. Never chain `.then()` to sequence API calls.

### Anti-Pattern 3: Date Range in Component Local State

**What goes wrong:** Each page (Overview, Models, Sessions) has its own `useState` for date range. Changing the date picker on Overview doesn't affect Sessions.

**Prevention:** Date range lives in Zustand store (`useFilters`). Every page reads from the same store. Layout places the single DateRangePicker, all pages react to its changes.

### Anti-Pattern 4: Tailwind Dark Mode via `media` Strategy

**What goes wrong:** Using `@media (prefers-color-scheme: dark)` only (the Tailwind v4 default) means users cannot override the theme manually.

**Prevention:** The `@custom-variant dark` directive in CSS switches control to the `.dark` class on `<html>`. Tailwind's dark: utilities then respond to class, not media. The Zustand theme store and FOUC prevention script control the class.

### Anti-Pattern 5: shadcn/ui Installed as Dependency

**What goes wrong:** `npm install shadcn-ui` as a runtime dependency. This is not how shadcn/ui works and will fail or bring in an outdated package.

**Prevention:** shadcn/ui uses a CLI to copy component source into `web/src/components/ui/`. Run `npx shadcn@latest add chart card button popover calendar` from the `web/` directory. Components are owned by the project, not a dependency. radix-ui primitives become actual dependencies.

---

## New Dependencies Required

### Root `package.json`

```bash
npm install @hono/zod-validator
```

### `web/package.json`

```bash
# Phase 4
npm install @tanstack/react-query zustand date-fns recharts
# shadcn/ui (run from web/)
npx shadcn@latest init
npx shadcn@latest add chart card button popover calendar

# Phase 7
npm install @uiw/react-heat-map
```

Note: `@tanstack/react-query` v5.90.x, `zustand` v5.0.x, `date-fns` v4.1.x, `recharts` v3.7.x, `@uiw/react-heat-map` latest.

---

## Scalability Notes

For a single-user local tool, the in-memory aggregation approach is correct. Typical Claude Code heavy user has:
- ~500-5000 JSONL events (1-6 months of active use)
- Total data: 1-20 MB of JSONL
- Startup time: 1-3 seconds (already measured in Phase 1 human checkpoint)
- In-memory aggregation of 5K events: <100ms

No database, no pagination, no lazy loading needed for Phase 1 scale. The architecture supports adding these in Phase 2 (cloud) by replacing `AppState` with `CloudAPIProvider` without touching the frontend.

---

## Sources

- `src/` directory — read directly (HIGH confidence — ground truth)
- `web/src/` directory — read directly (HIGH confidence — ground truth)
- [Tailwind v4 dark mode configuration](https://tailwindcss.com/docs/dark-mode) (HIGH confidence — official docs)
- [shadcn/ui chart component docs](https://ui.shadcn.com/docs/components/radix/chart) (HIGH confidence — official docs)
- [shadcn/ui DatePickerWithRange](https://ui.shadcn.com/docs/components/radix/date-picker) (HIGH confidence — official docs)
- [TanStack Query v5 caching](https://tanstack.com/query/v5/docs/react/guides/caching) (HIGH confidence — official docs)
- [@hono/zod-validator npm](https://www.npmjs.com/package/@hono/zod-validator) (HIGH confidence — npm registry)
- [Hono validation guide](https://hono.dev/docs/guides/validation) (HIGH confidence — official docs)
- [@uiw/react-heat-map GitHub](https://github.com/uiwjs/react-heat-map) (MEDIUM confidence — read directly)
- [React Router v7 useSearchParams](https://reactrouter.com/api/hooks/useSearchParams) (HIGH confidence — official docs)
- [React Router v7 hash router discussion](https://github.com/remix-run/react-router/discussions/13057) (MEDIUM confidence — community verified)
- [Zustand + TanStack Query pattern](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m) (MEDIUM confidence — community verified against zustand docs)

---
*Architecture research for: yclaude dashboard features integration — Phases 4-8*
*Researched: 2026-02-28*
