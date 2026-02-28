# Phase 4: Cost Analytics Dashboard - Research

**Researched:** 2026-02-28
**Domain:** React dashboard — data fetching, charting, date range filtering, global state
**Confidence:** HIGH (core libraries), MEDIUM (integration patterns)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Date range picker**
- Placement: top-right of the Overview page
- Presets: 7d (default on load) · 30d · 90d · All time · Custom date picker
- No 24h preset (deferred)
- When selected range exceeds available data: show available data silently, no warning
- Changing the picker triggers coordinated re-fetch via TanStack Query across all cards and chart

**Token breakdown visualization**
- Layout: progress bars per token type (four rows: Input, Output, Cache write, Cache read)
- Each row: label · color-coded bar · token-share % · token count · estimated cost in $
- Bar width represents token share % (not cost share %)
- Semantic colors: blue=input, emerald=output, amber=cache write, slate=cache read
- Footer row: total tokens + total estimated cost

**Cost stat cards**
- Style: big hero numbers — dollar amount is visual anchor, label above
- Two cards side by side: "All-time est." and "Last [N]d est." (label reflects selected range)
- Period card includes trend indicator: arrow + % change vs prior equivalent period
- Trend arrows are neutral gray — no red/green color judgment on spend direction

**Cost-over-time chart**
- Chart type: column bar chart (not area/line)
- Bar style: rounded top corners (2–4px radius), light gray gridlines behind bars
- Hover tooltip: exact estimated cost for that day/week/month
- Toggle: Daily (default) · Weekly · Monthly
- X-axis label density: smart auto-thinning — 7d daily every day, 30d daily every 5th, 90d weekly month-name labels
- Zero-cost days: show as $0 bars

### Claude's Discretion
- Chart library selection (Recharts recommended — mature React support, CSS var-compatible fills)
- Exact color values for semantic token type colors (must be defined as CSS vars for dark mode)
- TanStack Query setup and cache invalidation strategy
- Date picker component library selection
- Responsive layout breakpoints

### Deferred Ideas (OUT OF SCOPE)
- 24h range + Hourly bucketing
- Auto-fit bucketing (chart auto-selects granularity based on range)
- Area/gradient chart variant (defer to Phase 7/8)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANLT-01 | User can see total estimated cost with all-time and selected-period totals at a glance | TanStack Query fetches two summary objects (all-time + date-filtered); stat card components display hero numbers |
| ANLT-02 | User can see token usage broken down by type (input / output / cache_creation / cache_read) | `/api/v1/summary` already returns `totalTokens` breakdown; progress-bar component computes share % from totals |
| ANLT-03 | User can view cost over time as a chart with daily / weekly / monthly toggle | New `/api/v1/cost-over-time?from=&to=&bucket=` endpoint + Recharts BarChart; toggle state controls bucket param in queryKey |
| ANLT-06 | User can filter all views by date range with a global date range picker | Zustand `useDateRangeStore` holds `{ from, to, preset }`; all useQuery calls include `[from, to]` in their queryKey |
</phase_requirements>

---

## Summary

Phase 4 introduces the first real data visualization to the app. The work spans three layers: a new API endpoint on the Hono server for bucketed cost-over-time data, a global date range state store (Zustand) consumed by TanStack Query for coordinated re-fetching, and three UI components (stat cards, token breakdown progress bars, bar chart) rendered inside the existing Overview page stub.

The existing `/api/v1/summary` route already aggregates token and cost data but has no date filtering or time-series output. Phase 4 must: (1) add `?from=` / `?to=` ISO query params to `/api/v1/summary`, (2) add a new `/api/v1/cost-over-time` endpoint with `?from=`, `?to=`, `?bucket=day|week|month`, and (3) build the frontend Overview page with TanStack Query, Zustand, Recharts, and a date picker.

The recommended stack — **TanStack Query v5**, **Zustand v5**, **Recharts v3**, **react-day-picker v9** — is all current, actively maintained, React 19 compatible, and has no peer-dependency conflicts with the existing React 19 + Vite 7 + Tailwind v4 setup. The biggest implementation risk is the Tailwind v4 dark mode prep: `@custom-variant dark` must be added to `index.css` in this phase even though the toggle ships in Phase 8 — the STATE.md records this as a known decision.

