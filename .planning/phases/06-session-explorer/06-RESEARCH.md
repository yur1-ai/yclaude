# Phase 6: Session Explorer - Research

**Researched:** 2026-03-01
**Domain:** React/Hono server-side pagination + Recharts line chart + hash-router nested routes
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Session detail navigation
- Opens as a separate route: `/sessions/:id`
- Deep-linkable; browser back returns to list
- Requires adding a new route to App.tsx (hash router)

#### Session list columns and behavior
- Columns: project name, model, estimated cost, timestamp, duration — all sortable
- Project filter: dropdown select (single project or "All") that compounds with the global date range picker
- Server-side pagination: 50 sessions per page, prev/next page buttons
- Missing `durationMs`: display em dash `—`

#### Multi-model sessions
- When a session uses more than one model, the model column shows "Mixed"
- "Mixed" has a hover tooltip listing all distinct models used in that session

#### Session detail page layout
- Layout order: summary header → per-turn token table → cumulative cost timeline
- Summary header: total cost, total tokens (breakdown), project name, model (or "Mixed"), duration, git branch if present
- Per-turn table: one row per turn, columns = input / output / cache creation / cache read tokens + turn cost
- Cumulative cost timeline: running total line chart (cost accumulates turn-by-turn along x-axis)

#### Cumulative cost timeline
- Running total line chart — each point = total cost so far through that turn
- X-axis: turn number; Y-axis: cumulative cost in USD
- Uses Recharts (already installed and used on Models page)

### Claude's Discretion
- Loading skeleton / loading state design
- Exact chart sizing and axis label formatting
- Error state when session ID is not found (404-style)
- How turns are ordered if timestamps are identical (stable sort by index)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SESS-01 | User can browse a paginated session list sortable by project, model, estimated cost, timestamp, and duration — filterable by project | Server-side aggregation pattern from `/api/v1/projects`; `SortableTable<T>` reuse; new `/api/v1/sessions` endpoint with `?page`, `?project`, `?from`, `?to` params |
| SESS-02 | User can open a session detail view showing per-turn token breakdown (input / output / cache creation / cache read) and cumulative cost timeline — no conversation text exposed | New `/api/v1/sessions/:id` endpoint returning per-turn data from `state.costs` filtered by `sessionId`; `SortableTable<T>` for turn table; Recharts `LineChart` + `ResponsiveContainer` for cumulative timeline |
</phase_requirements>

---

## Summary

Phase 6 adds a Session Explorer to the existing yclaude dashboard. The work is anchored in patterns already established: a React Query hook per page, a Hono route per resource, and `SortableTable<T>` for tabular data. The primary new technical concerns are (1) server-side pagination in the sessions list endpoint, (2) a project-filter dropdown wired alongside the existing global date range store, and (3) a Recharts `LineChart` (not `BarChart`) for the cumulative cost timeline on the detail page.

All data is already available in `state.costs` (an array of `CostEvent`). Sessions are formed by grouping `CostEvent[]` by `sessionId`. The existing stub `GET /api/v1/sessions` returns `[]` and must be replaced; `GET /api/v1/sessions/:id` is a new route. No new npm packages are required: Recharts is already installed (`recharts ^3.7.0`), React Router supports nested params in hash router, and `assignProjectNames()` can be reused as-is.

The session detail page adds a new child route `sessions/:id` to the existing layout router. This requires one addition to `App.tsx` (new child route entry) and one new page component `SessionDetail.tsx`. The cumulative cost timeline requires computing a running total from the sorted turn array server-side, returned as `{ turn: number; cumulativeCost: number }[]`.

