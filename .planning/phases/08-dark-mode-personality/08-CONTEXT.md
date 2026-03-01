# Phase 8: Dark Mode & Personality - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

The application gains a dark theme (system-aware + manual toggle, localStorage-persisted) and a "Why, Claude?!" personality layer — dry/deadpan + mock-exasperated quips that appear conditionally across all 5 pages. No new data features, no new routes.

</domain>

<decisions>
## Implementation Decisions

### Dark Mode Toggle — Placement & UX
- **Location:** Fixed footer strip at the bottom of the sidebar, below all nav items
- **Contents:** Sun/moon icon button on the left + version label (e.g. `v1.1.0`) on the right — "settings footer" aesthetic
- **Behavior:** Toggle switches class on `<html>` (or `<body>`) root; persists to `localStorage`; respects system preference on first load (no flash)

### Dark Theme Palette — GitHub Dark
Inspired by github.com dark theme (blue-tinted near-black, not pure black):

| Token | Value | Usage |
|-------|-------|-------|
| Page background | `#0d1117` | Main app bg (`bg-slate-50` equivalent) |
| Surface / card | `#161b22` | Sidebar, cards, modals |
| Elevated surface | `#21262d` | Inputs, hover states, table rows |
| Border | `#30363d` | All `border-*` utilities |
| Text primary | `#e6edf3` | Headings, body text |
| Text muted | `#8b949e` | Sub-labels, secondary text |

These map to existing Tailwind `dark:` variants; the planner should define CSS custom properties for them so they integrate with the existing `@custom-variant dark` setup in `index.css`.

### Chart Dark Mode Colors
- **Chart colors need dark mode overrides** — current oklch values need tuning for dark backgrounds
- **Bar/donut colors:** Increase chroma (saturation) for dark mode — charts should pop more against dark backgrounds (common dark-mode dashboard pattern)
- **Grid lines:** `--color-grid` is currently near-white (`oklch(0.92 0 0)`); dark mode override should use a subtle dark-on-dark line (e.g. `oklch(0.25 0 0)`) — barely visible structure without glowing
- **ActivityHeatmap:** Pass dark-appropriate colors via react-activity-calendar's `theme` prop; tune intensity squares for dark backgrounds

### Personality Copy — Tone & Voice
- **Voice:** Dry/deadpan + mock-exasperated. The persona is a tired-but-affectionate observer of your Claude spending habits.
- **Examples of the right register:**
  - "That's a lot of cash for a commit message fixer."
  - "Claude wrote 40,000 output tokens. Claude had a lot to say."
  - "No sessions yet. Claude is off the clock. Enjoy the silence."
- **Anti-pattern (too energetic):** "🎉 You're a power user!" → wrong register
- **Anti-pattern (too harsh):** "You wasted $47." → wrong register
- **Format:** Short (1–2 sentences max). No emoji unless extremely dry/ironic. No exclamation marks.

### Personality Copy — Quip File Structure
- **Single `quips.ts` file** in `web/src/lib/` (or `web/src/`) — all copy in one place for easy review, editing, and tone consistency
- **Keyed object by trigger:** `QUIPS.threshold_10 = [...]`, `QUIPS.empty_sessions = [...]`, etc.
- **Shared `pickQuip(quips: string[]) → string` utility** — random selection on each call (page load). No persistence needed.
- **Random per page load** — no state, no cycle counter, no hash. Simple `Math.random()` via the shared utility.

### Personality Copy — Trigger Conditions
Quips appear **only when there is something worth commenting on**. Never on routine page loads with normal usage below thresholds.

**Show a quip when ANY of these is true:**

| Condition | Context | Example quip |
|-----------|---------|--------------|
| Zero spend / zero data | Empty state on any page | "No activity yet. Claude is patiently waiting." |
| Non-zero spend (any amount) | Overview stat card sub-label | "Claude has been productive. Your wallet less so." |
| $1+ total spend | Overview all-time stat | "One dollar down. Infinite refactors to go." |
| $5+ total spend | Overview all-time stat | "Five dollars. That's, like, a coffee. A small one." |
| $10+ total spend | Overview all-time stat | "Ten dollars in. Claude is basically an employee now." |
| $50+ total spend | Overview all-time stat | "Fifty dollars. Have you considered cheaper hobbies?" |
| $100+ total spend | Overview all-time stat | "A hundred dollars. Claude remembers nothing, but you'll remember this." |
| First data ever | Overview, first session | "First session logged. Welcome to the accountability dashboard you didn't ask for." |
| Milestone: 100th session | Sessions page stat | "100 sessions. That's commitment. Or dependency. Same thing." |
| Peak activity day (90th percentile+) | ActivityHeatmap hover tooltip | "Some days you really needed Claude." |

**Stay silent when:** Normal usage below thresholds, no interesting data to comment on.

