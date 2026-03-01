# Phase 8: Dark Mode & Personality - Research

**Researched:** 2026-03-01
**Domain:** Tailwind v4 class-based dark mode, Zustand persist, FOUC prevention, personality copy system
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dark Mode Toggle — Placement & UX**
- Location: Fixed footer strip at the bottom of the sidebar, below all nav items
- Contents: Sun/moon icon button on the left + version label (e.g. `v1.1.0`) on the right — "settings footer" aesthetic
- Behavior: Toggle switches class on `<html>` root; persists to `localStorage`; respects system preference on first load (no flash)

**Dark Theme Palette — GitHub Dark**

| Token | Value | Usage |
|-------|-------|-------|
| Page background | `#0d1117` | Main app bg |
| Surface / card | `#161b22` | Sidebar, cards, modals |
| Elevated surface | `#21262d` | Inputs, hover states, table rows |
| Border | `#30363d` | All `border-*` utilities |
| Text primary | `#e6edf3` | Headings, body text |
| Text muted | `#8b949e` | Sub-labels, secondary text |

These map via CSS custom properties in `@layer base { .dark { ... } }` — not hardcoded `dark:` palette values.

**Chart Dark Mode Colors**
- Increase chroma (saturation) for bar/donut colors on dark backgrounds
- Grid lines dark override: `oklch(0.25 0 0)` (subtle dark-on-dark)
- ActivityHeatmap: pass dark-appropriate hex colors via `theme.dark` prop of react-activity-calendar

**Personality Copy — Tone & Voice**
- Voice: Dry/deadpan + mock-exasperated. Tired-but-affectionate observer of spending.
- No emoji unless extremely dry/ironic. No exclamation marks.
- Examples: "That's a lot of cash for a commit message fixer." / "Claude wrote 40,000 output tokens. Claude had a lot to say."
- Anti-pattern: anything energetic ("🎉 You're a power user!") or harsh ("You wasted $47.")

**Personality Copy — Quip File Structure**
- Single `quips.ts` in `web/src/lib/` (or `web/src/`)
- Keyed object: `QUIPS.threshold_10 = [...]`, `QUIPS.empty_sessions = [...]`, etc.
- Shared `pickQuip(quips: string[]) => string` — `Math.random()` per page load, no persistence

**Personality Copy — Trigger Conditions**

| Condition | Context | Example |
|-----------|---------|---------|
| Zero spend / zero data | Empty state on any page | "No activity yet. Claude is patiently waiting." |
| Non-zero spend (any amount) | Overview stat card sub-label | "Claude has been productive. Your wallet less so." |
| $1+ total spend | Overview all-time stat | "One dollar down. Infinite refactors to go." |
| $5+ total spend | Overview all-time stat | "Five dollars. That's, like, a coffee. A small one." |
| $10+ total spend | Overview all-time stat | "Ten dollars in. Claude is basically an employee now." |
| $50+ total spend | Overview all-time stat | "Fifty dollars. Have you considered cheaper hobbies?" |
| $100+ total spend | Overview all-time stat | "A hundred dollars. Claude remembers nothing, but you'll remember this." |
| First data ever | Overview, first session | "First session logged. Welcome to the accountability dashboard you didn't ask for." |
| 100th session milestone | Sessions page stat | "100 sessions. That's commitment. Or dependency. Same thing." |
| Peak activity day (90th pct+) | ActivityHeatmap tooltip | "Some days you really needed Claude." |

**StatCard — Quip Prop**
- New `quip?: string` prop added to `StatCardProps`
- Rendering order: value → `children` (TrendIndicator) → quip
- Visual style: `text-xs text-slate-400 italic`