**Primary recommendation:** Use Recharts v3 (fill prop accepts `var(--color-*)` directly), Zustand v5 for the date filter store (no provider needed), TanStack Query v5 with date range in queryKey for automatic coordinated re-fetch, and react-day-picker v9 for the range picker.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | ^5.90.21 | Server-state fetching, caching, coordinated re-fetch | Industry standard for React async state; queryKey-driven refetch is exactly what the date filter needs |
| `zustand` | ^5.0.11 | Global date range filter store | Minimal boilerplate, no Provider required, perfect for single cross-cutting state slice |
| `recharts` | ^3.7.0 | Bar chart rendering | Most mature React-native chart library; SVG-based so CSS `var()` fills work natively; v3 has radius prop for rounded bars |
| `react-day-picker` | ^9.14.0 | Date range picker calendar | Lightweight, unstyled-friendly, ships `mode="range"` and `DateRange` type; CSS vars for styling |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query-devtools` | ^5.x | Dev-only query inspection | Add to App.tsx under `process.env.NODE_ENV !== 'production'` guard — optional but useful |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Victory, Nivo, Chart.js | Recharts is lightest and most idiomatic for React; Nivo is heavier with more built-in polish; Chart.js needs canvas adapter for CSS vars |
| react-day-picker | `@radix-ui/react-popover` + manual calendar | react-day-picker ships the calendar UI; pure Radix approach requires building a calendar from scratch |
| Zustand | React Context | Context causes all consumers to re-render on any state change; Zustand selector subscriptions re-render only the affected consumer |
| Zustand | URL search params | STATE.md decision: URL sync deferred to v1.x; Zustand is simpler for Phase 4 scope |

**Installation (run inside `web/`):**
```bash
bun add @tanstack/react-query zustand recharts react-day-picker
bun add -d @tanstack/react-query-devtools
```

---

## Architecture Patterns

### Recommended Project Structure

```
web/src/
├── store/
│   └── useDateRangeStore.ts      # Zustand store: { from, to, preset, setRange, setPreset }
├── hooks/
│   ├── useSummary.ts             # useQuery wrapper for /api/v1/summary (date-filtered)
│   ├── useAllTimeSummary.ts      # useQuery wrapper for /api/v1/summary (no date filter)
│   └── useCostOverTime.ts        # useQuery wrapper for /api/v1/cost-over-time
├── components/
│   ├── StatCard.tsx              # Hero-number card; takes label + value props
│   ├── TrendIndicator.tsx        # Arrow + % change, neutral gray
│   ├── TokenBreakdown.tsx        # Four-row progress bar table
│   └── CostBarChart.tsx          # Recharts BarChart + bucket toggle
├── pages/
│   └── Overview.tsx              # Replace stub — assembles all components
└── index.css                     # Add @custom-variant dark + CSS vars for chart colors
```

### Pattern 1: Zustand Date Range Store

**What:** A single store holding `{ from: Date | undefined, to: Date | undefined, preset: '7d' | '30d' | '90d' | 'all' | 'custom' }`. On load, `preset` is `'7d'` and `from`/`to` are computed from `new Date()`.

**When to use:** Any component that either reads or sets the date filter.

**Example:**
```typescript
// web/src/store/useDateRangeStore.ts
import { create } from 'zustand';

export type Preset = '7d' | '30d' | '90d' | 'all' | 'custom';

interface DateRangeState {
  from: Date | undefined;
  to: Date | undefined;
  preset: Preset;
  setPreset: (preset: Preset) => void;
  setCustomRange: (from: Date | undefined, to: Date | undefined) => void;
}

function presetToDates(preset: Preset): { from: Date | undefined; to: Date | undefined } {
  const to = new Date();
  if (preset === 'all') return { from: undefined, to: undefined };
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from, to };
}

