# Phase 7: Differentiator Features - Research

**Researched:** 2026-03-01
**Domain:** React data visualization, Recharts extensions, activity heatmap, session analytics
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Activity Heatmap**
- Full year (52 weeks) GitHub-style grid — displays on the Overview page, below existing sections
- Green color scale: 0 sessions = very light gray (visible empty cell), max intensity = dark green
- Each cell represents session count for that day (not cost or token volume)
- Hover tooltip: count + personality quip (e.g. "5 sessions — Why, Claude?! was busy!")
- The heatmap has its own independent date range picker, not tied to the global chart date picker
- Future: dedicated Activity page with click-through from the heatmap (deferred — see below)

**Cache Efficiency Score**
- New StatCard on the Overview page, respects the global date range picker
- Two tab modes within the widget:
  - Input coverage: `cacheRead ÷ (input + cacheRead)` — "what fraction of input tokens came from cache?"
  - Cache hit rate: `cacheRead ÷ (cacheRead + cacheCreation)` — "of cached tokens, how many were reads vs writes?"
- Trend indicator: vs. prior equivalent period (same logic as cost TrendIndicator — consistent pattern)

**Subagent Analysis**
- Session list: small badge on rows that contain subagent events (isSidechain = true), e.g. "Multi-agent" chip
- Session detail: summary split in the header — "Main: $X | Subagents: $Y" — shows main-thread vs subagent cost at a glance
- Overview page: new StatCard showing subagent share of total cost (e.g. "Subagent share: 42%")

**Git Branch Filter (Session List)**
- Each session row in the session list displays its associated git branch
- A branch filter dropdown on the Sessions page lets users narrow to a specific branch — mirrors the existing project filter pattern
- `gitBranch` is already returned in `/api/v1/sessions/:id`; the `/api/v1/sessions` list endpoint needs to expose it per row and support a `?branch=` query param

**24h / Hourly Chart Window**
- "Hourly" added as a 4th bucket option in the CostBarChart toggle (alongside Daily / Weekly / Monthly)
- Timezone: user's local timezone (not UTC)
- X-axis labels: 24-hour format (e.g. 09:00, 14:00)
- Data representation: chronological hour-by-hour timeline (not hour-of-day aggregate)
- Range guard: when the selected date range is > 48 hours, the Hourly button is greyed out/disabled with a tooltip — "Select a range ≤ 48h for hourly view"

### Claude's Discretion
- Exact personality quip copy for heatmap hover (consistent with Phase 8 personality system approach)
- Badge/chip visual styling for subagent indicator
- Whether hourly gap-fill (zero-cost hours) is applied by default
- Month and weekday labels on the heatmap grid

### Deferred Ideas (OUT OF SCOPE)
- Dedicated Activity page — full-page heatmap view with richer controls; clicking heatmap on Overview navigates here — future phase
- "Peak Hours" stat card — hour-of-day aggregate showing typical usage pattern (e.g. "2 PM is your peak hour") — future phase; distinct from the chronological hourly chart
- Heatmap on its own nav route with expanded analytics — user wants this eventually, but Overview placement is sufficient for Phase 7
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANLT-07 | User can see a cache efficiency score (% of input tokens from cache) with a trend indicator showing direction over time | `summary` endpoint already aggregates `cacheRead`, `cacheCreation`, `input` tokens. Two formula tabs are pure frontend math. `TrendIndicator` component already exists and accepts `percent: number | null`. A prior-period API call pattern is established via `useSummary`. |
| ANLT-08 | User can see a GitHub-style activity heatmap on the Overview showing daily usage intensity, with personality-copy annotations on hover | `react-activity-calendar` v3 supports exactly this. Data source: group `state.costs` by date (local timezone), count sessions per day. New `/api/v1/activity` endpoint or extend summary. Component uses `theme` prop for green color scale. |
| ANLT-09 | User can select a 24h time window on the cost-over-time chart that renders hourly buckets with appropriately labeled x-axis ticks | `CostBarChart.tsx` bucket toggle is already extensible (BUCKETS array). Backend `/api/v1/cost-over-time` needs `bucket=hour` handling using local-timezone `getHours()`. XAxis `tickFormatter` formats `HH:00`. Range guard: compare date range span. |
| SESS-03 | User can see subagent sessions flagged distinctly in the session list, with the session detail view breaking out subagent token cost separately from the main-thread cost | `isSidechain: boolean` is already parsed in `NormalizedEvent` and available in `state.costs`. Within a session, events with `isSidechain === true` are the subagent cost; remainder is main-thread cost. No new parsing needed — only aggregation logic changes. |
| SESS-04 | User can see each session's associated git branch in the session list and filter the list to a specific branch via a dropdown | `gitBranch` is already parsed and returned by `GET /sessions/:id`. The list endpoint `/sessions` needs: (1) `gitBranch` field added to `SessionRow`, (2) `?branch=` query param filter. Frontend mirrors project filter pattern at Sessions.tsx:73–87. |
</phase_requirements>

