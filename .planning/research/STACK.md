# Technology Stack

**Project:** yclaude
**Researched:** 2026-02-28 (updated for dashboard/visualization milestone)
**Confidence:** HIGH (most recommendations verified against official docs and npm registry)

---

## Base Stack (Already Validated — Do Not Re-Research)

The following technologies are already in place and confirmed. This document only supplements them with new additions needed for the visualization milestone.

| Technology | Version | Status |
|------------|---------|--------|
| React | 19.x | Installed |
| Tailwind CSS | 4.x | Installed |
| Vite | 7.x | Installed |
| Hono | 4.12.x | Installed |
| TypeScript | 5.7.x | Installed |
| React Router | v7 SPA | Installed |

---

## New Stack Additions for Dashboard/Visualization Milestone

The following libraries are needed exclusively for the new features: cost charts, token breakdown donut, activity heatmap, cache efficiency display, session data table, and dark mode.

---

## Charting

### Recommended: Recharts v3 (direct) + shadcn/ui chart wrapper

**CRITICAL FINDING:** As of February 2026, shadcn/ui's official `chart` component still wraps **Recharts v2**, not v3. PR #8486 to upgrade shadcn chart to Recharts v3 was opened by shadcn himself in October 2025 but remains unmerged as of late February 2026. The author confirmed on X (July 2025): "This is recharts v2. Still working on v3."

**Recommendation:** Install Recharts v3 directly AND use the shadcn/ui chart component (which targets v2 API). For the charts in this milestone, use the **shadcn/ui chart patterns** (CSS variable theming, `ChartContainer`, `ChartTooltip`) with Recharts v3 — the v3 breaking changes are minimal (removed unused internal props) and the upgrade from the community gist works as a drop-in.

**Alternative if shadcn chart migration is too painful:** Install Recharts v3 standalone and wire CSS variables manually. The shadcn chart patterns are thin wrappers; they are not magic.

| Library | Version | Purpose | Confidence |
|---------|---------|---------|-----------|
| recharts | 3.7.x | All charts: area/line (cost over time), bar (token breakdown), pie/donut (model split) | HIGH — npm registry confirms 3.7.0, last published ~1 month ago |
| shadcn/ui chart wrapper | via CLI `npx shadcn add chart` | CSS variable theming system, `ChartContainer`, `ChartTooltip`, `ChartLegend` | HIGH — official docs, but note v2/v3 discrepancy above |

**React 19 peer dependency:** Recharts v3 lists React 18 as a peer dependency. With React 19 you need one of:
- `npm install recharts --legacy-peer-deps` (simplest)
- Add `overrides: { "react-is": "^19.0.0" }` in package.json (cleaner for package publishing)
- Use bun/pnpm which handle looser peer dep resolution automatically

**Charts needed for this milestone and how to implement:**

| Chart | Recharts Component | shadcn Pattern |
|-------|-------------------|---------------|
| Cost over time (daily/weekly/monthly toggle) | `<AreaChart>` or `<LineChart>` with `<XAxis>`, `<YAxis>`, `<Tooltip>` | `ChartContainer` + `ChartTooltip` + `ChartTooltipContent` |
| Token breakdown (input/output/cache) | `<BarChart stacked>` with multiple `<Bar>` | Same — use `fill="var(--color-input)"` etc. |
| Per-model split | `<PieChart>` with `<Pie innerRadius={60}>` (donut) | shadcn has a "Pie Chart - Donut with Text" example verbatim |
| Activity heatmap | NOT Recharts — see below | Separate library |
| Cache efficiency | NOT a chart — shadcn `<Progress>` + score number | No charting lib needed |

---

## Activity Heatmap

### Recommended: react-activity-calendar v3

Recharts does not have a calendar heatmap. `react-calendar-heatmap` (the classic library) is at v1.10.0, published over a year ago, and is effectively unmaintained. The actively maintained replacement is `react-activity-calendar`.

| Library | Version | Why |
|---------|---------|-----|
| react-activity-calendar | 3.0.x | Active development (v3 released November 2025, v3.0.5 published ~19 days ago); 19,789 weekly downloads; SVG-based GitHub-style heatmap; built-in dark/light mode; tooltip support; localization; works with Vite/React; no SSR dependency |

**What react-activity-calendar provides:**
- Calendar grid identical to GitHub contribution graph
- `data` prop accepts `{ date: string, count: number, level: 0-4 }[]`
- `colorScheme="dark"` prop for automatic dark mode
- Custom `renderBlock` and `renderColorLegend` for theming to match Tailwind palette
- Tooltip via `react-tooltip` companion package (optional, ~4KB)

**What you need to provide:**
- Data transformation: aggregate `NormalizedEvent[]` by date → `ActivityCalendarData[]`
- Color mapping: pass `theme` prop with oklch/hex values matching your Tailwind CSS variables