**Primary recommendation:** Build in four tasks — (1) sessions list API endpoint with pagination+filter, (2) session detail API endpoint with per-turn breakdown, (3) Sessions list page + `useSessions` hook, (4) SessionDetail page + `useSessionDetail` hook + cumulative chart.

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Hono | ^4.12.3 | Server-side API route for sessions | Already the project server framework |
| @tanstack/react-query | ^5.90.21 | `useSessions` / `useSessionDetail` hooks | Established pattern for every data-fetching hook in this project |
| react-router | ^7.13.1 | `sessions/:id` nested route; `useParams()` | Already used; hash router needs one route addition |
| recharts | ^3.7.0 | `LineChart` for cumulative cost timeline | Already installed; `LineChart`/`Line` from recharts — same as existing `PieChart` usage |
| zustand | ^5.0.11 | `useDateRangeStore` for `from`/`to` filter | Already wired; session list hook reads same store |
| TypeScript | ^5.9.3 | Type-safe row shapes; `SessionRow extends Record<string, unknown>` | Project-wide |

### Supporting (existing components — reuse, don't rebuild)

| Component | File | Purpose | When to Use |
|-----------|------|---------|-------------|
| `SortableTable<T>` | `web/src/components/SortableTable.tsx` | Sortable table for session list AND per-turn detail table | Both tables — no modifications needed |
| `DateRangePicker` | `web/src/components/DateRangePicker.tsx` | Global date range filter | Render in session list header, same as Models/Projects pages |
| `assignProjectNames()` | `src/server/routes/api.ts` | cwd → display name | Call in `/api/v1/sessions` to produce `displayName` field |
| `parseDate()` | `src/server/routes/api.ts` | Parse `?from`/`?to` query params | Use in both new routes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server-side pagination (chosen) | Client-side pagination | Client-side simpler but violates SESS-01 requirement; also fails for 500+ sessions |
| Recharts LineChart (chosen) | Custom SVG path | Custom path requires manual scale math; LineChart is already in the bundle and project uses it |
| URL params for project filter | Zustand local state | URL params make links shareable — deferred to later; Zustand aligns with existing pattern |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure for Phase 6

```
src/server/routes/
└── api.ts                     # Add /sessions and /sessions/:id routes here (existing file)

web/src/
├── hooks/
│   ├── useSessions.ts         # New: sessions list + pagination + project filter
│   └── useSessionDetail.ts   # New: single session detail with per-turn turns[]
├── pages/
│   ├── Sessions.tsx           # Replace stub: session list page
│   └── SessionDetail.tsx      # New: session detail page
└── App.tsx                    # Add { path: 'sessions/:id', element: <SessionDetail /> }
```

### Pattern 1: Server-side Pagination in Hono

**What:** The sessions list endpoint accepts `?page=N` (1-indexed, default 1) and applies a 50-item slice after filtering and grouping. It returns `{ sessions, total, page, pageSize }`.
**When to use:** Any list endpoint where the total count can exceed what renders comfortably in a table.

```typescript
// Source: established pattern from existing /api/v1/projects route in src/server/routes/api.ts
app.get('/sessions', (c) => {
  const fromStr = c.req.query('from');
  const toStr = c.req.query('to');
  const projectFilter = c.req.query('project') ?? null; // cwd string or null = all
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10));
  const PAGE_SIZE = 50;

  const from = parseDate(fromStr);
  const to = parseDate(toStr);
  if (from === 'invalid') return c.json({ error: "Invalid 'from' date" }, 400);
  if (to === 'invalid') return c.json({ error: "Invalid 'to' date" }, 400);

  let costs = state.costs;
  if (from) costs = costs.filter((e) => new Date(e.timestamp) >= from);
  if (to)   costs = costs.filter((e) => new Date(e.timestamp) <= to);
  if (projectFilter) costs = costs.filter((e) => (e.cwd ?? null) === projectFilter);

  // Group by sessionId → build SessionRow objects
  const sessionMap = new Map<string, SessionRow>();
  for (const e of costs) {
    const sid = e.sessionId;
    // ... aggregate cost, tokens, models, duration, timestamp
  }

  const allSessions = Array.from(sessionMap.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = allSessions.length;
  const sessions = allSessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return c.json({ sessions, total, page, pageSize: PAGE_SIZE });
});
```

### Pattern 2: Session Aggregation from CostEvent[]

**What:** Group `state.costs` by `sessionId` to produce session-level rows. Each session computes: total cost (sum of `costUsd`), total tokens (sum across all events), distinct models array (for "Mixed" logic), earliest timestamp, and duration from `durationMs` field.
**When to use:** `/api/v1/sessions` list endpoint.