## Summary

Phase 7 adds five analytically distinct features on top of the existing Phase 5/6 foundation. All five features build on data already captured in `state.costs` — no new JSONL parsing is required. The primary new dependency is `react-activity-calendar` v3 for the GitHub-style heatmap; all other features extend existing Recharts components, StatCards, and API endpoints.

The most architecturally significant change is the hourly bucketing for the cost chart. Current bucketing is UTC-based; hourly requires local timezone awareness, which means the backend must accept a timezone offset from the client (or the frontend must shift timestamps before sending). The simpler approach is server-side bucketing using `Date` UTC methods but interpreting the hour in local time via a `?tzOffset=` parameter. The fully correct approach passes the IANA timezone name. Research recommends the IANA timezone name approach using `Intl.DateTimeFormat` on the server.

The subagent accounting is simpler than it appears: `isSidechain` events already share the same `sessionId` as the parent session. Splitting main vs. subagent cost within a session is a pure aggregation filter — no schema changes needed.

**Primary recommendation:** Implement in five independent tasks (one per feature), sharing no dependencies between them except the backend changes to `/api/v1/sessions` (SESS-04) and `/api/v1/cost-over-time` (ANLT-09). Start with backend changes, then each frontend feature is independently deployable.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-activity-calendar | ^2.x / 3.x | GitHub-style activity heatmap | Only mature React heatmap library; v3 is pure ESM, matches project module type |
| recharts | 3.7.0 (installed) | Cost-over-time chart with hourly bucket | Already in use; extend `Bucket` type and `makeFormatter` |
| zustand | 5.0.11 (installed) | State management | Already used for date range store; heatmap uses local state or a new lightweight store |
| @tanstack/react-query | 5.x (installed) | Data fetching | Consistent with all existing hooks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intl.DateTimeFormat | Built-in | Local timezone formatting for hourly buckets | Server-side hour bucketing using `Intl.DateTimeFormat` with `timeZone` option |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-activity-calendar | Hand-rolled SVG grid | Hand-rolling is ~300 lines of SVG math + tooltip positioning; not worth it |
| react-activity-calendar | shadcn-calendar-heatmap | Requires shadcn/ui setup not in this project; adds unnecessary dependency |
| Intl timezone on server | Client-side bucket shift | Client shifting is simpler but incorrect for DST boundaries |
| Intl timezone on server | UTC-only bucketing | UTC bucketing shows wrong "day" for users in non-UTC zones |

**Installation:**
```bash
cd web && npm install react-activity-calendar
```

## Architecture Patterns

### Recommended File Structure for Phase 7