export const useDateRangeStore = create<DateRangeState>((set) => {
  const { from, to } = presetToDates('7d');
  return {
    from,
    to,
    preset: '7d',
    setPreset: (preset) => set({ preset, ...presetToDates(preset) }),
    setCustomRange: (from, to) => set({ preset: 'custom', from, to }),
  };
});
```

### Pattern 2: TanStack Query Setup in App.tsx

**What:** Wrap the entire app in `QueryClientProvider`. QueryClient is created once outside the component.

**Example:**
```typescript
// web/src/App.tsx (updated)
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// ... existing imports

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes — data doesn't change while app is open
      retry: 1,
      refetchOnWindowFocus: false,
    },
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

### Pattern 3: Coordinated Re-fetch via QueryKey

**What:** Include `[from?.toISOString(), to?.toISOString()]` in the queryKey. When Zustand store updates, the queryKey changes, TanStack Query automatically triggers a new fetch for ALL hooks that use the same key structure.

**Example:**
```typescript
// web/src/hooks/useSummary.ts
import { useQuery } from '@tanstack/react-query';
import { useDateRangeStore } from '../store/useDateRangeStore';

export function useSummary() {
  const { from, to } = useDateRangeStore();
  const params = new URLSearchParams();
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());

  return useQuery({
    queryKey: ['summary', from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/v1/summary?${params}`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json();
    },
  });
}
```

### Pattern 4: Recharts BarChart with CSS Variable Fill

**What:** Pass `fill="var(--color-bar)"` to `<Bar>`. The SVG fill attribute resolves CSS variables at paint time — this is standard SVG behavior, confirmed working in Recharts since v2.

**Example:**
```tsx
// web/src/components/CostBarChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={240}>
  <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid)" vertical={false} />
    <XAxis
      dataKey="date"
      tickFormatter={formatXAxisLabel}
      interval="preserveStartEnd"
      minTickGap={40}
      tickLine={false}
      axisLine={false}
    />
    <YAxis
      tickFormatter={(v) => `$${v.toFixed(2)}`}
      tickLine={false}
      axisLine={false}
      width={60}
    />
    <Tooltip formatter={(value: number) => [`$${value.toFixed(4)}`, 'Est. cost']} />
    <Bar dataKey="cost" fill="var(--color-bar)" radius={[3, 3, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### Pattern 5: Tailwind v4 Dark Mode Prep (Phase 8 Prerequisite)

**What:** Add `@custom-variant dark` to `index.css` now. Without this, Phase 8 dark mode toggle will require retrofitting all chart color CSS vars.

```css
/* web/src/index.css */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Chart semantic colors — Phase 4 defines these; Phase 8 overrides in .dark context */
  --color-token-input: oklch(0.60 0.18 250);    /* blue */
  --color-token-output: oklch(0.60 0.18 160);   /* emerald */
  --color-token-cache-write: oklch(0.65 0.18 70); /* amber */
  --color-token-cache-read: oklch(0.55 0.04 240); /* slate */
  --color-bar: oklch(0.60 0.18 250);             /* bar chart fill */
  --color-grid: oklch(0.92 0 0);                 /* gridline stroke */
}
```

**Note:** Exact oklch values are Claude's discretion — they must pass WCAG AA contrast against both white (light mode) and dark backgrounds.

### Pattern 6: XAxis Label Auto-Thinning

**What:** `interval="preserveStartEnd"` with `minTickGap={40}` lets Recharts calculate which labels to show without overlap. For semantic granularity control, compute the `tickFormatter` based on bucket type.

```typescript
function makeXAxisFormatter(bucket: 'day' | 'week' | 'month') {
  return (dateStr: string) => {
    const d = new Date(dateStr);
    if (bucket === 'month') return d.toLocaleString('default', { month: 'short' });
    if (bucket === 'week') return `${d.getMonth() + 1}/${d.getDate()}`;
    return `${d.getMonth() + 1}/${d.getDate()}`; // day: M/D
  };
}
```

### Anti-Patterns to Avoid

- **Hardcoding hex colors in chart `fill`:** Use `var(--color-*)` only. Hard-coded hex values are immune to Phase 8 dark mode theme toggling.
- **Storing date filter in URL search params for Phase 4:** STATE.md decision defers URL sync to v1.x. Zustand is the store.
- **Doing aggregation client-side:** STATE.md decision: `src/aggregation/` module on server side; frontend never receives raw `CostEvent[]`.
- **Passing raw `CostEvent[]` to the frontend:** Not just a performance issue — events may contain path/model info that should be aggregated, not raw-exposed.
- **Creating QueryClient inside the component:** Causes re-creation on every render, destroying cache. Create once at module scope.
- **Using `new Date()` in queryKey directly:** `new Date().toISOString()` changes every millisecond. Store the Date in Zustand and derive ISO string from the stored value.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server-state caching | Custom fetch wrapper with useState + useEffect | TanStack Query `useQuery` | Loading/error states, stale-while-revalidate, dedup of concurrent requests, background refetch |
| Date range calendar UI | Custom calendar grid with keyboard nav | react-day-picker v9 | WCAG accessibility, range selection state machine, locale formatting all pre-built |
| Global date filter state | React Context with custom selector | Zustand | Context re-renders all consumers; Zustand only re-renders subscribed selectors |
| Bar chart SVG | Manual `<rect>` + D3 scales | Recharts `<BarChart>` | Responsive container, tooltip, axis formatting, animation, accessibilityLayer — weeks of work |
| Date bucketing (day/week/month) | Custom groupBy logic | Server-side in `src/aggregation/` | Avoids sending thousands of raw events to browser; keeps aggregation logic testable |

**Key insight:** Every "simple" custom solution in this domain (charts, calendars, caching) has hidden complexity — keyboard accessibility, timezone edge cases, network race conditions, resize handling. Use established libraries.

---

## Common Pitfalls

### Pitfall 1: Tailwind v4 Dark Mode Not Wired Before Chart Colors Are Hardcoded

**What goes wrong:** If chart colors are set as hex values in JSX (`fill="#3b82f6"`) instead of CSS variables, Phase 8 dark mode will require touching every chart component individually.

**Why it happens:** It's faster to just type a hex value than to define a CSS variable.

**How to avoid:** Define `--color-*` in `index.css` `@theme` block FIRST. Never use hex in chart props.

**Warning signs:** Any `fill="#..."` or `stroke="#..."` in chart JSX is a red flag.

---

### Pitfall 2: Recharts v3 `activeIndex` Removal

**What goes wrong:** If any code references `activeIndex` prop on a `<Bar>` component, it silently does nothing in v3 (the prop was removed).

**Why it happens:** Recharts v3 is a major version with breaking changes from v2.

**How to avoid:** Use `useActiveTooltipLabel` hook or Tooltip configuration for active state. Do not use `activeIndex` prop.

**Warning signs:** Bar hover states not working as expected.

---

### Pitfall 3: TanStack Query `new Date()` in QueryKey

**What goes wrong:** `queryKey: ['summary', new Date().toISOString()]` creates a unique key every render, causing infinite refetch loops.

**Why it happens:** `new Date()` is called at render time, creating a new string each time.

**How to avoid:** Read dates from Zustand store (stable references) and convert to ISO strings. The store holds stable Date objects.

**Warning signs:** Network tab shows API calls firing continuously.

---

### Pitfall 4: Missing `?from=` / `?to=` Server Validation

**What goes wrong:** Client sends malformed dates; server crashes or returns wrong data silently.

**Why it happens:** `c.req.query('from')` returns a string with no type checking by default.

**How to avoid:** Validate ISO date strings server-side before passing to aggregation: `new Date(from)` and check `isNaN(date.getTime())`. Return 400 for invalid params.

**Warning signs:** Charts show wrong data for custom date ranges.

---

### Pitfall 5: Zero-Cost Day Gaps in Time Series

**What goes wrong:** If the aggregation only returns days with activity, the chart X-axis has gaps and bars are mispositioned (day 1, day 3, day 7 — bar 2 appears where day 2 should be).

**Why it happens:** A simple `GROUP BY date` query returns only days with events.

**How to avoid:** Server-side aggregation must fill in missing dates with `{ date: '...', cost: 0 }`. The CONTEXT.md decision: "Zero-cost days: show as $0 bars."

**Warning signs:** Chart bars are bunched together instead of evenly spaced.

---

### Pitfall 6: `@custom-variant dark` Missing from index.css

**What goes wrong:** `dark:` Tailwind utilities compile but never activate, even when `.dark` class is on `<html>`. Phase 8 dark mode appears broken.

**Why it happens:** Tailwind v4 defaults to `prefers-color-scheme` for dark mode. Class-based toggle requires explicit `@custom-variant` override.

**How to avoid:** Add `@custom-variant dark (&:where(.dark, .dark *));` to `index.css` in Phase 4, even though the toggle itself ships in Phase 8. STATE.md records this as a known pitfall decision.

**Warning signs:** `dark:bg-slate-900` class has no effect when `.dark` is toggled.

---

## Code Examples

### API: Summary with Date Filter (Hono route update)

```typescript
// src/server/routes/api.ts — updated summary route
app.get('/summary', (c) => {
  const fromStr = c.req.query('from');
  const toStr = c.req.query('to');

  let costs = state.costs;

  if (fromStr) {
    const from = new Date(fromStr);
    if (!isNaN(from.getTime())) {
      costs = costs.filter(e => new Date(e.timestamp) >= from);
    }
  }
  if (toStr) {
    const to = new Date(toStr);
    if (!isNaN(to.getTime())) {
      costs = costs.filter(e => new Date(e.timestamp) <= to);
    }
  }

  const totalCost = costs.reduce((sum, e) => sum + e.costUsd, 0);
  const totalTokens = costs.reduce(
    (acc, e) => {
      if (!e.tokens) return acc;
      return {
        input: acc.input + e.tokens.input,
        output: acc.output + e.tokens.output,
        cacheCreation: acc.cacheCreation + e.tokens.cacheCreation,
        cacheRead: acc.cacheRead + e.tokens.cacheRead,
      };
    },
    { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
  );

  return c.json({ totalCost, totalTokens, eventCount: costs.length });
});
```

### API: Cost-Over-Time Endpoint (new)

```typescript
// src/server/routes/api.ts — new cost-over-time route
app.get('/cost-over-time', (c) => {
  const fromStr = c.req.query('from');
  const toStr = c.req.query('to');
  const bucket = c.req.query('bucket') ?? 'day'; // 'day' | 'week' | 'month'

  let costs = state.costs;
  if (fromStr) { const d = new Date(fromStr); if (!isNaN(d.getTime())) costs = costs.filter(e => new Date(e.timestamp) >= d); }
  if (toStr)   { const d = new Date(toStr);   if (!isNaN(d.getTime())) costs = costs.filter(e => new Date(e.timestamp) <= d); }

  // Group by bucket key
  const groups = new Map<string, number>();
  for (const e of costs) {
    const d = new Date(e.timestamp);
    let key: string;
    if (bucket === 'month') key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    else if (bucket === 'week') {
      // ISO week start (Monday)
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - day + 1);
      key = d.toISOString().slice(0, 10);
    } else {
      key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    groups.set(key, (groups.get(key) ?? 0) + e.costUsd);
  }

  // Fill zero-cost gaps between from and to
  const result: { date: string; cost: number }[] = [];
  if (fromStr && toStr) {
    const cursor = new Date(fromStr);
    const end = new Date(toStr);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      result.push({ date: key, cost: groups.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    // No range: return all groups sorted
    for (const [date, cost] of [...groups.entries()].sort()) {
      result.push({ date, cost });
    }
  }

  return c.json({ data: result, bucket });
});
```

### Frontend: react-day-picker Range Mode

```typescript
// Source: daypicker.dev/start + search-verified pattern
import { useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';

function RangePicker({ onSelect }: { onSelect: (range: DateRange | undefined) => void }) {
  const [selected, setSelected] = useState<DateRange | undefined>();
  return (
    <DayPicker
      mode="range"
      selected={selected}
      onSelect={(range) => { setSelected(range); onSelect(range); }}
    />
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-query` (v3 package name) | `@tanstack/react-query` v5 | 2023 (v5 stable) | Package rename + breaking API changes; v5 unified options object |
| Recharts v2 `activeIndex` prop | `useActiveTooltipLabel` hook | Recharts v3 (2024) | Direct prop removed; use hook or Tooltip config |
| Tailwind dark mode config in `tailwind.config.js` | `@custom-variant dark` in CSS | Tailwind v4 (2025) | No config file — all config is in CSS |
| Zustand `create<T>()(...)` with inline shallow | `create<T>()` + `useShallow` hook | Zustand v5 (2024) | `shallow` no longer accepted as second arg to hook |

**Deprecated/outdated:**
- `react-query` (old package name): replaced by `@tanstack/react-query`. Do NOT install `react-query`.
- Recharts `activeIndex` prop on `<Bar>`: removed in v3. Use `useActiveTooltipLabel`.
- Tailwind `darkMode: 'class'` in config: replaced by `@custom-variant dark` in CSS (v4+).

---

## Open Questions

1. **Trend indicator data source for stat card**
   - What we know: Period card needs "% change vs prior equivalent period"
   - What's unclear: The API currently doesn't return a prior-period total. A second query `?from=prior_from&to=prior_to` is needed, OR the endpoint adds `priorCost` to response.
   - Recommendation: Make two separate `useQuery` calls (current period + prior period) and compute delta client-side. Simpler than a new server field. Prior period = same duration ending at `from`.

2. **react-day-picker CSS variable theming conflict**
   - What we know: react-day-picker v9 ships `react-day-picker/style.css` which defines its own CSS variables. These may conflict with Tailwind v4 `@theme` variables.
   - What's unclear: Whether the import order matters, and whether overriding `--rdp-*` vars is sufficient for dark mode.
   - Recommendation: Import `react-day-picker/style.css` in the component file (not globally), then override relevant `--rdp-*` variables in a `dark:` block. Verify visually during implementation.

3. **`isNaN` vs `Number.isNaN` for date validation**
   - What we know: `isNaN(new Date('invalid').getTime())` returns `true` correctly.
   - What's unclear: No concern here — `Date.getTime()` returns a number, `isNaN()` works as expected for this case.
   - Recommendation: This is not an issue. Use `isNaN(new Date(str).getTime())` for server-side ISO date validation.

---

## Sources

### Primary (HIGH confidence)
- TanStack Query v5 official docs (tanstack.com/query/v5) — QueryClient, useQuery, queryKey patterns
- Tailwind CSS v4 official docs (tailwindcss.com/docs/dark-mode) — `@custom-variant dark` syntax verified
- Recharts official API (recharts.github.io/en-US/api/Bar/) — `radius` prop, XAxis `interval`/`minTickGap`
- Recharts GitHub wiki (3.0-migration-guide) — v3 breaking changes including `activeIndex` removal
- react-day-picker official docs (daypicker.dev/start) — installation, range mode, DateRange type
- Zustand GitHub (pmndrs/zustand) — v5 `create<T>()` TypeScript pattern, breaking changes

### Secondary (MEDIUM confidence)
- npm registry search results — version numbers: recharts@3.7.0, zustand@5.0.11, @tanstack/react-query@5.90.21, react-day-picker@9.14.0
- WebSearch: Recharts `fill="var(--color-*)"` pattern — confirmed working via SVG standard (CSS vars resolve in SVG fill)
- WebSearch: Zustand + TanStack Query architecture pattern — queryKey includes filter state, automatic refetch on change

### Tertiary (LOW confidence)
- Code examples for zero-gap filling in cost-over-time endpoint — derived from first principles; no official source for this specific pattern. Validate during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions confirmed via npm/GitHub, React 19 compatibility confirmed for all four libraries
- Architecture: HIGH — QueryClient setup and Zustand store patterns are from official docs; coordinated re-fetch via queryKey is documented TanStack Query pattern
- Pitfalls: HIGH (Tailwind dark mode, QueryKey stability) / MEDIUM (Recharts v3 breaking changes from wiki, not official changelog) — flagged where needed
- Code examples: MEDIUM — patterns are verified against official docs but specific endpoint code is synthesized from requirements

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable libraries; Recharts/TanStack Query release frequently but APIs are stable)