**NOT recommended alternatives:**
- `react-calendar-heatmap` — last published 2023, no React 19 support, unmaintained
- `@uiw/react-heat-map` — active but smaller ecosystem, less polished API
- `shadcn-calendar-heatmap` — GitHub project, not on npm as a published package, too unstable
- Building custom SVG heatmap with Recharts `<Cell>` — disproportionate effort for a known problem

---

## Data Table (Session List)

### Recommended: TanStack Table v8 + shadcn/ui `<Table>` primitive

This is the officially recommended combination in shadcn/ui docs. The pattern: TanStack Table handles all data logic (sorting, filtering, pagination state), shadcn/ui `<Table>` provides the styled HTML structure.

| Library | Version | Why |
|---------|---------|-----|
| @tanstack/react-table | 8.21.x | Headless table logic: sorting by any column, column filtering, global search, pagination; TypeScript-first; React 19 compatible; 8.21.3 is the latest stable release |
| shadcn/ui `<Table>` | via `npx shadcn add table` | Styled table primitives (`<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>`) using Tailwind CSS variables; zero extra bundle cost (copy-paste) |

**TanStack Table for session list — specific features needed:**

```
Sorting: getSortedRowModel() — click column header to sort by cost, date, tokens, project
Filtering: getFilteredRowModel() — filter by project name, model, date range
Pagination: getPaginationRowModel() — 25 sessions per page default
Column visibility: built-in — let users hide columns they don't care about
```

**Data shape for session table:**
```typescript
type SessionRow = {
  sessionId: string;
  project: string;      // decoded from slug
  model: string;
  startTime: Date;
  totalCost: EstimatedCost;
  inputTokens: number;
  outputTokens: number;
  cacheHitRate: number; // cache_read / (input + cache_read)
}
```

**NOT recommended alternatives:**
- AG Grid — enterprise bloat, 100KB+ for a simple session list
- MUI DataGrid — pulls in all of MUI, conflicts with Tailwind
- react-table v7 — old API, replaced by TanStack Table v8
- Building a custom HTML table with useState — doesn't scale to 500+ sessions

---

## Dark Mode

### Recommended: Custom ThemeProvider (shadcn/ui Vite pattern) — no extra library

**IMPORTANT:** `next-themes` is Next.js-specific. For a Vite SPA, shadcn/ui's official guide recommends a **custom React Context provider**, not next-themes.

The implementation is ~40 lines of code and zero dependencies:

```typescript
// web/src/components/theme-provider.tsx
type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

// Uses localStorage for persistence + classList.add("dark") on <html>
// "system" theme reads window.matchMedia("(prefers-color-scheme: dark)")
```

**How Tailwind v4 dark mode works with this:**

In Tailwind v4, dark mode is configured via `@custom-variant` in CSS (not `darkMode: 'class'` in tailwind.config.js which no longer exists):

```css
/* In your global CSS */
@custom-variant dark (&:where(.dark, .dark *));
```

shadcn/ui handles this automatically when you run `npx shadcn init` with Tailwind v4. All shadcn components use `dark:` prefix variants that respond to the `.dark` class on `<html>`.

**System preference + manual toggle flow:**
1. On mount: read `localStorage.getItem("yclaude-theme")`
2. If "system" (or nothing stored): check `window.matchMedia("(prefers-color-scheme: dark)").matches`
3. Apply `.dark` class to `document.documentElement`
4. Listen to `matchMedia` changes for system preference updates
5. Manual toggle: store "dark" or "light" in localStorage, update classList

**No additional library needed.** Total implementation: ~40 lines in `theme-provider.tsx` + ~20 lines in `mode-toggle.tsx` (shadcn `<DropdownMenu>` with sun/moon icons from `lucide-react`).

**Recharts dark mode:** Pass `stroke` and `fill` props using `var(--color-*)` CSS variables. `ChartContainer` handles this automatically if you use the shadcn chart wrapper.

**react-activity-calendar dark mode:** Pass `colorScheme={resolvedTheme}` where `resolvedTheme` is "dark" or "light" from the theme context.

---

## Supporting Components (New, From shadcn/ui)

These shadcn components need to be added for the new features. All are copy-paste via CLI, zero runtime bundle cost:

| Component | Command | Used For |
|-----------|---------|---------|
| chart | `npx shadcn add chart` | ChartContainer wrapper, CSS variable theming |
| table | `npx shadcn add table` | Session list data table |
| progress | `npx shadcn add progress` | Cache efficiency score bar |
| select | `npx shadcn add select` | Daily/weekly/monthly toggle on cost chart |
| tabs | `npx shadcn add tabs` | Dashboard section navigation |
| badge | `npx shadcn add badge` | Model name labels, efficiency tier indicators |
| dropdown-menu | `npx shadcn add dropdown-menu` | Dark mode toggle |
| tooltip | `npx shadcn add tooltip` | Chart hover labels (Radix UI tooltip, distinct from Recharts tooltip) |
| card | `npx shadcn add card` | Stat cards (total cost, top model, etc.) |
| skeleton | `npx shadcn add skeleton` | Loading states while data fetches |