```
web/src/
├── components/
│   ├── ActivityHeatmap.tsx       # New: wraps react-activity-calendar
│   ├── CacheEfficiencyCard.tsx   # New: StatCard + tab toggle + trend
│   ├── CostBarChart.tsx          # Modified: add 'hour' bucket + range guard
│   └── SubagentBadge.tsx         # New: small "Multi-agent" chip component
├── hooks/
│   ├── useCacheStats.ts          # New: fetches cache efficiency + prior period
│   ├── useActivityData.ts        # New: fetches heatmap data (session counts per day)
│   ├── useSessions.ts            # Modified: add gitBranch to SessionRow, branch filter
│   ├── useBranches.ts            # New: fetches distinct branches for dropdown
│   └── useCostOverTime.ts        # Modified: add 'hour' to Bucket type
├── pages/
│   ├── Overview.tsx              # Modified: add CacheEfficiencyCard, SubagentStatCard, ActivityHeatmap
│   ├── Sessions.tsx              # Modified: add gitBranch column, branch filter dropdown
│   └── SessionDetail.tsx         # Modified: add main/subagent cost split in summary
src/server/routes/
└── api.ts                        # Modified: 5 changes (see Architecture Patterns)
```

### Pattern 1: Extending the Bucket Toggle (ANLT-09)

**What:** Add `'hour'` to the `Bucket` type union and BUCKETS array with a disabled state when date range exceeds 48 hours.

**When to use:** Extending an existing toggle pattern.

```typescript
// web/src/hooks/useCostOverTime.ts
export type Bucket = 'day' | 'week' | 'month' | 'hour';

// web/src/components/CostBarChart.tsx
type BucketOption = { key: Bucket; label: string; disabledWhen?: (from: Date | undefined, to: Date | undefined) => boolean };

const BUCKETS: BucketOption[] = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
  {
    key: 'hour',
    label: 'Hourly',
    disabledWhen: (from, to) => {
      if (!from || !to) return true; // no range = disabled
      return (to.getTime() - from.getTime()) > 48 * 60 * 60 * 1000;
    },
  },
];

// XAxis formatter for 'hour' bucket
// dateStr will be ISO string with hour precision: '2026-03-01T14:00:00.000Z'
// But we bucket by local time, so the key is 'YYYY-MM-DDTHH' in local tz
function makeFormatter(bucket: Bucket) {
  return (dateStr: string) => {
    if (bucket === 'hour') {
      // dateStr is the local-hour bucket key, e.g. '2026-03-01T14'
      const hour = dateStr.slice(11, 13);
      return `${hour}:00`;
    }
    if (bucket === 'month') return new Date(dateStr).toLocaleString('default', { month: 'short', year: '2-digit' });
    return `${new Date(dateStr).getMonth() + 1}/${new Date(dateStr).getDate()}`;
  };
}
```

### Pattern 2: Server-Side Local Timezone Bucketing (ANLT-09)

**What:** Accept `?tz=America/Los_Angeles` (IANA timezone) on the cost-over-time endpoint. Use `Intl.DateTimeFormat` to get the local hour for each event.

**When to use:** Any server-side bucketing that must respect user timezone.

```typescript
// In api.ts /cost-over-time handler — hour bucket case
const tz = c.req.query('tz') ?? 'UTC';

// For bucket === 'hour':
const d = new Date(e.timestamp);
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: tz,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hour12: false,
});
// parts gives { year, month, day, hour } in local tz
const parts = Object.fromEntries(formatter.formatToParts(d).map(p => [p.type, p.value]));
key = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}`;
// Result: '2026-03-01T14' for 2pm local time

// Client sends timezone in URL params:
params.set('tz', Intl.DateTimeFormat().resolvedOptions().timeZone);
```

### Pattern 3: react-activity-calendar v3 Integration (ANLT-08)

**What:** Use `ActivityCalendar` component with a green `theme` prop, independent date state, and tooltip with personality quip.

**When to use:** The activity heatmap on Overview.

```typescript
// Source: github.com/grubersjoe/react-activity-calendar v3 types
import { ActivityCalendar } from 'react-activity-calendar';
import type { Activity } from 'react-activity-calendar';