**ActivityHeatmap quip specifics:**
- "Peak day" = any day in the 90th percentile or above for session count across the visible date range
- Tooltip on peak days: `[Date] • [N] sessions` followed by quip on a second line
- Quiet days: tooltip shows date + count only, no quip
- Quips live in `QUIPS.heatmap_peak` key in `quips.ts`

### Personality Copy — Coverage (All 5 Pages)
Every page gets personality treatment in:
- **Zero/empty states** — when the page has no data to show
- **Overview stat cards** — spend-triggered sub-labels (the primary personality surface)
- **Loading states** — optional, brief ("Loading... Claude is being summoned.")

| Page | Zero State | Spend Trigger |
|------|-----------|---------------|
| Overview | Stat cards + chart area | Yes — all-time and period thresholds |
| Sessions | Session list empty | Session count milestone |
| Models | No models yet | No (data is always present if sessions exist) |
| Projects | No projects yet | No (data is always present if sessions exist) |
| Session Detail | No turns (edge case) | No |

### StatCard — Quip Prop
- **New `quip?: string` prop** added to `StatCardProps` (not via the existing `children` slot)
- **Rendering order:** value → `children` (TrendIndicator) → quip — quip is commentary that reads last
- **Both stat cards can show quips** — all-time card gets threshold quips; period card can also show quips if relevant
- **Visual style:** `text-xs text-slate-400 italic` — small, muted, italic; reads as a whisper below the number

### Claude's Discretion
- Exact wording of all quips — the tone decisions above guide the register but specific copy is Claude's call
- Loading state skeleton design for dark mode
- How to handle the `@custom-variant dark` CSS variable system extension (whether to use CSS vars or Tailwind `dark:` classes directly)
- Version label source (hardcode from `package.json` or read dynamically — implementation choice)
- Exact `localStorage` key name
- Exact oklch values for dark mode chart color overrides (tune for legibility and vibrancy)

</decisions>

<specifics>
## Specific Ideas

- Sidebar footer: sun/moon icon + version label — "polished settings footer" feel, not a raw button floating nowhere
- GitHub Dark palette as reference: users are developers who live in GitHub Dark; familiarity reduces friction
- Quip register: the project name is "Why, Claude?!" — mock-exasperation is the brand. Dry delivery amplifies it. Think Bill Bryson writing about your token bills.
- "$100 club" framing: milestone labels on stat cards at spend thresholds — not a popup/banner, just a stat card sub-label that appears when the threshold is crossed
- Heatmap personality: tooltip on peak days only — most days are quiet; the quip lands harder when it's rare

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `web/src/index.css`: Already has `@custom-variant dark (&:where(.dark, .dark *))` — class-based dark mode is already wired in Tailwind v4. Just need to add `dark:` variants to components and manage the root class toggle.
- `Layout.tsx`: Sidebar structure is clear — footer strip goes below `<nav>` inside `<aside>`. Currently has no bottom section.
- `StatCard.tsx`: Has `label`, `value`, `children` props; a new `quip?: string` prop renders below `children` in `text-xs text-slate-400 italic`.
- `CostBarChart.tsx`: Has a loading/pending state already; could get a loading quip.
- All 5 page components: Have `isPending` loading states — good injection points for personality.
- `ActivityHeatmap.tsx`: Uses react-activity-calendar; accepts `theme` prop for dark mode square colors. Phase 8 adds quip logic to the tooltip render for 90th-percentile days.
- `web/src/store/useDateRangeStore.ts`: Zustand store — `useThemeStore` follows the same pattern for theme persistence.

### Established Patterns
- State management: Zustand is used for global date range store (`useDateRangeStore`). A `useThemeStore` following the same pattern would be consistent for theme persistence.
- CSS custom properties: All chart colors use `var(--color-*)` — dark mode overrides follow the same pattern (define vars in `@layer base` scoped to `.dark`).
- Tailwind v4: Project uses `@theme` block for CSS var registration. Dark mode vars go in a `@layer base` block scoped to `.dark`.
- CSS vars at `oklch()`: All current chart colors use oklch. Dark mode overrides should also use oklch — increase chroma for vibrancy, adjust lightness for dark backgrounds.

### Integration Points
- `Layout.tsx` — sidebar footer strip is the toggle mount point
- `web/src/main.tsx` or `index.html` — where to inject the initial theme class to prevent flash of unstyled content (FOUC)
- `StatCard.tsx` — primary personality surface; new `quip?: string` prop
- `ActivityHeatmap.tsx` — heatmap tooltip customization for peak-day quips + dark theme prop
- `web/src/index.css` — add `@layer base { .dark { --color-bar: ...; --color-grid: ...; } }` block for chart dark overrides
- Empty state: currently pages return null or show nothing when data is empty — each needs an empty state component or inline JSX

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-dark-mode-personality*
*Context gathered: 2026-03-01*