---

## Utilities (New or Confirmed for This Milestone)

| Library | Version | Purpose | Already in Stack? |
|---------|---------|---------|-------------------|
| date-fns | 4.1.x | Date bucketing for chart x-axis (day/week/month grouping), date formatting, range filtering | Confirmed in existing STACK.md |
| lucide-react | latest | Sun/Moon icons for dark mode toggle; chart icons; table sort icons | Comes with shadcn/ui init |
| clsx + tailwind-merge | latest | Conditional class composition in components | Confirmed in existing STACK.md |

**No new utilities needed beyond what is already in the stack.**

---

## What NOT to Add (Over-Engineering Warnings)

| Library | Why Not | What to Use Instead |
|---------|---------|---------------------|
| D3.js | Recharts already wraps D3; using raw D3 alongside Recharts creates two rendering paradigms fighting each other | Recharts for all standard charts; react-activity-calendar for the heatmap |
| Victory Charts | Prettier than Recharts but ~80KB, no shadcn/ui integration, switching cost is high | Recharts 3 |
| Nivo | Excellent library but 200KB+ bundle; overkill for 4 chart types | Recharts 3 |
| next-themes | Next.js-specific; misleadingly named; adds a dependency for 40 lines of code | Custom ThemeProvider (shadcn/ui Vite pattern) |
| MUI / Ant Design | Full design systems that conflict with Tailwind; pulling in MUI for one data grid is architectural contamination | TanStack Table + shadcn `<Table>` |
| react-table v7 | Deprecated API, replaced by TanStack Table v8 | @tanstack/react-table v8 |
| AG Grid Community | 200KB+; designed for enterprise grids with 10K+ rows; sessions list is <1000 rows | TanStack Table v8 |
| ECharts / Highcharts | Both are 400KB+; designed for financial/scientific dashboards; Recharts is sufficient | Recharts 3 |
| react-query / TanStack Query | Data loads once at server start; served as JSON via Hono API; no async refetch needed until Phase 2 cloud | Simple `fetch()` + Zustand |
| Framer Motion | Chart animations are built into Recharts; page transitions are not needed for v1 | Recharts built-in animation props |
| react-spring | Same as Framer Motion — premature | Built-in animations |
| CSS-in-JS (Emotion, styled-components) | Tailwind v4 is the styling standard; CSS-in-JS adds runtime overhead and conflicts | Tailwind CSS v4 |

---

## Critical Integration Notes

### Recharts v3 + shadcn chart wrapper discrepancy

The shadcn/ui `chart` component (generated by `npx shadcn add chart`) ships a `chart.tsx` file that targets Recharts v2 API. As of February 2026, the Recharts v3 upgrade PR is unmerged.

**Resolution options (pick one):**

**Option A (Recommended):** Use the community gist `noxify/92bc410cc2d01109f4160002da9a61e5` as your `chart.tsx` instead of the default shadcn-generated one. It is a drop-in v3-compatible replacement. This gets you v3 immediately without waiting for the official merge.

**Option B:** Install Recharts v2 (`recharts@2.15.x`) and use shadcn chart as-is. Recharts v2 works with React 19 (requires `overrides.react-is`). Migrate to v3 when shadcn officially merges. Risk: you start on v2 and need a migration.

**Option C:** Install Recharts v3, accept the minor peer dependency warning, and write chart code without the shadcn wrapper. Manually apply CSS variables (`var(--chart-1)` etc.) as Recharts `fill`/`stroke` props. More boilerplate but no dependency on shadcn's upgrade timeline.

**Recommendation: Option A.** The community replacement `chart.tsx` is battle-tested (87 reactions on the PR, being used in production by early adopters).

### react-activity-calendar theming with Tailwind v4

The heatmap needs custom colors to match your Tailwind palette. Pass a `theme` prop:

```typescript
<ActivityCalendar
  data={calendarData}
  colorScheme={resolvedTheme}  // from ThemeProvider context
  theme={{
    light: ["#f0fdf4", "#86efac", "#4ade80", "#16a34a", "#15803d"],
    dark:  ["#1a2e1a", "#14532d", "#16a34a", "#22c55e", "#4ade80"],
  }}
/>
```

Alternatively, derive colors from CSS variables in a `useEffect` to stay in sync with your Tailwind theme tokens.

### TanStack Table column definition for session list

```typescript
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

const columns: ColumnDef<SessionRow>[] = [
  {
    accessorKey: "project",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Project <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  // ...
]
```

---