// Theme: 5 colors for levels 0-4 (light-to-dark green; level 0 is very light gray)
const HEATMAP_THEME = {
  light: [
    '#f0f0f0', // level 0: visible empty cell (light gray per CONTEXT.md)
    '#d6f5d6', // level 1: very light green
    '#86d886', // level 2: medium green
    '#3aaa3a', // level 3: dark green
    '#1a6b1a', // level 4: darkest green
  ],
};

// Data shape expected by react-activity-calendar v3
interface ActivityData {
  date: string;  // 'YYYY-MM-DD'
  count: number; // session count
  level: number; // 0-4 computed from count relative to max
}

// Component usage
<ActivityCalendar
  data={activities}
  theme={HEATMAP_THEME}
  colorScheme="light"
  showWeekdayLabels
  labels={{ months: MONTH_LABELS }}
  renderBlock={(block, activity) =>
    React.cloneElement(block, {
      'data-tooltip-id': 'heatmap-tooltip',
      'data-tooltip-content': `${activity.count} sessions${activity.count > 0 ? getQuip(activity.count) : ''}`,
    })
  }
/>
```

**Level computation (server-side):** Compute levels relative to the maximum day count in the dataset. Level 0 = 0 sessions. Levels 1-4 = quartiles of non-zero day counts.

**Tooltip implementation:** Use plain HTML `title` attribute (via `renderBlock`) for the simplest approach. Avoid adding a tooltip library (react-tooltip) — the built-in tooltip support via Floating UI in v3 is available but requires importing CSS. Simplest: `title` attribute on the SVG block via `renderBlock`.

### Pattern 4: Subagent Aggregation in SessionRow (SESS-03)

**What:** Split session events by `isSidechain` to produce `mainCostUsd` and `subagentCostUsd` fields.

**When to use:** In the `/sessions` list endpoint and `/sessions/:id` detail endpoint.

```typescript
// In api.ts session aggregation loop
const mainEvents = sorted.filter(e => !e.isSidechain);
const sideEvents = sorted.filter(e => e.isSidechain === true);

const mainCostUsd = mainEvents.reduce((sum, e) => sum + e.costUsd, 0);
const subagentCostUsd = sideEvents.reduce((sum, e) => sum + e.costUsd, 0);
const hasSubagents = sideEvents.some(e => e.tokens !== undefined);
// costUsd is the total (existing field — keeps backward compat)
const costUsd = mainCostUsd + subagentCostUsd;
```

**Key insight from research:** Subagent events share the same `sessionId` as the parent session. They are already present in the grouped session events. No new data source needed. `isSidechain: boolean | undefined` — treat `undefined` as `false` (main thread).

### Pattern 5: Branch Filter (SESS-04)

**What:** Add `gitBranch` to SessionRow and expose `?branch=` filter in `/sessions` endpoint. Mirror the project filter pattern.

**When to use:** Any new filter on the sessions endpoint.

```typescript
// Backend: api.ts /sessions handler additions
const branchFilter = c.req.query('branch') ?? null;

// After project filter:
if (branchFilter !== null) {
  costs = costs.filter(e => (e.gitBranch ?? null) === branchFilter);
}

// In SessionRow build — add gitBranch from first event that has one:
const gitBranch = sorted.find(e => e.gitBranch)?.gitBranch ?? null;

// Frontend: useBranches hook fetches /api/v1/branches (new endpoint)
// OR: extract distinct branches from /sessions response
// Recommendation: new /api/v1/branches endpoint for clean separation
```

**Branch endpoint:** A new `/api/v1/branches` endpoint returns `{ branches: string[] }` — all unique non-null `gitBranch` values in `state.costs`. This is the cleanest approach and avoids coupling branch list to pagination.

### Pattern 6: Cache Efficiency StatCard with Tab Toggle (ANLT-07)

**What:** A StatCard variant with an internal 2-tab toggle ("Input Coverage" / "Cache Hit Rate") and a real TrendIndicator.

**When to use:** Computing cache efficiency from existing `/api/v1/summary` response.

```typescript
// Cache efficiency formulas — pure frontend math from summary data
const { input, cacheCreation, cacheRead } = summary.totalTokens;

