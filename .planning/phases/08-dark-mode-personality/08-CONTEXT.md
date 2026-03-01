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

### Personality Copy — Tone & Voice
- **Voice:** Dry/deadpan + mock-exasperated. The persona is a tired-but-affectionate observer of your Claude spending habits.
- **Examples of the right register:**
  - "That's a lot of cash for a commit message fixer."
  - "Claude wrote 40,000 output tokens. Claude had a lot to say."
  - "No sessions yet. Claude is off the clock. Enjoy the silence."
- **Anti-pattern (too energetic):** "🎉 You're a power user!" → wrong register
- **Anti-pattern (too harsh):** "You wasted $47." → wrong register
- **Format:** Short (1–2 sentences max). No emoji unless extremely dry/ironic. No exclamation marks.

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

**Stay silent when:** Normal usage below thresholds, no interesting data to comment on.

**Milestone counting note:** Session count milestones (50th, 100th) only if the count is already available from API (it is — `/sessions` returns pagination totals). No extra overhead needed.

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

### Claude's Discretion
- Exact wording of all quips — the tone decisions above guide the register but specific copy is Claude's call
- Loading state skeleton design for dark mode
- How to handle the `@custom-variant dark` CSS variable system extension (whether to use CSS vars or Tailwind `dark:` classes directly)
- Version label source (hardcode from `package.json` or read dynamically — implementation choice)
- Exact `localStorage` key name

</decisions>

<specifics>
## Specific Ideas

- Sidebar footer: sun/moon icon + version label — "polished settings footer" feel, not a raw button floating nowhere
- GitHub Dark palette as reference: users are developers who live in GitHub Dark; familiarity reduces friction
- Quip register: the project name is "Why, Claude?!" — mock-exasperation is the brand. Dry delivery amplifies it. Think Bill Bryson writing about your token bills.
- "$100 club" framing: milestone labels on stat cards at spend thresholds — not a popup/banner, just a stat card sub-label that appears when the threshold is crossed

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `web/src/index.css`: Already has `@custom-variant dark (&:where(.dark, .dark *))` — class-based dark mode is already wired in Tailwind v4. Just need to add `dark:` variants to components and manage the root class toggle.
- `Layout.tsx`: Sidebar structure is clear — footer strip goes below `<nav>` inside `<aside>`. Currently has no bottom section.
- `StatCard.tsx`: Has `label` and `value` props; a third `quip` or `sub` prop could render the personality copy below the value.
- `CostBarChart.tsx`: Has a loading/pending state already; could get a loading quip.
- All 5 page components: Have `isPending` loading states — good injection points for personality.

### Established Patterns
- State management: Zustand is used for global date range store (`useDateRangeStore`). A `useThemeStore` following the same pattern would be consistent for theme persistence.
- CSS custom properties: All chart colors use `var(--color-*)` — dark mode overrides should follow the same pattern (define vars in `@media (prefers-color-scheme: dark)` and `.dark {}` override).
- Tailwind v4: Project uses `@theme` block for CSS var registration. Dark mode vars would go in a `@layer base` block scoped to `.dark`.

### Integration Points
- `Layout.tsx` — sidebar footer strip is the toggle mount point
- `web/src/main.tsx` or `index.html` — where to inject the initial theme class to prevent flash of unstyled content (FOUC)
- `StatCard.tsx` — primary personality surface; needs a new optional prop for quip copy
- Empty state: currently pages return null or show nothing when data is empty — each needs an empty state component or inline JSX

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-dark-mode-personality*
*Context gathered: 2026-03-01*