### Claude's Discretion
- Exact wording of all quips
- Loading state skeleton design for dark mode
- How to extend `@custom-variant dark` CSS variable system
- Version label source (hardcode vs. dynamic from `package.json`)
- Exact `localStorage` key name
- Exact oklch values for dark mode chart color overrides

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLI-03 | User can toggle dark mode manually via a nav bar control; app respects system dark mode preference by default; preference persists via localStorage across sessions | Zustand persist middleware pattern; Tailwind v4 `@custom-variant dark`; FOUC-free inline script in `index.html` |
| PRSL-01 | User encounters humorous personality copy in stat callouts, empty states, loading states, milestone labels, and high-spend moments — at least 5 rotating quips per context; copy never replaces data labels | `quips.ts` keyed object + `pickQuip()` utility; StatCard `quip?` prop; per-page empty state components; heatmap 90th-percentile tooltip |
</phase_requirements>

---

## Summary

Phase 8 has two independent workstreams — dark mode theming and personality copy — that can be parallelized but share one integration surface: `StatCard.tsx` (which gets both a dark mode pass and a `quip?` prop).

The dark mode system is already 90% wired. Tailwind v4 `@custom-variant dark (&:where(.dark, .dark *))` is active in `index.css`. What's missing is: (1) the FOUC-prevention inline script in `index.html`, (2) a `useThemeStore` Zustand store with `persist` middleware that manages the `dark` class on `<html>`, (3) dark-mode CSS variable overrides in `@layer base { .dark { ... } }` for chart colors, (4) adding `dark:` Tailwind variants to every component that uses hard-coded light palette classes, and (5) the sidebar footer toggle UI in `Layout.tsx`.

The personality copy workstream requires creating `web/src/lib/quips.ts` with at least 5 quips per key, a `pickQuip()` utility, and then wiring quips into Overview stat cards (threshold logic), all 5 page empty states, and the ActivityHeatmap tooltip (90th-percentile detection). The heatmap already has quip scaffolding but uses an old cycling approach (`count % QUIPS.length`) — Phase 8 replaces this with the canonical threshold-based approach.

**Primary recommendation:** Implement dark mode in two sub-tasks: (A) plumbing (store + FOUC script + CSS vars) and (B) component sweep (add `dark:` classes to all components). Implement personality in one sub-task: create `quips.ts`, wire all five surfaces.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS v4 | 4.2.1 (already installed) | `dark:` variant utilities and CSS variable overrides | Already in project; `@custom-variant dark` already configured |
| Zustand | 5.0.11 (already installed) | `useThemeStore` with `persist` middleware | Established pattern in project (`useDateRangeStore`) |
| `zustand/middleware` | bundled with Zustand 5 | `persist` + `createJSONStorage` for localStorage | Standard Zustand persistence pattern |
| react-activity-calendar | 3.1.1 (already installed) | Heatmap `theme.dark` hex colors | Already in project; `ThemeInput` accepts `{ light: [...], dark: [...] }` |

### No New Dependencies Required

All Phase 8 work uses existing project dependencies. No new npm packages needed.

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure

```
web/src/
├── lib/
│   └── quips.ts           # NEW: all personality copy + pickQuip() utility
├── store/
│   ├── useDateRangeStore.ts  # existing
│   └── useThemeStore.ts   # NEW: theme state with persist middleware
├── components/
│   ├── Layout.tsx         # MODIFY: add sidebar footer strip with toggle
│   ├── StatCard.tsx       # MODIFY: add quip?: string prop
│   └── ActivityHeatmap.tsx  # MODIFY: dark theme prop + 90th-pct quip logic
└── pages/
    ├── Overview.tsx        # MODIFY: pass quips to StatCards; add empty states
    ├── Sessions.tsx        # MODIFY: empty state + session count milestone
    ├── Models.tsx          # MODIFY: empty state
    ├── Projects.tsx        # MODIFY: empty state
    └── SessionDetail.tsx   # MODIFY: empty state (edge case)
```

---

### Pattern 1: Zustand Persist Store for Theme

**What:** A Zustand store that holds `theme: 'light' | 'dark' | 'system'`, persists to localStorage, and applies/removes the `dark` class on `document.documentElement` as a side effect.

**When to use:** Single source of truth for theme; replaces any direct `localStorage` reads in components.