const inputCoverage = (input + cacheRead) > 0
  ? (cacheRead / (input + cacheRead)) * 100
  : null;

const cacheHitRate = (cacheCreation + cacheRead) > 0
  ? (cacheRead / (cacheCreation + cacheRead)) * 100
  : null;

// Prior period: call /api/v1/summary with shifted date bounds
// Same shift logic as would be used for cost trend (Phase 7 activates this)
// Prior period = same duration, ending at 'from' of current period
```

**TrendIndicator activation:** `TrendIndicator` already accepts `percent: number | null`. Phase 7 activates it for the cache score by computing the prior-period cache efficiency and passing `((current - prior) / prior) * 100` as the percent.

**Prior period computation:** Requires a second `useSummary`-style hook call with shifted dates. The shift: if current period is `[from, to]`, prior period is `[from - duration, from]`.

### Anti-Patterns to Avoid

- **Using UTC `getDate()` for local-timezone hourly bucketing:** Always use `Intl.DateTimeFormat` with the IANA timezone for server-side hour extraction when local time matters.
- **Letting CostBarChart call `Intl.DateTimeFormat().resolvedOptions().timeZone` inside the hook on every render:** Call it once at the component mount or store it in a constant.
- **Using `react-activity-calendar` default export:** v3 removed the default export. Use `import { ActivityCalendar } from 'react-activity-calendar'`.
- **Passing raw hex colors to Recharts while using `var(--color-*)` for the heatmap:** The heatmap `theme` prop does not accept CSS variable strings — it needs resolved hex/rgb values. Do NOT use `var(--color-bar)` in the `theme` prop; use hardcoded green hex values.
- **Filtering `isSidechain` events out of `state.costs` globally:** They are needed for session aggregation. Only filter them for display separation within sessions.
- **Using `new Date(dateStr).getHours()` on the server:** Node.js `Date.getHours()` uses the server's system timezone. Always use `Intl.DateTimeFormat` for explicit timezone control.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub-style heatmap grid | Custom SVG 52×7 grid with tooltip | `react-activity-calendar` v3 | Correct week alignment, level interpolation, accessibility, month labels — 300+ lines of SVG math |
| Tooltip for heatmap cells | Custom tooltip component with mouse positioning | `title` attribute via `renderBlock` prop | Zero dependencies; browser handles positioning; perfectly adequate for read-only tooltips |
| Activity level computation | Custom quartile logic | Server-side level assignment in activity endpoint | Keep presentation logic in one place; levels are data, not view |

**Key insight:** `react-activity-calendar` is the only production-ready React heatmap that is ESM-compatible, actively maintained, and has proper TypeScript types. The v3 API is stable and matches the project's needs exactly.

## Common Pitfalls

### Pitfall 1: Subagent Cost Double-Counting
**What goes wrong:** Including `isSidechain` events in both `totalCostUsd` and `subagentCostUsd`, resulting in displayed total > actual total.
**Why it happens:** If `costUsd` on SessionRow already includes all events (which it does — current aggregation sums ALL events), and then you show "Total = Main + Subagents" separately, they must sum to `costUsd`.
**How to avoid:** Define: `costUsd = mainCostUsd + subagentCostUsd` always. The display splits the existing total — it does not add to it.
**Warning signs:** "Main: $X | Subagents: $Y" where X + Y ≠ session total cost.

### Pitfall 2: Hourly Bucket Timezone Mismatch
**What goes wrong:** Server uses UTC hours, client displays local-time labels, so a session at "3pm local" appears in the "10:00" bucket (UTC offset -5).
**Why it happens:** Current bucketing uses `d.toISOString().slice(0, 10)` (UTC). `getHours()` on server returns server TZ (UTC in production).
**How to avoid:** Send `tz=America/Los_Angeles` from client (`Intl.DateTimeFormat().resolvedOptions().timeZone`). Use `Intl.DateTimeFormat` with `timeZone` on server to extract local hour. This is the correct approach verified by MDN and Node.js docs.
**Warning signs:** Hourly data appears shifted by UTC offset from expected time.

### Pitfall 3: react-activity-calendar Full-Year Data Shape
**What goes wrong:** Passing sparse data (only days with sessions) fails — the component expects a contiguous year with ALL dates present, including 0-count days.
**Why it happens:** The component renders a 52-week grid. Missing dates create undefined cells that break week alignment.
**How to avoid:** The server-side activity endpoint must gap-fill: generate all 365 days of the selected year, defaulting to `{ count: 0, level: 0 }` for days with no sessions.
**Warning signs:** Heatmap renders with misaligned columns or missing weeks.

### Pitfall 4: Heatmap Independent Date State
**What goes wrong:** Using `useDateRangeStore` for the heatmap causes it to respond to the global date picker, violating the CONTEXT.md decision.
**Why it happens:** Copy-paste from other hooks that use `useDateRangeStore`.
**How to avoid:** Heatmap uses local `useState` for its year selection (or a separate Zustand store). Do NOT import `useDateRangeStore` in the heatmap component.
**Warning signs:** Changing the Overview date picker affects the heatmap.

### Pitfall 5: Recharts XAxis `tickFormatter` with Hourly ISO-like Keys
**What goes wrong:** `makeFormatter('hour')` receives a string like `'2026-03-01T14'` and `new Date('2026-03-01T14')` fails (invalid ISO).
**Why it happens:** The hourly key format `'YYYY-MM-DDTHH'` is not a valid ISO 8601 string (missing `:MM:SS`).
**How to avoid:** In `makeFormatter`, for `bucket === 'hour'`, parse the hour suffix directly: `dateStr.slice(11, 13) + ':00'`. Do not pass the string to `new Date()`.
**Warning signs:** XAxis labels show "Invalid Date" or NaN.

### Pitfall 6: Branch Filter Leaking Into Date-Range Summary Stats
**What goes wrong:** The branch filter on Sessions page also filters the `/api/v1/summary` stats on Overview, because both use the date store.
**Why it happens:** Branch filter is session-page-local state — it must not be global.
**How to avoid:** Branch filter lives in `Sessions.tsx` local state (or URL search params), not in Zustand. Only the sessions API call includes `?branch=`.
**Warning signs:** Cost stats on Overview change when user applies a branch filter.

## Code Examples

Verified patterns from official sources:

### react-activity-calendar v3 — Named Import and Theme
```typescript
// Source: github.com/grubersjoe/react-activity-calendar types.ts
import { ActivityCalendar } from 'react-activity-calendar';

