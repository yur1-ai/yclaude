# Phase 5: Model & Project Breakdowns - Research

**Researched:** 2026-03-01
**Domain:** Recharts PieChart/donut, Hono aggregation API routes, React sortable tables
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Models page — donut chart**
- Donut shows top 5 models as slices; remaining models collapsed into a single "Other" slice
- Center of donut shows total cost for the selected period (e.g. "$14.32 est.")
- Unknown/missing model IDs get their own "Unknown" slice (cost is $0 but event count and tokens are real)
- Clicking a slice highlights it in the chart AND highlights the matching table row
- Highlight state exposed as `selectedModel: string | null` — Phase 6 will extend this to a "View sessions" action without refactoring

**Models page — companion table**
- Columns: Model name | Cost | % of total | Event count | Total tokens
- Total tokens = single column (input + output + cache); token breakdown (4 sub-types) shown in a tooltip on hover
- Default sort: cost descending; all columns sortable by click
- "Unknown" model has its own row
- All rows shown (no pagination or truncation)

**Projects page — layout**
- Table only, no chart (projects list can be large; donut with 10+ slices is unreadable)
- Visually distinct from Models page by design

**Projects page — table**
- Columns: Project name | Cost | % of total | Event count | Total tokens (same structure as Models table)
- Default sort: cost descending; all columns sortable
- All rows shown (no pagination or truncation)

**Project name decoding**
- Default: last path segment of `cwd` (e.g. `/Users/ishevtsov/ai-projects/yclaude` → `yclaude`)
- Automatic collision fallback: if two projects share the same last segment, show `parent/name` for both (e.g. `work/yclaude` vs `personal/yclaude`) — implemented in Phase 5 (trivial logic, not scope creep)
- Events with no `cwd` field (older Claude Code logs) → grouped as "Unknown project" row

**Shared table behavior**
- DateRangePicker shown in each page header (same as Overview) — global Zustand store keeps it in sync
- Both tables use the same sortable table component

**Empty & loading states**
- No data in selected range: empty grey donut ring + "No data for this period" message; table shows zero rows with message
- Loading: same "Loading..." placeholder box as Overview (not skeleton rows)

### Claude's Discretion
- Exact donut color palette for model slices
- Tooltip styling and positioning
- Token breakdown tooltip implementation details
- Error state handling for failed API requests

### Deferred Ideas (OUT OF SCOPE)
- Column customization (user-configurable show/hide columns) — future phase or v2.0
- "View sessions" action from highlighted model row — Phase 6 (selectedModel state is already the foundation)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANLT-04 | User can view estimated cost broken down by model as a donut chart with a companion sortable table | Recharts PieChart with innerRadius for donut; Pie `shape` prop for activeShape highlighting; `Cell` for per-slice colors; server-side `/api/v1/models` aggregation route; sortable table component |
| ANLT-05 | User can view per-project cost breakdown with human-readable project names derived from directory paths (not raw slugs) | Path segment decoding logic (`cwd.split('/').at(-1)`); collision detection using a frequency map; server-side `/api/v1/projects` aggregation route; same sortable table component |
</phase_requirements>

---

## Summary

Phase 5 adds two new analytics pages — Models and Projects — that replace "Coming soon" stubs already registered in `App.tsx`. The primary technical challenges are: (1) Recharts PieChart/donut configuration in v3.7 (which the project already uses), specifically the breaking changes to `activeIndex` and `activeShape`, (2) a shared sortable table component, and (3) two new Hono API routes (`/api/v1/models` and `/api/v1/projects`) that aggregate `state.costs` server-side.

All core dependencies are already installed (`recharts ^3.7.0`, `@tanstack/react-query ^5.90.21`, `zustand ^5.0.11`). No new packages are required. The `DateRangePicker`, Zustand store, and React Query hook pattern are already established and reusable as-is. The `CostEvent` type already carries `model: string | undefined`, `cwd: string | undefined`, `costUsd`, and `tokens` — all needed fields exist on the server state.