```typescript
// web/src/store/useThemeStore.ts
// Source: zustand.docs.pmnd.rs / persist middleware
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'yclaude-theme',   // localStorage key — Claude's discretion
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    }
  )
);
```

**Note:** The `onRehydrateStorage` callback re-applies the theme class after store hydration from localStorage, which handles the case where the inline FOUC script and the Zustand store need to stay in sync.

---

### Pattern 2: FOUC-Free Theme Initialization (Inline Script)

**What:** An inline `<script>` in `index.html` `<head>` that runs before React hydration, reads localStorage and system preference, and sets the `dark` class on `<html>` immediately.

**Why critical:** React app hydration is async. Without this, users on dark mode see a white flash for 50-200ms.

```html
<!-- web/index.html — add inside <head>, before </head> -->
<!-- Source: Tailwind docs + standard FOUC prevention pattern -->
<script>
  (function() {
    try {
      var stored = localStorage.getItem('yclaude-theme');
      var theme = stored ? JSON.parse(stored).state.theme : 'system';
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (theme === 'dark' || (theme === 'system' && prefersDark)) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  })();
</script>
```

**Key detail:** The Zustand persist middleware wraps state as `{ state: { theme: '...' }, version: 0 }` in localStorage. The inline script must parse `.state.theme` to extract the value, not the raw string.

---

### Pattern 3: CSS Custom Properties for Dark Mode Chart Colors

**What:** Override `--color-*` CSS variables in a `.dark` scope inside `@layer base`. Recharts reads `var(--color-bar)` etc. at paint time, so overrides are automatic.

```css
/* web/src/index.css — SOURCE: existing project pattern extended */
@layer base {
  .dark {
    /* Chart bar — increase chroma for vibrancy on dark background */
    --color-bar: oklch(0.65 0.28 200);

    /* Grid lines — subtle dark-on-dark, barely visible structure */
    --color-grid: oklch(0.25 0 0);

    /* Donut slices — boost chroma ~0.04-0.06 each */
    --color-donut-1: oklch(0.68 0.28 190);
    --color-donut-2: oklch(0.76 0.22 60);
    --color-donut-3: oklch(0.65 0.28 15);
    --color-donut-4: oklch(0.63 0.28 295);
    --color-donut-5: oklch(0.70 0.25 140);
    --color-donut-other: oklch(0.55 0.00 0);  /* mid-gray for "Other" in dark */

    /* Token type colors — tune lightness up ~0.08-0.12 for dark backgrounds */
    --color-token-input: oklch(0.70 0.18 250);
    --color-token-output: oklch(0.70 0.18 160);
    --color-token-cache-write: oklch(0.72 0.18 70);
    --color-token-cache-read: oklch(0.63 0.04 240);
  }
}
```

**Note:** These are starting values for Claude's discretion to tune. The key principle: increase `L` (lightness) and `C` (chroma) for dark backgrounds to maintain visual pop without blowing out contrast.

---

### Pattern 4: Tailwind `dark:` Class Sweep

**What:** Add `dark:` variants to every component that uses hard-coded light palette classes.

**Mapping table for this project:**

| Light class | Dark class | Usage |
|-------------|------------|-------|
| `bg-slate-50` | `dark:bg-[#0d1117]` | App root background |
| `bg-white` | `dark:bg-[#161b22]` | Cards, sidebar |
| `bg-slate-100` | `dark:bg-[#21262d]` | Active nav, hover states |
| `border-slate-200` | `dark:border-[#30363d]` | All borders |
| `text-slate-900` | `dark:text-[#e6edf3]` | Primary text |
| `text-slate-500`, `text-slate-600` | `dark:text-[#8b949e]` | Muted text |
| `text-slate-400` | `dark:text-[#8b949e]` | Secondary muted |
| `hover:bg-slate-50` | `dark:hover:bg-[#21262d]` | Nav hover |
| `bg-slate-800 text-white` (tooltips) | No change — dark tooltip works on both themes | CSS-only tooltips already dark |