// ThemeInput shape (from official types.ts):
// type Theme = { light: ColorScale; dark: ColorScale }
// type ThemeInput = { light: ColorScale; dark?: ColorScale } | { light?: ColorScale; dark: ColorScale }
// ColorScale = string[]  (length = maxLevel + 1 = 5 for default maxLevel=4)

const theme = {
  light: ['#f0f0f0', '#d6f5d6', '#86d886', '#3aaa3a', '#1a6b1a'],
};

// Minimum required data shape:
// type Activity = { date: string; count: number; level: number }
// IMPORTANT: data must include ALL dates in range (including 0-count days)
// IMPORTANT: data must be sorted by date ascending

<ActivityCalendar
  data={activities}  // Activity[] sorted ascending, all 365 days of year
  theme={theme}
  colorScheme="light"
  showWeekdayLabels
  maxLevel={4}
/>
```

### Intl.DateTimeFormat for Server-Side Local Hour Bucketing
```typescript
// Source: MDN Web Docs — Intl.DateTimeFormat.prototype.formatToParts()
// Node.js built-in — no npm install needed
function getLocalHourKey(timestamp: string, tz: string): string {
  const d = new Date(timestamp);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  // parts.hour is '14' for 2pm; handle '24' → '00' edge case
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}`;
}

// Client-side: get IANA timezone
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Example: 'America/New_York'
```