The most important pitfall is Recharts v3's removal of the `activeIndex` prop on `<Pie>`. The current approach for slice highlighting in v3 is through the `shape` prop with an `isActive` parameter, or through a local `useState` that drives a `Cell`-level fill/opacity. A parallel risk is the center-label bug (Recharts issue #5985) that affected v3.0 but was fixed in late June 2025 — the project is on v3.7 and should be safe, but a `<text>` element rendered inside `<PieChart>` via absolute SVG coordinates is the most reliable fallback.

**Primary recommendation:** Build the shared `SortableTable` component first (it is the dependency for both pages), then add server routes (`/api/v1/models`, `/api/v1/projects`), then wire up the hooks and pages. Use local `useState` for `selectedModel` tracking (driven by `<Pie onClick>`), applying a `Cell` fill and `opacity` approach for visual highlight rather than the now-deprecated `activeShape` prop.

---

## Standard Stack

### Core (all already installed — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.7.0 | `PieChart` + `Pie` + `Cell` for donut; already used in `CostBarChart` | Same package, no addition |
| @tanstack/react-query | ^5.90.21 | `useQuery` for `/api/v1/models` and `/api/v1/projects` | Already the data-fetching pattern |
| zustand | ^5.0.11 | `useDateRangeStore` for `from`/`to` date range sync | Already established global filter store |
| hono | ^4.12.3 | Two new GET routes on the existing `Hono` sub-router | All API routes use Hono |

### Supporting (no new installs)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react (useState) | ^19.2.4 | `selectedModel: string \| null` state | Local to Models page; lifted to component top |
| tailwindcss v4 CSS vars | ^4.2.1 | Donut slice colors via `--color-*` CSS vars in index.css | Per project rule: all chart colors use CSS vars |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS var palette for donut slices | hardcoded hex in Cell | CSS vars are the established project pattern — never hardcode hex |
| Local `useState` for selectedModel | Zustand store | Local state is correct; Phase 6 can promote to store if cross-page access needed |
| SVG `<text>` for center label | Recharts `<Label position="center">` | Both work on v3.7; SVG text is less fragile; either is fine |

**Installation:** No new packages needed. All dependencies are already in `web/package.json`.

---

## Architecture Patterns

### Recommended File Changes

```
web/src/
├── components/
│   └── SortableTable.tsx        # NEW — shared sortable table used by Models + Projects
├── hooks/
│   ├── useModels.ts             # NEW — useQuery wrapping /api/v1/models
│   └── useProjects.ts           # NEW — useQuery wrapping /api/v1/projects
├── pages/
│   ├── Models.tsx               # REPLACE stub — donut + table
│   └── Projects.tsx             # REPLACE stub — table only
└── index.css                    # ADD donut color CSS vars

src/server/routes/
└── api.ts                       # ADD /models and /projects routes
```

### Pattern 1: Hono Aggregation Route (models)

**What:** Aggregate `state.costs` by `event.model`, emit sorted array with totals per model.
**When to use:** All aggregation is server-side (established project rule from STATE.md).