**Files requiring `dark:` additions:**
- `Layout.tsx` — app root, aside, nav items
- `StatCard.tsx` — card border, bg, text
- `CostBarChart.tsx` — loading state, bucket buttons
- `ActivityHeatmap.tsx` — card border, bg, select input
- `CacheEfficiencyCard.tsx` — card, toggle
- `SortableTable.tsx` — table rows, header
- `DateRangePicker.tsx` — popover, inputs
- `Overview.tsx` — loading placeholder divs
- `Sessions.tsx`, `Models.tsx`, `Projects.tsx`, `SessionDetail.tsx` — empty states and any inline containers

**Recharts axis ticks:** Currently hardcoded as `fill: 'oklch(0.55 0 0)'` in `CostBarChart.tsx:111,118`. These need a dark-mode-aware value. Since Recharts uses inline SVG `fill` attributes (not CSS classes), the tick fill must be computed from a JS variable referencing the current theme, or use a CSS variable via `var()` in the fill string.

**Recharts `fill` workaround:**
```typescript
// In CostBarChart.tsx, read computed CSS var value for axis ticks
const tickFill = 'var(--color-axis-tick)';
// Define --color-axis-tick in CSS: light = oklch(0.55 0 0), dark = oklch(0.70 0 0)
```

---

### Pattern 5: quips.ts Architecture

**What:** Single file with all personality copy, keyed by trigger context.

```typescript
// web/src/lib/quips.ts
export const QUIPS = {
  // Overview stat card — all-time spend thresholds
  spend_any:   [...],  // non-zero spend (any amount)
  spend_1:     [...],  // $1+
  spend_5:     [...],  // $5+
  spend_10:    [...],  // $10+
  spend_50:    [...],  // $50+
  spend_100:   [...],  // $100+

  // Empty states — per page
  empty_overview:   [...],
  empty_sessions:   [...],
  empty_models:     [...],
  empty_projects:   [...],
  empty_detail:     [...],

  // Milestones
  milestone_100_sessions: [...],

  // ActivityHeatmap — peak days only
  heatmap_peak:    [...],

  // Loading states (optional, brief)
  loading_generic: [...],
} satisfies Record<string, string[]>;

/** Random selection — simple Math.random, no persistence */
export function pickQuip(quips: string[]): string {
  return quips[Math.floor(Math.random() * quips.length)] ?? '';
}

/** Threshold-based spend quip selector — returns highest matching tier */
export function pickSpendQuip(totalCostUsd: number): string | null {
  if (totalCostUsd >= 100) return pickQuip(QUIPS.spend_100);
  if (totalCostUsd >= 50)  return pickQuip(QUIPS.spend_50);
  if (totalCostUsd >= 10)  return pickQuip(QUIPS.spend_10);
  if (totalCostUsd >= 5)   return pickQuip(QUIPS.spend_5);
  if (totalCostUsd >= 1)   return pickQuip(QUIPS.spend_1);
  if (totalCostUsd > 0)    return pickQuip(QUIPS.spend_any);
  return null;
}
```

---

### Pattern 6: ActivityHeatmap 90th Percentile Detection

**What:** Compute the 90th percentile of non-zero session counts across the visible data, then pass a quip to the tooltip for days at or above that threshold.

```typescript
// In ActivityHeatmap.tsx
function computeP90(data: Activity[]): number {
  const counts = data.filter(d => d.count > 0).map(d => d.count).sort((a, b) => a - b);
  if (counts.length === 0) return Infinity; // no peaks if no data
  const idx = Math.ceil(0.9 * counts.length) - 1;
  return counts[Math.max(0, idx)]!;
}

// In the renderBlock callback:
const p90 = computeP90(data.data);
renderBlock={(block, activity) => {
  const isPeak = activity.count > 0 && activity.count >= p90;
  const title = isPeak
    ? `${activity.date} • ${activity.count} sessions\n${pickQuip(QUIPS.heatmap_peak)}`
    : activity.count > 0
      ? `${activity.date} • ${activity.count} sessions`
      : undefined;
  if (!title) return block;
  return cloneElement(block as React.ReactElement<React.HTMLAttributes<SVGRectElement>>, { title });
}}
```

