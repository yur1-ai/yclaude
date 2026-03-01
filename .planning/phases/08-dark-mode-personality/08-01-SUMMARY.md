---
phase: 08-dark-mode-personality
plan: "01"
subsystem: ui

tags: [zustand, dark-mode, css-vars, tailwind, localStorage]

# Dependency graph
requires: []
provides:
  - useThemeStore with Zustand persist middleware under key 'yclaude-theme'
  - Theme type ('light' | 'dark' | 'system') exported from store
  - FOUC-prevention inline script in index.html parsing Zustand persist shape
  - Dark mode CSS variable overrides for all chart colors and --color-axis-tick
  - Sidebar footer with sun/moon ThemeToggle button and v1.1.0 version label
  - OS preference change listener keeping 'system' theme in sync
affects:
  - 08-02 (quip personality — Layout already has useThemeStore wired)
  - 08-03 (chart dark mode — CSS vars and --color-axis-tick now available)

# Tech tracking
tech-stack:
  added: [zustand/middleware (persist, createJSONStorage)]
  patterns:
    - Zustand persist middleware with onRehydrateStorage side effect for DOM class toggling
    - FOUC prevention via inline script reading Zustand persist JSON shape in localStorage
    - CSS @layer base .dark block for dark mode custom property overrides
    - Theme toggle cycles between 'light' and 'dark' (system preference used to determine effective state)

key-files:
  created:
    - web/src/store/useThemeStore.ts
  modified:
    - web/index.html
    - web/src/index.css
    - web/src/components/Layout.tsx

key-decisions:
  - "localStorage key 'yclaude-theme' matches Zustand persist name field exactly — mismatch causes FOUC"
  - "FOUC script reads { state: { theme }, version } wrapper shape (Zustand persist format), not raw theme string"
  - "OS preference listener at module level (not per-render) re-calls applyTheme only when stored theme is 'system'"
  - "ThemeToggle cycles between 'light' and 'dark' only — 'system' can only be set programmatically (first load default)"
  - "--color-axis-tick added to @theme block and .dark override to support chart axis label theming in Plan 03"

patterns-established:
  - "applyTheme(theme) as pure side effect: reads window.matchMedia inside function, toggles classList.toggle('dark', isDark)"
  - "@layer base .dark block for CSS var overrides — consistent with Tailwind v4 @custom-variant dark pattern"

requirements-completed: [CLI-03]

# Metrics
duration: 10min
completed: 2026-03-01
---

# Phase 08 Plan 01: Dark Mode Foundation Summary

**Zustand persist theme store with FOUC-prevention, GitHub-inspired dark CSS vars, and sidebar sun/moon toggle wired end-to-end**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-01T15:48:20Z
- **Completed:** 2026-03-01T15:58:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- useThemeStore with persist middleware: theme survives hard refresh, rehydrates and applies class before React mounts
- FOUC-prevention inline script in index.html parses Zustand JSON wrapper shape — no white flash on reload in dark mode
- Dark mode CSS variable overrides for all chart colors (bar, grid, donut 1-5, other, token types) and new --color-axis-tick variable
- Sidebar footer with ThemeToggle (☀/☾ icon button) and v1.1.0 version label; all sidebar elements have dark: class variants

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useThemeStore with persist middleware and FOUC script** - `28b9fc9` (feat)
2. **Task 2: Add dark mode CSS vars and sidebar footer toggle to Layout** - `a6fdcb3` (feat)

**Plan metadata:** (created after summary)

## Files Created/Modified

- `web/src/store/useThemeStore.ts` - Zustand persist store; exports Theme type and useThemeStore; applyTheme side effect; OS preference change listener
- `web/index.html` - FOUC-prevention inline script reads localStorage 'yclaude-theme' and applies .dark class before paint
- `web/src/index.css` - Added --color-axis-tick to @theme; added @layer base .dark block with all chart color overrides
- `web/src/components/Layout.tsx` - Imports useThemeStore; ThemeToggle component; sidebar footer with toggle + version label; dark: classes on all sidebar elements

## Decisions Made

- FOUC script uses the Zustand persist JSON shape (`JSON.parse(raw).state.theme`) rather than storing a raw string — keeps the persist name as single source of truth
- ThemeToggle only cycles between 'light' and 'dark'; 'system' is the initial default and can only be restored programmatically — simplest UX that avoids a three-way button
- OS preference listener registered at module load (not inside React) so it fires even before React mounts
- GitHub dark palette used for sidebar (#0d1117, #161b22, #21262d, #30363d, #8b949e, #e6edf3) — consistent with research

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- useThemeStore and CSS variable infrastructure ready for Plan 02 (quip personality — StatCard quip prop) and Plan 03 (chart dark mode with --color-axis-tick)
- All chart components can now consume `var(--color-axis-tick)` for axis label theming in dark mode
- No blockers.

## Self-Check: PASSED

Files verified:
- web/src/store/useThemeStore.ts: FOUND
- web/index.html: FOUND
- web/src/index.css: FOUND
- web/src/components/Layout.tsx: FOUND
- .planning/phases/08-dark-mode-personality/08-01-SUMMARY.md: FOUND

Commits verified:
- 28b9fc9: FOUND (feat(08-01): create useThemeStore with persist middleware and FOUC script)
- a6fdcb3: FOUND (feat(08-01): add dark mode CSS vars and sidebar footer toggle to Layout)

---
*Phase: 08-dark-mode-personality*
*Completed: 2026-03-01*