```typescript
// Source: established pattern from /api/v1/summary in src/server/routes/api.ts

// GET /api/v1/models
app.get('/models', (c) => {
  const fromStr = c.req.query('from');
  const toStr = c.req.query('to');
  const from = parseDate(fromStr);
  const to = parseDate(toStr);
  if (from === 'invalid') return c.json({ error: "Invalid 'from' date" }, 400);
  if (to === 'invalid') return c.json({ error: "Invalid 'to' date" }, 400);

  let costs = state.costs;
  if (from) costs = costs.filter((e) => new Date(e.timestamp) >= from);
  if (to) costs = costs.filter((e) => new Date(e.timestamp) <= to);

  // Aggregate by model — undefined model goes to 'Unknown'
  const groups = new Map<string, {
    costUsd: number;
    eventCount: number;
    tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
  }>();

  for (const e of costs) {
    const key = e.model ?? 'Unknown';
    const existing = groups.get(key) ?? {
      costUsd: 0, eventCount: 0,
      tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
    };
    existing.costUsd += e.costUsd;
    existing.eventCount += 1;
    if (e.tokens) {
      existing.tokens.input += e.tokens.input;
      existing.tokens.output += e.tokens.output;
      existing.tokens.cacheCreation += e.tokens.cacheCreation;
      existing.tokens.cacheRead += e.tokens.cacheRead;
    }
    groups.set(key, existing);
  }

  // Sort by costUsd descending (server-side default; client can re-sort)
  const rows = Array.from(groups.entries())
    .map(([model, data]) => ({ model, ...data }))
    .sort((a, b) => b.costUsd - a.costUsd);

  const totalCost = rows.reduce((s, r) => s + r.costUsd, 0);

  return c.json({ rows, totalCost });
});
```

### Pattern 2: Project Name Decoding with Collision Detection

**What:** Extract human-readable project name from `cwd` path; if two cwds share the same last segment, show `parent/name` for both.
**When to use:** Server-side in `/api/v1/projects` route before returning JSON.

```typescript
// Source: user decision in CONTEXT.md

function decodeProjectName(cwd: string): string {
  const parts = cwd.split('/').filter(Boolean);
  // Use last segment as default name
  return parts.at(-1) ?? cwd;
}

// Collision detection: pass cwd[] through frequency map first
function assignProjectNames(cwds: string[]): Map<string, string> {
  // Count how many unique cwds share each last segment
  const lastSegmentFreq = new Map<string, number>();
  for (const cwd of cwds) {
    const last = cwd.split('/').filter(Boolean).at(-1) ?? cwd;
    lastSegmentFreq.set(last, (lastSegmentFreq.get(last) ?? 0) + 1);
  }

  const result = new Map<string, string>();
  for (const cwd of cwds) {
    const parts = cwd.split('/').filter(Boolean);
    const last = parts.at(-1) ?? cwd;
    if ((lastSegmentFreq.get(last) ?? 0) > 1) {
      // Collision: show parent/name
      const parent = parts.at(-2);
      result.set(cwd, parent ? `${parent}/${last}` : last);
    } else {
      result.set(cwd, last);
    }
  }
  return result;
}
```

### Pattern 3: Recharts Donut Chart with Slice Highlighting (v3 compatible)

**What:** PieChart with `innerRadius` for donut shape; per-slice colors via `Cell`; click-to-highlight via local `useState` and Cell opacity.
**When to use:** Models page; Recharts v3.7 is already installed.

```typescript
// Source: Recharts v3 API docs (recharts.github.io/en-US/api/Pie/)
// Note: activeIndex prop was REMOVED in v3. Use onClick + useState + Cell instead.

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

const DONUT_COLORS = [
  'var(--color-donut-1)',
  'var(--color-donut-2)',
  'var(--color-donut-3)',
  'var(--color-donut-4)',
  'var(--color-donut-5)',
  'var(--color-donut-other)',
];

interface DonutDatum {
  model: string;      // display name
  costUsd: number;    // value
}

function ModelDonut({
  data,
  totalCost,
  selectedModel,
  onSelect,
}: {
  data: DonutDatum[];
  totalCost: number;
  selectedModel: string | null;
  onSelect: (model: string | null) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="costUsd"
          nameKey="model"
          innerRadius={80}
          outerRadius={120}
          onClick={(entry) => {
            // Toggle: clicking same slice deselects
            onSelect(selectedModel === entry.model ? null : entry.model);
          }}
          cx="50%"
          cy="50%"
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.model}
              fill={DONUT_COLORS[index % DONUT_COLORS.length]}
              // Dim non-selected slices when a selection is active
              opacity={selectedModel && selectedModel !== entry.model ? 0.3 : 1}
            />
          ))}
        </Pie>
        {/* Center label: render as SVG text — most reliable approach in v3 */}
        {/* See Recharts issue #5985 — fixed in v3 post-June 2025, but SVG text is safest */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold fill-slate-900"
        >
          {`$${totalCost.toFixed(2)} est.`}
        </text>
        <Tooltip
          formatter={(value: number) => [`$${value.toFixed(4)} est.`, 'Cost']}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 4: Sortable Table Component

**What:** Reusable `SortableTable<T>` component with typed columns, click-to-sort header, ascending/descending toggle.
**When to use:** Both Models page and Projects page share identical sort behavior.

```typescript
// Source: project pattern — no external library; inline sort logic