**Note:** The existing heatmap code (line 70-80 of `ActivityHeatmap.tsx`) uses `count % QUIPS.length` cycling — Phase 8 replaces this entirely with threshold-based detection.

---

### Pattern 7: ActivityHeatmap Dark Theme Integration

**What:** Pass a `theme` object with both `light` and `dark` color arrays to `react-activity-calendar`. The library reads `colorScheme` prop to determine which to use. With class-based dark mode, pass `colorScheme` derived from the current theme.

```typescript
// In ActivityHeatmap.tsx — import theme store
import { useThemeStore } from '../store/useThemeStore';

const HEATMAP_THEME = {
  light: [
    '#f0f0f0',  // level 0: empty
    '#d6f5d6',  // level 1
    '#86d886',  // level 2
    '#3aaa3a',  // level 3
    '#1a6b1a',  // level 4
  ],
  dark: [
    '#161b22',  // level 0: matches card surface (#161b22)
    '#0e4429',  // level 1: dark green
    '#006d32',  // level 2
    '#26a641',  // level 3: bright green
    '#39d353',  // level 4: brightest
  ],
};

// In component:
const { theme } = useThemeStore();
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDark = theme === 'dark' || (theme === 'system' && systemDark);
const colorScheme = isDark ? 'dark' : 'light';

// Pass to ActivityCalendar:
<ActivityCalendar
  data={data.data}
  theme={HEATMAP_THEME}
  colorScheme={colorScheme}
  ...
/>
```

**Confirmed:** `react-activity-calendar` v3 `ThemeInput` type accepts `{ light: string[], dark: string[] }` with hex-only colors (CSS variables not supported — confirmed by existing code comment at `ActivityHeatmap.tsx:7`).

---

### Pattern 8: Sidebar Footer Strip (Layout.tsx)

**What:** Add a fixed footer area to the sidebar `<aside>`, below `<nav>`. Contains sun/moon icon toggle button and version label.

```tsx
// Layout.tsx sidebar footer — replaces current aside end
<aside className="w-60 shrink-0 bg-white dark:bg-[#161b22] border-r border-slate-200 dark:border-[#30363d] flex flex-col">
  {/* ...header and nav unchanged... */}
  <div className="px-4 py-3 border-t border-slate-200 dark:border-[#30363d] flex items-center justify-between mt-auto">
    <ThemeToggle />
    <span className="text-xs text-slate-400 dark:text-[#8b949e]">v{VERSION}</span>
  </div>
</aside>
```

**ThemeToggle component** (can be inline or extracted):
- Reads `theme` from `useThemeStore`
- Cycles: `system → light → dark → system` on click (or: `toggle between current and opposite`)
- Decision per CONTEXT.md: simple sun/moon icon button; system-preference handling via the store's `system` value

---

### Anti-Patterns to Avoid

- **Hardcoding `dark` hex values as Tailwind arbitrary values everywhere**: Prefer CSS custom properties defined in `@layer base { .dark { } }` for the GitHub Dark palette tokens. This way, a future palette change requires editing one place.
- **Reading `localStorage` directly in React components**: Route all theme reads through `useThemeStore`. The inline script in `index.html` is the only legitimate direct `localStorage` read.
- **Putting quips inside component JSX files**: All copy goes in `quips.ts`. Components call `pickQuip()` — never hardcode quip strings in `.tsx` files.
- **Adding quips that replace data**: Quips always render below the number value, never instead of it. `StatCard` renders: `label → value → children → quip`.
- **System preference listener on every render**: Install the `prefers-color-scheme` media query listener once (in the store or in `main.tsx`), not on every component render.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme persistence to localStorage | Custom `useEffect` + `window.addEventListener` in components | Zustand `persist` middleware | Handles hydration race conditions, JSON serialization, and SSR edge cases automatically |
| FOUC prevention | Complex React blocking patterns | Inline `<script>` in `<head>` | Scripts in `<head>` execute synchronously before paint — no framework solution beats this |
| Dark mode system preference detection | Polling `window.matchMedia` | `window.matchMedia('(prefers-color-scheme: dark)')` with `.addEventListener('change', ...)` | Browser API; subscribe once, react to changes |
| Random quip selection | Custom shuffle/cycle logic | `Math.floor(Math.random() * quips.length)` via `pickQuip()` | Simple, sufficient; no persistence needed per spec |