```typescript
// Source: code review of src/cost/types.ts and src/parser/types.ts
interface SessionRow extends Record<string, unknown> {
  sessionId: string;
  displayName: string;      // from assignProjectNames()
  cwd: string | null;
  model: string;            // single model name or "Mixed"
  models: string[];         // all distinct models (for tooltip)
  costUsd: number;
  tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
  timestamp: string;        // earliest event timestamp in the session
  durationMs: number | null; // null if no durationMs events present
}
```

**Key rule:** A session's `timestamp` is the earliest `e.timestamp` across all events in the session. `durationMs` comes from `e.durationMs` (present on `system/turn_duration` type events); if absent from all events in a session, set to `null` and display em dash `—`.

### Pattern 3: Per-Turn Detail from /sessions/:id

**What:** Return all `CostEvent[]` for a given `sessionId`, sorted by timestamp (then by array index for stable tie-breaking). Each event becomes a "turn" row with token breakdown and cost. Also compute the running cumulative cost array for the chart.
**When to use:** `/api/v1/sessions/:id` endpoint.

```typescript
// Source: analysis of src/cost/types.ts / src/parser/types.ts
app.get('/sessions/:id', (c) => {
  const sessionId = c.req.param('id');
  const turns = state.costs
    .filter((e) => e.sessionId === sessionId && e.tokens)  // only token-bearing events
    .sort((a, b) => {
      const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return diff !== 0 ? diff : 0; // stable: original array order preserved by .filter
    });

  if (turns.length === 0) return c.json({ error: 'Session not found' }, 404);

  let cumulative = 0;
  const turnRows = turns.map((e, i) => {
    cumulative += e.costUsd;
    return {
      turn: i + 1,
      model: e.model ?? 'Unknown',
      tokens: e.tokens,
      costUsd: e.costUsd,
      cumulativeCost: cumulative,
      timestamp: e.timestamp,
    };
  });

  // Summary header data
  const allEvents = state.costs.filter((e) => e.sessionId === sessionId);
  const totalCost = allEvents.reduce((s, e) => s + e.costUsd, 0);
  // ... build summary tokens, models, cwd, gitBranch, durationMs

  return c.json({ summary: { ... }, turns: turnRows });
});
```

### Pattern 4: Recharts LineChart for Cumulative Cost

**What:** `LineChart` with `ResponsiveContainer`, `XAxis` keyed to `turn` number, `YAxis` formatted as `$X.XXXX`, `Tooltip` showing cumulative cost. Data comes from `turns[]` already computed server-side.
**When to use:** SessionDetail cumulative cost timeline card.

```typescript
// Source: Recharts usage in web/src/pages/Models.tsx and web/src/components/CostBarChart.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={220}>
  <LineChart data={turns} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid)" vertical={false} />
    <XAxis
      dataKey="turn"
      tickLine={false}
      axisLine={false}
      tick={{ fontSize: 12, fill: 'oklch(0.55 0 0)' }}
      label={{ value: 'Turn', position: 'insideBottom', offset: -2 }}
    />
    <YAxis
      tickFormatter={(v: number) => `$${v.toFixed(4)}`}
      tickLine={false}
      axisLine={false}
      width={68}
      tick={{ fontSize: 12, fill: 'oklch(0.55 0 0)' }}
    />
    <Tooltip
      formatter={(value: number | undefined) =>
        value != null ? [`$${value.toFixed(6)} est.`, 'Cumulative cost'] : ['—', 'Cumulative cost']
      }
    />
    <Line
      type="monotone"
      dataKey="cumulativeCost"
      stroke="var(--color-bar)"
      dot={false}
      strokeWidth={2}
    />
  </LineChart>
</ResponsiveContainer>
```

### Pattern 5: React Query Hook with Pagination State

**What:** `useSessions` hook manages `page` state locally, reads `from`/`to` from `useDateRangeStore`, accepts a `projectFilter` prop. `queryKey` includes all three so React Query re-fetches on any change.
**When to use:** Sessions list page.