## Installation (New Packages Only)

```bash
# Charting
bun add recharts

# Activity heatmap
bun add react-activity-calendar

# Data table
bun add @tanstack/react-table

# shadcn components (run interactively)
npx shadcn add chart table progress select tabs badge dropdown-menu tooltip card skeleton

# React 19 peer dep fix for recharts
# In package.json, add:
# "overrides": { "react-is": "^19.0.0" }
```

---

## Version Compatibility Matrix (New Additions)

| Package | Version | Compatible With | Notes |
|---------|---------|----------------|-------|
| recharts | 3.7.x | React 19.x | Peer dep warning; fix with `overrides.react-is` |
| react-activity-calendar | 3.0.x | React 19.x | v3 released Nov 2025; Vite-compatible |
| @tanstack/react-table | 8.21.x | React 19.x | Fully compatible; headless |
| shadcn chart wrapper | via CLI | Recharts 2.x (official) / 3.x (community gist) | See critical note above |
| ThemeProvider (custom) | ~40 LOC | Tailwind CSS 4.x | No package install; follows shadcn Vite dark mode guide |

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Recharts v3 as charting library | HIGH | npm registry (v3.7.0 confirmed), official GitHub releases |
| shadcn/ui chart v2/v3 discrepancy | HIGH | PR #8486 open, shadcn's own X post confirms "still v2", community gist verified |
| react-activity-calendar over react-calendar-heatmap | HIGH | npm publish dates verified; react-calendar-heatmap last published 2023; react-activity-calendar v3 Nov 2025 |
| TanStack Table v8 + shadcn `<Table>` | HIGH | Official shadcn/ui data table docs; official TanStack docs |
| Custom ThemeProvider (no next-themes) | HIGH | Official shadcn/ui Vite dark mode guide |
| Tailwind v4 dark mode via @custom-variant | HIGH | Official Tailwind v4 docs |
| React 19 peer dep fix for recharts | MEDIUM | Community solutions on GitHub; multiple sources agree but not official recharts docs |

---

## Sources

- [shadcn/ui chart docs](https://ui.shadcn.com/docs/components/radix/chart) — chart component API, CSS variable theming — HIGH confidence (official)
- [shadcn/ui charts gallery](https://ui.shadcn.com/charts/area) — available chart patterns — HIGH confidence (official)
- [shadcn/ui data table docs](https://ui.shadcn.com/docs/components/radix/data-table) — TanStack Table integration pattern — HIGH confidence (official)
- [shadcn/ui dark mode Vite guide](https://ui.shadcn.com/docs/dark-mode/vite) — custom ThemeProvider pattern for Vite SPA — HIGH confidence (official)
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — Tailwind v4 integration notes — HIGH confidence (official)
- [shadcn/ui React 19 guide](https://ui.shadcn.com/docs/react-19) — peer dependency handling — HIGH confidence (official)
- [Recharts npm registry](https://www.npmjs.com/package/recharts) — v3.7.0 confirmed — HIGH confidence (npm registry)
- [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) — breaking changes from v2 — HIGH confidence (official GitHub wiki)
- [shadcn/ui PR #8486](https://github.com/shadcn-ui/ui/pull/8486) — Recharts v3 upgrade, open as of Feb 2026 — HIGH confidence (GitHub)
- [shadcn/ui issue #7669](https://github.com/shadcn-ui/ui/issues/7669) — Recharts v3 support request — HIGH confidence (GitHub)
- [shadcn/ui Recharts v3 community gist](https://gist.github.com/noxify/92bc410cc2d01109f4160002da9a61e5) — drop-in v3-compatible chart.tsx — MEDIUM confidence (community, widely used)
- [shadcn author on X confirming recharts v2](https://x.com/shadcn/status/1943312755412365530) — "This is recharts v2. Still working on v3." — HIGH confidence (primary source)
- [react-activity-calendar GitHub](https://github.com/grubersjoe/react-activity-calendar) — v3 release Nov 2025, features, API — HIGH confidence (official repo)
- [react-activity-calendar npm](https://www.npmjs.com/package/react-activity-calendar) — v3.0.5, 19,789 weekly downloads — HIGH confidence (npm registry)
- [TanStack Table docs](https://tanstack.com/table/latest) — sorting, filtering, pagination APIs — HIGH confidence (official docs)
- [Tailwind CSS dark mode docs](https://tailwindcss.com/docs/dark-mode) — @custom-variant approach in v4 — HIGH confidence (official docs)
- [Tailwind v4 dark mode discussion](https://github.com/tailwindlabs/tailwindcss/discussions/15083) — CSS variables for dark/light mode — HIGH confidence (official GitHub)

---

*Stack research for: yclaude dashboard/visualization milestone*
*Researched: 2026-02-28*
*Supplements base STACK.md — do not duplicate base stack entries*