---

## Common Pitfalls

### Pitfall 1: Zustand Persist Storage Shape Mismatch in FOUC Script

**What goes wrong:** The inline `<script>` in `index.html` reads `localStorage.getItem('yclaude-theme')` and tries to parse it as a raw theme string (e.g., `"dark"`), but Zustand's `persist` middleware wraps state as `{ "state": { "theme": "dark" }, "version": 0 }`.

**Why it happens:** Developers forget that `persist` serializes the entire state slice, not just the value.

**How to avoid:** In the FOUC script, parse as `JSON.parse(stored).state.theme`. Always wrap in `try/catch` for cases where the value is malformed or localStorage is unavailable (privacy mode).

**Warning signs:** Dark mode works after React hydration but flashes light mode on hard refresh.

---

### Pitfall 2: Recharts SVG `fill` Attributes Ignore Tailwind `dark:` Classes

**What goes wrong:** Recharts XAxis and YAxis tick labels use inline SVG `fill` attributes (`fill: 'oklch(0.55 0 0)'`). Tailwind `dark:` utilities cannot target these because they are inline styles on SVG elements, not CSS classes.

**Why it happens:** Recharts applies tick styles via the `tick` prop object which becomes an SVG `fill` attribute, not a CSS class.

**How to avoid:** Use CSS variables for tick colors. Define `--color-axis-tick` in `index.css` (light: `oklch(0.55 0 0)`, dark: `oklch(0.70 0 0)`) and reference it as `fill: 'var(--color-axis-tick)'` in the `tick` prop.

**Warning signs:** Everything else is dark but chart axis labels remain dark-gray (near-black) and become invisible on dark backgrounds.

---

### Pitfall 3: ActivityHeatmap `colorScheme` Prop Not Reactive to Theme Changes

**What goes wrong:** `colorScheme` is computed once at render time using `window.matchMedia(...)` but not subscribed to system preference changes, causing the heatmap to show wrong colors when the user changes system preference mid-session.

**Why it happens:** `window.matchMedia` result is a snapshot, not reactive.

**How to avoid:** Subscribe to the media query change event in the `useThemeStore` (`system` theme listeners) OR in `ActivityHeatmap` via `useEffect`. Since the store manages theme, derive `colorScheme` from the store's state (which will re-render the component when theme changes).

**Warning signs:** Heatmap squares remain light-theme green after switching to dark mode.

---

### Pitfall 4: Quip Shown on Zero-Data Normal Page Load

**What goes wrong:** `pickSpendQuip(0)` is called and returns `null` (correct), but the developer adds a catch-all condition that shows a generic quip even when `totalCostUsd === 0` and no interesting data exists.

**Why it happens:** Misreading the trigger conditions table — "zero/empty state" quips are only for pages where data would normally exist but is absent, not for first-ever app launch.

**How to avoid:** Only show empty-state quips when the API has returned successfully but returned an empty array or zero values. Never show quips during loading state (pending).

**Warning signs:** New users see personality copy before they have any data, which is confusing rather than charming.

---

### Pitfall 5: Heatmap P90 Threshold Applied to Empty Year

**What goes wrong:** When `year` is selected with zero activity, `computeP90([])` returns `Infinity`, which causes `activity.count >= Infinity` to always be `false` — correct behavior. But if only 1 day has data, that 1 day gets the "peak" quip even if it's just 1 session.