```typescript
// Source: established pattern from web/src/hooks/useModels.ts
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDateRangeStore } from '../store/useDateRangeStore';

export function useSessions(projectFilter: string | null = null) {
  const { from, to } = useDateRangeStore();
  const [page, setPage] = useState(1);

  // Reset to page 1 when filters change — critical to avoid stale page
  // Reset is managed by the calling component via key prop or useEffect

  const params = new URLSearchParams();
  if (from) params.set('from', from.toISOString());
  if (to)   params.set('to', to.toISOString());
  if (projectFilter) params.set('project', projectFilter);
  params.set('page', String(page));

  const query = useQuery<SessionsData>({
    queryKey: ['sessions', from?.toISOString(), to?.toISOString(), projectFilter, page],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sessions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch sessions');
      return res.json() as Promise<SessionsData>;
    },
  });

  return { ...query, page, setPage };
}
```

### Pattern 6: Hash Router Nested Route for SessionDetail

**What:** Add `sessions/:id` as a sibling child route under the layout route (same level as `sessions`).
**When to use:** Adding SessionDetail page navigation.

```typescript
// Source: web/src/App.tsx — existing createHashRouter pattern
const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Overview /> },
      { path: 'models', element: <Models /> },
      { path: 'projects', element: <Projects /> },
      { path: 'sessions', element: <Sessions /> },
      { path: 'sessions/:id', element: <SessionDetail /> }, // ADD THIS
    ],
  },
]);
```

In `SessionDetail.tsx`, retrieve the session ID with `useParams()`:
```typescript
import { useParams } from 'react-router';
const { id } = useParams<{ id: string }>();
```

### Pattern 7: "Mixed" Model Tooltip

**What:** When a session has `models.length > 1`, display "Mixed" in the model cell with a CSS-only hover tooltip listing all model names. Follows the existing token tooltip pattern from Models/Projects pages.
**When to use:** Session list model column render function.

```typescript
// Source: established pattern from web/src/pages/Models.tsx token tooltip
render: (row) => {
  if (row.models.length <= 1) return <span>{row.model}</span>;
  return (
    <span className="relative group cursor-help underline decoration-dotted">
      Mixed
      <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block
                       rounded bg-slate-800 text-white text-xs p-2 whitespace-nowrap z-10">
        {row.models.join(', ')}
      </span>
    </span>
  );
}
```

### Anti-Patterns to Avoid

- **Sending raw CostEvent[] to the frontend:** The session detail endpoint must return only metadata/tokens/costs — no conversation text. Filter by `e.tokens !== undefined` to include only token-bearing (assistant) events in the turn table. Never include `message` field in API responses.
- **Client-side pagination of the full list:** The requirement specifies server-side pagination (50/page). Do not fetch all sessions and slice in React.
- **Using `new Date()` in queryKey:** Causes infinite re-fetch loops. Use `from?.toISOString()` and `to?.toISOString()` (established project rule from STATE.md).
- **Sorting with local `getDay()`:** Use UTC methods throughout — `new Date(e.timestamp).getTime()` for comparisons is safe; never `getDate()` with ISO strings.
- **Row key using session data field:** `SortableTable` uses array index as row key (established project pattern). Do not change this.
- **Hardcoding hex colors in Recharts:** Always use `var(--color-*)` CSS vars (existing project rule from STATE.md).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sortable table | Custom sort + render logic | `SortableTable<T>` (existing) | Already handles sort state, null values, highlight, empty state |
| Date range filter UI | Custom date picker | `DateRangePicker` + `useDateRangeStore` (existing) | Already wired globally; avoids duplicate filter state |
| cwd → display name | Custom path parsing | `assignProjectNames()` (existing in api.ts) | Handles collision detection — "parent/name" format when two projects share last segment |
| Date query param parsing | `new Date(str)` inline | `parseDate()` (existing in api.ts) | Returns `'invalid'` sentinel — used for 400 error guard |
| Recharts line chart | SVG path + D3 scale | `LineChart` from `recharts` (already installed) | Handles scale, axis, tooltip, responsive container — no additional bundle cost |

**Key insight:** This phase is almost entirely composition of existing patterns. The only genuinely new work is the sessions grouping algorithm and the pagination layer — everything else (component, hook structure, chart library, filter store) is reuse.