type SortDir = 'asc' | 'desc';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

function SortableTable<T extends Record<string, unknown>>({
  columns,
  rows,
  defaultSortKey,
  defaultSortDir = 'desc',
  highlightKey,
  highlightValue,
}: {
  columns: Column<T>[];
  rows: T[];
  defaultSortKey: keyof T;
  defaultSortDir?: SortDir;
  highlightKey?: keyof T;    // e.g. 'model'
  highlightValue?: string | null;  // matches selectedModel
}) {
  const [sortKey, setSortKey] = useState<keyof T>(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // ... render thead + tbody
}
```

### Pattern 5: React Query Hook for New Routes

**What:** Mirror of existing `useSummary` — thin hook over `useQuery` consuming Zustand date range.
**When to use:** `useModels` and `useProjects` both follow this exact pattern.

```typescript
// Source: web/src/hooks/useSummary.ts — same pattern

import { useQuery } from '@tanstack/react-query';
import { useDateRangeStore } from '../store/useDateRangeStore';

export interface ModelRow {
  model: string;
  costUsd: number;
  eventCount: number;
  tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
}

export interface ModelsData {
  rows: ModelRow[];
  totalCost: number;
}

export function useModels() {
  const { from, to } = useDateRangeStore();
  const params = new URLSearchParams();
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());

  return useQuery<ModelsData>({
    queryKey: ['models', from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/v1/models?${params}`);
      if (!res.ok) throw new Error('Failed to fetch models');
      return res.json() as Promise<ModelsData>;
    },
  });
}
```

### Pattern 6: Top-5 + "Other" Bucketing for Donut

**What:** Server returns ALL models sorted by cost. Client (or server) collapses ranks 6+ into an "Other" bucket.
**When to use:** Models donut only; table shows all rows.

```typescript
// Client-side bucketing from the full row list
function toDonutData(rows: ModelRow[]): { model: string; costUsd: number }[] {
  if (rows.length <= 5) return rows.map(r => ({ model: r.model, costUsd: r.costUsd }));
  const top5 = rows.slice(0, 5);
  const otherCost = rows.slice(5).reduce((s, r) => s + r.costUsd, 0);
  return [
    ...top5.map(r => ({ model: r.model, costUsd: r.costUsd })),
    { model: 'Other', costUsd: otherCost },
  ];
}
```

**Key decision:** "Other" is NOT selectable — `onSelect` handler returns early if `entry.model === 'Other'`.

### Pattern 7: CSS Variable Palette for Donut Colors

**What:** Extend `web/src/index.css` with donut slice color vars, following the same pattern as `--color-bar` and `--color-grid`.
**When to use:** All chart colors use CSS vars per project rule in STATE.md.

```css
/* web/src/index.css — add to @theme block */
@theme {
  /* ... existing vars ... */

  /* Donut chart — model slices (top 5) + other */
  --color-donut-1: oklch(0.58 0.20 200);   /* teal — matches --color-bar */
  --color-donut-2: oklch(0.60 0.18 250);   /* blue */
  --color-donut-3: oklch(0.60 0.18 160);   /* green */
  --color-donut-4: oklch(0.65 0.18 70);    /* amber */
  --color-donut-5: oklch(0.60 0.18 330);   /* purple */
  --color-donut-other: oklch(0.80 0.00 0); /* neutral grey */
}
```

### Anti-Patterns to Avoid

- **Using `activeIndex` prop on `<Pie>`**: Removed in Recharts v3. Use `onClick` + `useState` + `Cell` opacity instead.
- **Using `activeShape`/`inactiveShape` props**: Deprecated in Recharts v3.5+. Replaced by the `shape` prop with `isActive` parameter, but `Cell` opacity is simpler for this use case.
- **Hardcoding hex colors in Cell fill**: Project rule — always use `var(--color-*)` CSS vars.
- **Fetching `CostEvent[]` to the frontend**: All aggregation is server-side (established rule in STATE.md).
- **Using local Date methods for timestamp comparison**: Must use UTC methods — `new Date(e.timestamp) >= from` (not `getDay()`/`setDate()`), matching existing API routes.
- **Deriving "% of total" on the server**: Compute it on the client from `row.costUsd / totalCost * 100` — this avoids floating-point drift and is trivial.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Donut chart rendering | Custom SVG arcs | `recharts` `PieChart` + `Pie` + `innerRadius` | Already installed; handles arc math, responsive sizing, tooltip |
| Data fetching + cache invalidation | Manual fetch + useState | `@tanstack/react-query` `useQuery` with date-keyed `queryKey` | Already established — auto-refetch when date range changes |
| Global date filter sync | URL params or prop drilling | `useDateRangeStore` (Zustand) | Already wired; all pages consume the same store |
| Sort logic | Re-implementing per-page | Shared `SortableTable<T>` component | Both pages are identical in sort behavior |

**Key insight:** This phase adds zero new dependencies. The hardest parts (date range picker, query invalidation, Hono routing) are already solved. The only genuine new work is (1) two Hono routes, (2) the `SortableTable` component, (3) the donut chart component, and (4) filling in the page stubs.

---

## Common Pitfalls

### Pitfall 1: Recharts v3 `activeIndex` Removal

**What goes wrong:** Developer writes `<Pie activeIndex={selectedIdx}>` — TypeScript may not catch this; the prop silently does nothing in v3.
**Why it happens:** All online tutorials and community examples show v2 patterns. The v3 migration guide exists but is not linked prominently.
**How to avoid:** Use `onClick` on `<Pie>` to get the clicked entry, call `onSelect(entry.model)`, apply opacity via `<Cell>` directly.
**Warning signs:** Clicking a slice appears to have no visual effect on the chart.

### Pitfall 2: Center Label Not Rendering in PieChart

**What goes wrong:** Using `<Label position="center" value="$14.32">` inside `<Pie>` renders nothing.
**Why it happens:** Recharts issue #5985 — the Label component failed to read viewBox from context in v3.0. Fixed in the post-June-2025 build (project is on v3.7.0, so likely safe).
**How to avoid:** Use an SVG `<text>` element directly inside `<PieChart>` with absolute percentage coordinates (`x="50%" y="50%"` + `textAnchor="middle"` + `dominantBaseline="middle"`). This is reliable across all Recharts v3 versions.
**Warning signs:** Empty center on first render, no errors in console.

### Pitfall 3: `queryKey` Stale Date Reference

**What goes wrong:** `queryKey: ['models', from, to]` — passing `Date` objects directly. Two `Date` instances with the same time are not reference-equal, causing infinite re-fetch loops.
**Why it happens:** React Query compares queryKey entries by reference for objects.
**How to avoid:** Serialize: `queryKey: ['models', from?.toISOString(), to?.toISOString()]` — exactly as in `useSummary.ts`.
**Warning signs:** Network tab shows repeated `/api/v1/models` requests in a rapid loop.

### Pitfall 4: "Other" Slice Appearing in Table

**What goes wrong:** The "Other" bucket rendered in the donut leaks into the table, creating a confusing row that isn't a real model.
**Why it happens:** Sharing the same data array for both chart and table.
**How to avoid:** The API returns `rows` (all models). The donut consumes a `toDonutData(rows)` transformation; the table renders `rows` directly. These are separate data shapes.
**Warning signs:** A row named "Other" appears in the sortable table.

### Pitfall 5: Project Name Collision Detection Run on Frontend

**What goes wrong:** Collision detection (deciding when to show `parent/name`) runs in the React component on every render.
**Why it happens:** Temptation to keep the server route simple by returning raw `cwd` values and decoding in the component.
**How to avoid:** Decode project names server-side in `/api/v1/projects`. The server has the full list of all unique `cwd` values, making collision detection O(n) with a simple frequency map. Return `{ displayName, cwd, costUsd, ... }` from the API.
**Warning signs:** The component imports `path` or does string manipulation on `cwd` values received from the API.

### Pitfall 6: "Unknown" Row Appearing Before Real Models in Table

**What goes wrong:** "Unknown" (no cwd or no model) appears at the top of the table despite having $0 cost.
**Why it happens:** Alphabetic or insertion-order sort instead of cost-descending default.
**How to avoid:** Default sort is cost descending (established in decisions). "Unknown" with $0 cost naturally falls to the bottom. Token-only "Unknown" model rows (cost = $0, real token counts) will also sort to the bottom correctly.
**Warning signs:** "Unknown" row is first or second in the initial render.

---

## Code Examples

### Full `/api/v1/models` Route Shape

```typescript
// Source: established pattern in src/server/routes/api.ts

// Response shape from GET /api/v1/models
{
  rows: Array<{
    model: string;           // e.g. "claude-sonnet-4-5" or "Unknown"
    costUsd: number;
    eventCount: number;
    tokens: {
      input: number;
      output: number;
      cacheCreation: number;
      cacheRead: number;
    };
  }>;
  totalCost: number;
}
```

### Full `/api/v1/projects` Route Shape

```typescript
// Source: established pattern in src/server/routes/api.ts

// Response shape from GET /api/v1/projects
{
  rows: Array<{
    displayName: string;     // human-readable: "yclaude" or "work/yclaude"
    cwd: string | null;      // original cwd (null for "Unknown project" row)
    costUsd: number;
    eventCount: number;
    tokens: {
      input: number;
      output: number;
      cacheCreation: number;
      cacheRead: number;
    };
  }>;
  totalCost: number;
}
```

### Token Total for Table Column

```typescript
// "Total tokens" column = sum of all 4 sub-types
function totalTokens(t: { input: number; output: number; cacheCreation: number; cacheRead: number }): number {
  return t.input + t.output + t.cacheCreation + t.cacheRead;
}
```

### Token Breakdown Tooltip (hover)

```typescript
// Reuse existing TokenBreakdown component from web/src/components/TokenBreakdown.tsx
// OR build an inline Tailwind tooltip — Claude's discretion on implementation
// The 4 sub-type values are already on each row from the API

// Tooltip trigger pattern (CSS-only, no library needed):
<span className="relative group cursor-help underline decoration-dotted">
  {totalTokens(row.tokens).toLocaleString()}
  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block
                   rounded bg-slate-800 text-white text-xs p-2 whitespace-nowrap z-10">
    Input: {row.tokens.input.toLocaleString()}<br />
    Output: {row.tokens.output.toLocaleString()}<br />
    Cache write: {row.tokens.cacheCreation.toLocaleString()}<br />
    Cache read: {row.tokens.cacheRead.toLocaleString()}
  </span>
</span>
```

### "% of total" Column Computation

```typescript
// Source: derived from project pattern — computed client-side
const pct = totalCost > 0 ? (row.costUsd / totalCost * 100).toFixed(1) : '0.0';
// Rendered as: "32.4%"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<Pie activeIndex={n}>` | `onClick` + `useState` + `Cell` opacity | Recharts v3.0 (2024) | Must not use old pattern — prop removed |
| `<Pie activeShape={...}>` `<Pie inactiveShape={...}>` | `<Pie shape={(props) => <Sector isActive={props.isActive} ...>}` | Recharts v3.5 | Deprecated; `Cell` opacity is simpler for static selection |
| `<Label position="center">` in `<Pie>` | SVG `<text x="50%" y="50%">` inside `<PieChart>` | Recharts v3.7 (bug fixed) | Either works on v3.7, SVG text is the safer choice |

**Deprecated/outdated:**
- `activeIndex` prop on `<Pie>`: Removed in v3.0. Use `onClick` handler and maintain selection in `useState`.
- `blendStroke` prop: Removed in v3.0. Use `stroke="none"` instead.

---

## Open Questions

1. **Where does the `<Pie onClick>` payload contain the model name?**
   - What we know: The `onClick` callback receives the `PieSectorDataItem` entry, which is the data item passed via the `data` prop on `<Pie>`. So `entry.model` will contain the model string if the data array has `model` as a key.
   - What's unclear: Whether TypeScript types for the onClick payload are accurate in v3.7.0.
   - Recommendation: Cast via `(entry: { model: string }) => onSelect(entry.model)` or use `nameKey` accessor. Test with a console.log during dev.

2. **Should "Other" slice be highlightable?**
   - What we know: The user decision says "Other" bucket is in the donut; the "Specifics" section says Claude's discretion on exact behavior.
   - What's unclear: If a user clicks "Other," should all other rows in the table highlight, or nothing?
   - Recommendation: Make "Other" non-selectable (early return in onClick when `entry.model === 'Other'`). Simpler and avoids a complex "highlight multiple rows" case.

---

## Sources

### Primary (HIGH confidence)

- Recharts official API docs (recharts.github.io/en-US/api/Pie/) — Pie props: `innerRadius`, `outerRadius`, `onClick`, `Cell`, `shape`, `isActive`
- Recharts 3.0 migration guide (github.com/recharts/recharts/wiki/3.0-migration-guide) — confirmed `activeIndex` removal, `blendStroke` removal
- Recharts issue #5985 (github.com/recharts/recharts/issues/5985) — center label bug confirmed fixed in PR #5987 (post-June 2025; v3.7 is safe)
- Project source: `web/src/hooks/useSummary.ts` — established hook pattern (React Query + Zustand + ISOString queryKey)
- Project source: `src/server/routes/api.ts` — established Hono route pattern (parseDate, filter, aggregate)
- Project source: `src/cost/types.ts` — `CostEvent` has `model?: string`, `cwd?: string`, `costUsd`, `tokens`
- Project source: `web/src/index.css` — CSS var pattern for chart colors (`--color-bar`, `--color-grid`)
- Project STATE.md — "All chart colors use `var(--color-*)` CSS vars", "All aggregation is server-side", UTC date methods rule

### Secondary (MEDIUM confidence)

- Recharts activeIndex guide (recharts.github.io/en-US/guide/activeIndex/) — `Tooltip defaultIndex`, `trigger="click"` pattern for v3 interaction
- shadcn patterns (shadcn.io/patterns/chart-pie-donut-active) — active sector expansion using `activeShape` (v2-era pattern, but confirms visual expansion approach)

### Tertiary (LOW confidence)

- Web search results re: `shape` prop with `isActive` replacing `activeShape` in v3.5 — mentioned in multiple sources but not verified against official Recharts changelog; may be a future/partial deprecation rather than a complete removal in v3.7

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed; no new packages; verified against `web/package.json` and `package.json`
- Architecture: HIGH — API route patterns verified against existing `api.ts`; hook patterns verified against existing `useSummary.ts`; Recharts donut verified against official docs
- Pitfalls: HIGH — `activeIndex` removal confirmed in official migration guide; center label bug confirmed in official issue tracker with fix status; queryKey pattern verified against project source
- Donut color palette: HIGH — CSS var pattern confirmed in `index.css` and STATE.md; specific oklch values are Claude's discretion (user decision)

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (Recharts is actively developed; stable API for v3.7 but worth checking release notes before planning if >30 days pass)