**Why it happens:** P90 of a single-item set is the item itself — mathematically correct but semantically odd.

**How to avoid:** Add a minimum guard: only trigger peak quip if the day's count is >= 2 (or some reasonable minimum). This avoids the "1 session — some days you really needed Claude" scenario which undercuts the joke's timing.

**Warning signs:** Heatmap tooltip appears on a day with 1 session in an otherwise empty year.

---

### Pitfall 6: `dark:` Classes Missing from Inline Loading State Divs

**What goes wrong:** Several pages (`Overview.tsx:84`, `CostBarChart.tsx:59-63`) have inline loading placeholder divs with hardcoded `bg-white`, `border-slate-200` that never get dark variants added.

**Why it happens:** These are not extracted components and are easy to miss during the component sweep.

**How to avoid:** Search for `bg-white` and `border-slate-200` across all `.tsx` files as a verification step after the sweep. Every instance needs a `dark:` companion.

---

## Code Examples

### Complete `useThemeStore.ts`

```typescript
// web/src/store/useThemeStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system' as Theme,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'yclaude-theme',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    }
  )
);
```

### FOUC Prevention Script (`index.html`)

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>yclaude</title>
  <script>
    (function () {
      try {
        var raw = localStorage.getItem('yclaude-theme');
        var theme = raw ? JSON.parse(raw).state.theme : 'system';
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (theme === 'dark' || (theme === 'system' && prefersDark)) {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}
    })();
  </script>
</head>
```

### quips.ts (structural skeleton — exact copy is Claude's discretion)

```typescript
// web/src/lib/quips.ts
export const QUIPS = {
  spend_any:              ['...', '...', '...', '...', '...'],
  spend_1:                ['...', '...', '...', '...', '...'],
  spend_5:                ['...', '...', '...', '...', '...'],
  spend_10:               ['...', '...', '...', '...', '...'],
  spend_50:               ['...', '...', '...', '...', '...'],
  spend_100:              ['...', '...', '...', '...', '...'],
  empty_overview:         ['...', '...', '...', '...', '...'],
  empty_sessions:         ['...', '...', '...', '...', '...'],
  empty_models:           ['...', '...', '...', '...', '...'],
  empty_projects:         ['...', '...', '...', '...', '...'],
  empty_detail:           ['...', '...', '...', '...', '...'],
  milestone_100_sessions: ['...', '...', '...', '...', '...'],
  heatmap_peak:           ['...', '...', '...', '...', '...'],
  loading_generic:        ['...', '...', '...', '...', '...'],
} satisfies Record<string, string[]>;

export function pickQuip(quips: string[]): string {
  return quips[Math.floor(Math.random() * quips.length)] ?? '';
}

export function pickSpendQuip(totalCostUsd: number): string | null {
  if (totalCostUsd >= 100) return pickQuip(QUIPS.spend_100);
  if (totalCostUsd >= 50)  return pickQuip(QUIPS.spend_50);
  if (totalCostUsd >= 10)  return pickQuip(QUIPS.spend_10);
  if (totalCostUsd >= 5)   return pickQuip(QUIPS.spend_5);
  if (totalCostUsd >= 1)   return pickQuip(QUIPS.spend_1);
  if (totalCostUsd > 0)    return pickQuip(QUIPS.spend_any);
  return null;
}
```

### StatCard with `quip?` prop

```typescript
// web/src/components/StatCard.tsx
interface StatCardProps {
  label: string;
  value: string;
  children?: React.ReactNode;
  quip?: string;            // NEW: personality sub-label
}

export function StatCard({ label, value, children, quip }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500 dark:text-[#8b949e]">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-[#e6edf3]">{value}</p>
      {children && <div className="mt-2">{children}</div>}
      {quip && <p className="mt-2 text-xs text-slate-400 dark:text-[#8b949e] italic">{quip}</p>}
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `darkMode: 'class'` in `tailwind.config.js` | Tailwind v4 `@custom-variant dark` in CSS | Tailwind v4 release | No `tailwind.config.js` needed; already configured in this project |
| Separate `dark:` color values in tailwind.config | CSS custom properties in `@layer base { .dark { ... } }` | Tailwind v4 | Chart colors (CSS vars) update automatically in dark mode without component changes |
| react-activity-calendar v2 `color` prop (string) | v3 `theme` prop (`ThemeInput: { light: [], dark: [] }`) | Library v3 release | Must pass hex arrays; CSS vars not supported in theme prop |
| Zustand v4 middleware import paths | Zustand v5 unified `'zustand/middleware'` import | Zustand v5 | `create<T>()()` double-parens required for TypeScript middleware compatibility |

---

## Open Questions

1. **Version label source in sidebar footer**
   - What we know: `package.json` at root has `"version": "0.1.0"`; `web/package.json` has `"version": "0.1.0"`
   - What's unclear: Should the version shown be the root package version or the web package version? Should it update automatically or be hardcoded?
   - Recommendation (Claude's discretion): Hardcode as a constant in `Layout.tsx` imported from a `version.ts` shim, or use Vite's `import.meta.env` with `define: { __VERSION__: JSON.stringify(pkg.version) }` in `vite.config.ts`. Hardcoding is simpler and sufficient for Phase 8.

2. **System preference change event while app is open**
   - What we know: `window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)` handles runtime OS changes
   - What's unclear: Whether to handle mid-session OS preference changes for `theme === 'system'`
   - Recommendation: Add a `useEffect` in the top-level `App.tsx` or inside `useThemeStore` initialization that subscribes to the media query change event when `theme === 'system'`.

3. **Sessions page — session count for milestone quip**
   - What we know: Sessions page has pagination; total session count is not currently surfaced as a separate stat card
   - What's unclear: Is there a total count in the API response? If not, the milestone quip may need a new stat surface or be skipped if count is unavailable
   - Recommendation: Check if `useSessions` returns total count. If yes, add a stat card. If not, treat milestone as a low-priority nice-to-have within PRSL-01's coverage.

---

## Sources

### Primary (HIGH confidence)
- Tailwind CSS v4 official docs (https://tailwindcss.com/docs/dark-mode) — `@custom-variant dark` pattern confirmed, CSS variable override approach
- Zustand v5 persist middleware (https://deepwiki.com/pmndrs/zustand/3.1-persist-middleware) — `create<T>()()` double-parens, `createJSONStorage`, `onRehydrateStorage` callback
- Existing project source (`web/src/index.css:3`) — `@custom-variant dark (&:where(.dark, .dark *))` already wired
- Existing project source (`web/src/components/ActivityHeatmap.tsx:7-8`) — hex-only confirmed in comment, `react-activity-calendar` v3 `theme` prop structure
- `react-activity-calendar` GitHub types (`ThemeInput`) — `{ light?: ColorScale, dark?: ColorScale }` union requiring at least one

### Secondary (MEDIUM confidence)
- FOUC prevention inline script pattern — multiple verified sources (Fixing Dark Mode Flickering in React, Tailwind dark mode guide) confirm `<head>` inline script approach
- Zustand persist storage shape — confirmed by Zustand docs and library source; `{ state: {...}, version: 0 }` wrapper is documented behavior

### Tertiary (LOW confidence)
- Exact oklch values for dark mode chart overrides — derived from existing project oklch values + standard dark-mode chroma-boost pattern; require visual tuning at implementation time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; APIs confirmed from source code and official docs
- Architecture: HIGH — patterns derive directly from existing project conventions (Zustand store shape, CSS var pattern, `@custom-variant dark` already active)
- Pitfalls: HIGH — Recharts inline fill limitation confirmed by code inspection; Zustand persist shape confirmed by docs; FOUC script shape derived from Zustand source behavior
- Quip content: N/A — Claude's discretion per CONTEXT.md

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable dependencies; Tailwind v4 and Zustand v5 are not fast-moving at this point)