---

## Common Pitfalls

### Pitfall 1: Page Not Resetting on Filter Change

**What goes wrong:** User is on page 3 of sessions, changes the project filter to "frontend", page stays at 3, API returns empty results because page 3 doesn't exist for that project.
**Why it happens:** `page` state lives in `useSessions` hook and is not reset when `projectFilter` or date range changes.
**How to avoid:** In `Sessions.tsx`, call `setPage(1)` whenever `projectFilter` changes (via `useEffect` or by passing `projectFilter` as a prop and resetting in the hook with a `useEffect([projectFilter])`). Alternatively, lift `page` state into the page component and pass it to the hook.
**Warning signs:** Empty table on filter change, no "no data" message but prev/next pagination shows non-zero total.

### Pitfall 2: queryKey Includes `new Date()` Object

**What goes wrong:** `queryKey: ['sessions', from, to, ...]` where `from` is a `Date` object — React Query does reference equality on key elements; every render creates a new `Date` instance causing perpetual re-fetching.
**Why it happens:** Forgetting the project rule from STATE.md.
**How to avoid:** Always serialize: `queryKey: ['sessions', from?.toISOString(), to?.toISOString(), projectFilter, page]`.
**Warning signs:** Network tab shows repeated `/api/v1/sessions` requests on every render.

### Pitfall 3: Including Message Content in API Response

**What goes wrong:** SESS-02 requires no conversation text. If the sessions/:id endpoint spreads the full `CostEvent` (which extends `NormalizedEvent`), it may inadvertently include `message.content` or other text fields.
**Why it happens:** Using `{ ...event }` spread without a whitelist of fields.
**How to avoid:** Explicitly construct the turn object with only allowed fields: `turn`, `model`, `tokens`, `costUsd`, `cumulativeCost`, `timestamp`. Never spread the raw event.
**Warning signs:** Any string field in the API response that looks like prose text.

### Pitfall 4: Sessions Without Any Token Events

**What goes wrong:** A `sessionId` may exist on `system` or other non-token events only. Grouping all events by sessionId and including sessions with `costUsd=0` and no tokens creates ghost rows.
**Why it happens:** `state.costs` contains events with `costUsd=0` for events without `tokens` (e.g., `system` events).
**How to avoid:** When building the session map, include a session in the list only if it has at least one event with `e.tokens !== undefined`. For the detail endpoint, filter to token-bearing events for the turn table, but compute summary cost from all events.
**Warning signs:** Sessions with `—` for all columns including cost appearing in the list.

### Pitfall 5: Duration Source Confusion

**What goes wrong:** `durationMs` on `CostEvent` comes from `system/turn_duration` type events, not from assistant token events. If you only look at `e.tokens`-bearing events, you'll miss the `durationMs` field.
**Why it happens:** Filtering for token-bearing events before collecting `durationMs`.
**How to avoid:** When building the session summary, scan ALL events for the session to find `durationMs` (not just token-bearing ones). Use the first non-null `durationMs` found (or sum if multiple exist — validate against actual data shape).
**Warning signs:** All sessions showing `—` for duration even when the raw data has `durationMs` values.

### Pitfall 6: Tooltip z-index Clipped by Table Overflow

**What goes wrong:** The "Mixed" model tooltip (or any CSS hover tooltip in a table cell) gets clipped by the table's `overflow-x-auto` container.
**Why it happens:** `overflow-x-auto` creates a new stacking context; `z-10` on the tooltip doesn't escape it.
**How to avoid:** Apply `overflow-visible` to the row or use a portal-based tooltip. Alternatively, set `overflow-x-auto` only on the outer wrapper and ensure the table rows can overflow. The existing token tooltip in Models.tsx uses the same pattern — verify it doesn't clip before adopting the same approach.
**Warning signs:** Tooltip appears cut off at the table boundary.

---

## Code Examples

### Session List API Response Shape