### Subagent Split in Session Aggregation
```typescript
// Pattern: split events by isSidechain within one session group
const mainEvents = sorted.filter(e => !e.isSidechain);
const sideEvents = sorted.filter(e => e.isSidechain === true);

const mainCostUsd = mainEvents.reduce((s, e) => s + e.costUsd, 0);
const subagentCostUsd = sideEvents.reduce((s, e) => s + e.costUsd, 0);
const costUsd = mainCostUsd + subagentCostUsd; // === existing total
const hasSubagents = sideEvents.length > 0;
```

### Cache Efficiency Formula
```typescript
// Two modes — pure math from existing summary totalTokens
const { input, cacheCreation, cacheRead } = summary.totalTokens;

// Mode 1: Input Coverage — "what fraction of input came from cache?"
const inputCoverage =
  input + cacheRead > 0 ? (cacheRead / (input + cacheRead)) * 100 : null;

// Mode 2: Cache Hit Rate — "of cached tokens, how many were reads vs writes?"
const cacheHitRate =
  cacheCreation + cacheRead > 0
    ? (cacheRead / (cacheCreation + cacheRead)) * 100
    : null;

// Prior period: shift by duration
const duration = (to.getTime() - from.getTime());
const priorTo = new Date(from.getTime());
const priorFrom = new Date(from.getTime() - duration);
```

### Branch Filter — New API Endpoint
```typescript
// GET /api/v1/branches — returns sorted unique non-null gitBranch values
app.get('/branches', (c) => {
  const branches = [
    ...new Set(
      state.costs
        .map(e => e.gitBranch)
        .filter((b): b is string => typeof b === 'string' && b.length > 0)
    ),
  ].sort();
  return c.json({ branches });
});
```