```typescript
// Source: design based on existing /api/v1/projects shape (src/server/routes/api.ts:269-275)
interface SessionRow extends Record<string, unknown> {
  sessionId: string;
  displayName: string;      // from assignProjectNames()
  cwd: string | null;
  model: string;            // single model name OR "Mixed"
  models: string[];         // all distinct models (for "Mixed" tooltip)
  costUsd: number;
  tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
  timestamp: string;        // earliest event timestamp in session (ISO string)
  durationMs: number | null;
}

// GET /api/v1/sessions response
interface SessionsResponse {
  sessions: SessionRow[];
  total: number;    // total matching sessions (for pagination display)
  page: number;
  pageSize: number; // always 50
}
```

### Session Detail API Response Shape

```typescript
// Source: design based on NormalizedEvent fields in src/parser/types.ts
interface TurnRow {
  turn: number;           // 1-indexed
  model: string;
  tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
  costUsd: number;
  cumulativeCost: number; // running total through this turn
  timestamp: string;
}

interface SessionSummary {
  sessionId: string;
  displayName: string;
  cwd: string | null;
  model: string;            // single model or "Mixed"
  models: string[];
  totalCost: number;
  totalTokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
  timestamp: string;        // session start
  durationMs: number | null;
  gitBranch: string | null;
}

// GET /api/v1/sessions/:id response
interface SessionDetailResponse {
  summary: SessionSummary;
  turns: TurnRow[];
}
```

### Project Filter Dropdown

```typescript
// Source: design consistent with existing DateRangePicker pattern in web/src/components/DateRangePicker.tsx
// Projects list comes from /api/v1/projects (reuse useProjects hook)
// Render as a <select> element alongside DateRangePicker in the page header

interface SessionsPageState {
  projectFilter: string | null; // null = "All"
}

// In Sessions.tsx header row:
<div className="flex items-center justify-between">
  <h1 className="text-2xl font-semibold text-slate-900">Sessions</h1>
  <div className="flex items-center gap-3">
    <select
      value={projectFilter ?? ''}
      onChange={(e) => setProjectFilter(e.target.value || null)}
      className="rounded border border-slate-200 text-sm px-2 py-1.5 text-slate-600"
    >
      <option value="">All projects</option>
      {projects?.rows.map((p) => (
        <option key={p.cwd ?? 'unknown'} value={p.cwd ?? ''}>
          {p.displayName}
        </option>
      ))}
    </select>
    <DateRangePicker />
  </div>
</div>
```

### Clickable Session Row Navigation

```typescript
// Source: react-router useNavigate pattern; consistent with hash router in App.tsx
import { useNavigate } from 'react-router';

// In Sessions.tsx — render each row's project name cell as a clickable link:
render: (row) => (
  <button
    onClick={() => navigate(`/sessions/${row.sessionId}`)}
    className="font-medium text-slate-900 hover:text-blue-600 hover:underline text-left"
  >
    {row.displayName}
  </button>
)
// Alternatively, make the entire row clickable via onClick on <tr> — but SortableTable
// does not expose row onClick. Add it via a render prop on the first column instead.
```

### Pagination Controls

```typescript
// Source: design based on locked decision (prev/next page buttons)
// Render below the SortableTable card

const totalPages = Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 50));

<div className="flex items-center justify-between mt-4 text-sm text-slate-600">
  <span>
    Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, data?.total ?? 0)} of {data?.total ?? 0}
  </span>
  <div className="flex gap-2">
    <button
      onClick={() => setPage((p) => Math.max(1, p - 1))}
      disabled={page === 1}
      className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40"
    >
      Prev
    </button>
    <button
      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
      disabled={page >= totalPages}
      className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40"
    >
      Next
    </button>
  </div>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-router-dom` (v5 API) | `react-router` v7 (`createHashRouter`) | Phase 3 | `useParams()` from `react-router` directly |
| Recharts v2 (class components) | Recharts v3.7.0 (function components, hooks) | Ongoing | `ResponsiveContainer` + functional API unchanged in usage |
| URL params for filter state | Zustand store | Project decision | Simpler; shareable links deferred |

**Deprecated/outdated:**
- `BrowserRouter`/`HashRouter` from `react-router-dom`: Project uses `createHashRouter` from `react-router` directly — don't import from `react-router-dom`.
- Recharts `<Legend>` with `wrapperStyle`: Project uses CSS vars for color — use `fill="var(--color-bar)"` pattern instead of `legendType` + hex colors.

---

## Open Questions

1. **Does `durationMs` represent total session duration or per-turn duration?**
   - What we know: `durationMs` appears on `NormalizedEvent` (from `schema.ts`) and is described as "from system/turn_duration events". The raw schema has it as optional on all events.
   - What's unclear: Whether it's a running total on the final event, or present only on specific `turn_duration` type events, or on each assistant event. The cost engine does not use it.
   - Recommendation: In the sessions aggregation, collect the maximum `durationMs` value across all events in the session (or the last one if sorted by timestamp). If none found, return `null` and display `—`. Log actual data samples during development to confirm.

2. **What is the `type` field value for token-bearing events?**
   - What we know: `NormalizedEvent.type` is present (required in raw schema). Token-bearing events have `e.tokens` defined. The cost engine filters by `!event.tokens` to zero-cost events.
   - What's unclear: Whether filtering by `e.tokens !== undefined` is sufficient to identify "turns" for the detail view, or whether we also need `e.type === 'assistant'` (or similar).
   - Recommendation: Filter by `e.tokens !== undefined` for the turn table — this matches what the cost engine uses. No need to inspect `type` string.

3. **Can a session span multiple `cwd` values?**
   - What we know: `cwd` is per-event. If a user changes directory mid-session (unlikely but possible), events in one `sessionId` could have different `cwd` values.
   - What's unclear: Whether this happens in practice.
   - Recommendation: Use the `cwd` of the first (earliest) event for the session's project association. If cwd varies within a session, display the most frequent one. Keep implementation simple for now — Phase 7 can refine if needed.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `src/server/routes/api.ts` — existing `/summary`, `/models`, `/projects` route patterns
- Direct codebase read: `src/parser/types.ts` — `NormalizedEvent` shape including `sessionId`, `tokens`, `durationMs`, `isSidechain`, `gitBranch`, `cwd`
- Direct codebase read: `src/cost/types.ts` — `CostEvent` definition (spreads NormalizedEvent + adds `costUsd`)
- Direct codebase read: `web/src/components/SortableTable.tsx` — component API and `Record<string, unknown>` constraint
- Direct codebase read: `web/src/hooks/useModels.ts` and `useProjects.ts` — hook pattern with `queryKey` serialization
- Direct codebase read: `web/src/store/useDateRangeStore.ts` — Zustand store shape
- Direct codebase read: `web/src/App.tsx` — `createHashRouter` children pattern
- Direct codebase read: `web/src/components/CostBarChart.tsx` — Recharts `ResponsiveContainer`/`BarChart` CSS var pattern
- Direct codebase read: `web/package.json` — exact installed versions (recharts 3.7.0, react-router 7.13.1, @tanstack/react-query 5.90.21)
- Direct codebase read: `.planning/STATE.md` — cross-cutting decisions (UTC methods, queryKey serialization, CSS vars, no raw CostEvent[] to frontend)

### Secondary (MEDIUM confidence)
- Context7 / Recharts docs: `LineChart`, `Line`, `ResponsiveContainer` exist in recharts v3 with same API as BarChart — verified by reviewing existing `CostBarChart.tsx` which uses the same component set
- React Router v7 docs: `useParams<{ id: string }>()` syntax — consistent with v7 API (createHashRouter supports nested `:id` params in child routes)

### Tertiary (LOW confidence)
- `durationMs` semantics: Inferred from schema comment "from system/turn_duration events" — actual event type value not verified by reading raw JSONL data

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are in `web/package.json`; no new dependencies needed
- Architecture: HIGH — directly derived from reading existing hooks, routes, and components
- API shape design: HIGH — matches established patterns from `/projects` and `/models` endpoints
- Pitfalls: HIGH — most derived from STATE.md decisions and reading SortableTable/hook implementations
- `durationMs` semantics: LOW — inferred from schema comment, recommend validating against real data in Wave 0

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable stack; recharts/react-query/react-router APIs very stable)