### Heatmap Activity Endpoint
```typescript
// GET /api/v1/activity?year=2026&tz=America/New_York
// Returns all 365 days with session counts and levels
app.get('/activity', (c) => {
  const year = parseInt(c.req.query('year') ?? String(new Date().getFullYear()));
  const tz = c.req.query('tz') ?? 'UTC';

  // Group state.costs by local date, counting distinct sessionIds per day
  const daySessions = new Map<string, Set<string>>();

  for (const e of state.costs) {
    const d = new Date(e.timestamp);
    const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
    // localDate = 'YYYY-MM-DD'
    if (!localDate.startsWith(String(year))) continue;
    const set = daySessions.get(localDate) ?? new Set();
    set.add(e.sessionId);
    daySessions.set(localDate, set);
  }

  // Count sessions per day
  const counts = new Map<string, number>();
  for (const [date, sessions] of daySessions) {
    counts.set(date, sessions.size);
  }

  // Compute max for level scaling
  const max = Math.max(...counts.values(), 1);

  // Gap-fill all 365 days
  const result = [];
  const startDate = new Date(`${year}-01-01`);
  for (let i = 0; i < 365; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = counts.get(dateStr) ?? 0;
    const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));
    result.push({ date: dateStr, count, level });
  }

  return c.json({ data: result, year });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-activity-calendar default export | Named export `{ ActivityCalendar }` | v3 (Nov 2025) | Must update any old examples using default import |
| `calculateTheme()` utility fn | `theme` prop directly | v3 (Nov 2025) | No utility fn needed; pass theme object directly |
| External tooltip library (react-tooltip) | Built-in Floating UI tooltips or `title` attr | v3 (Nov 2025) | Simpler — use `title` attribute via `renderBlock` to avoid importing tooltip CSS |
| UTC-only bucketing in cost chart | Local-timezone bucketing via `?tz=` param | Phase 7 | Hourly view is meaningless without local time |

**Deprecated/outdated:**
- `calculateTheme()` from react-activity-calendar: removed in v3; use `theme` prop directly
- `eventHandlers` prop in react-activity-calendar: removed in v3; use `renderBlock` for click/hover handling
- `<Skeleton />` component from react-activity-calendar: removed in v3; build your own loading state

## Open Questions

1. **Leap year handling in activity endpoint**
   - What we know: Gap-fill loop runs 365 days from Jan 1
   - What's unclear: Leap years (2028) need 366 days; 2026 is not a leap year so this doesn't affect Phase 7
   - Recommendation: Use `while (year === localYear)` loop rather than fixed 365 count for correctness; or hardcode 366 and rely on the year-filter guard

2. **Heatmap tooltip: title vs. Floating UI**
   - What we know: v3 has built-in Floating UI tooltip support via `react-activity-calendar/dist/style.css`; `title` attribute is always available
   - What's unclear: Whether the CSS import works cleanly with Tailwind v4 / Vite build
   - Recommendation: Start with `title` attribute (zero setup); upgrade to Floating UI tooltips if the visual quality is unsatisfactory during implementation

3. **Prior-period summary for cache trend**
   - What we know: The formula requires a second API call with shifted date bounds
   - What's unclear: Whether to add a new hook (`usePriorSummary`) or extend `/api/v1/summary` with a `compare=true` param that returns both periods
   - Recommendation: New `usePriorSummary(from, to)` hook that mirrors `useSummary` — clean separation, reusable for future trend indicators

4. **react-activity-calendar en-CA locale for `en-CA` Intl format**
   - What we know: `en-CA` produces `YYYY-MM-DD` format consistently across Node.js versions
   - What's unclear: Whether this holds in all Node.js 22 builds
   - Recommendation: Use `en-CA` as specified; it's the standard ISO-compatible locale for date formatting

## Sources

### Primary (HIGH confidence)
- github.com/grubersjoe/react-activity-calendar (types.ts, ActivityCalendar.tsx, releases) — v3 API, `Activity` type, `ThemeInput` shape, prop list, breaking changes
- github.com/tailwindlabs/tailwindcss/discussions/16612 — confirmed `getComputedStyle(document.documentElement)` works for Tailwind v4 CSS vars
- Source code: `/Users/ishevtsov/ai-projects/yclaude/src/parser/types.ts` — confirmed `isSidechain: boolean` and `gitBranch: string` are in `NormalizedEvent`
- Source code: `/Users/ishevtsov/ai-projects/yclaude/src/parser/normalizer.ts` — confirmed `isSidechain` is parsed from raw JSONL
- Source code: `/Users/ishevtsov/ai-projects/yclaude/src/server/routes/api.ts` — confirmed `gitBranch` already returned in `GET /sessions/:id`; NOT yet in `GET /sessions`
- Source code: `/Users/ishevtsov/ai-projects/yclaude/web/src/components/TrendIndicator.tsx` — confirmed accepts `percent: number | null`; currently always receives `null`
- Source code: `/Users/ishevtsov/ai-projects/yclaude/web/package.json` — recharts 3.7.0 installed; react-activity-calendar NOT installed

### Secondary (MEDIUM confidence)
- github.com/anthropics/claude-code/issues/13326 — confirmed subagent events share same `sessionId` as parent; `isSidechain: true` identifies them
- WebSearch + MDN: `Intl.DateTimeFormat.formatToParts()` with `timeZone` — confirmed works in Node.js 22 for local timezone extraction

### Tertiary (LOW confidence)
- WebSearch: `en-CA` locale always produces `YYYY-MM-DD` — single-source verification; treat as confirmed convention but add comment

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — react-activity-calendar v3 types verified from source; all other deps already installed and in use
- Architecture: HIGH — all integration points verified against actual source files; no speculative connections
- Pitfalls: HIGH — all pitfalls derived from actual code inspection (UTC bucketing pattern in api.ts, missing gitBranch in sessions list, isSidechain sharing sessionId)

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (react-activity-calendar is stable; Recharts 3.x API is stable)
