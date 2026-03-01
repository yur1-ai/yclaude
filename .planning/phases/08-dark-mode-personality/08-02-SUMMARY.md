---
phase: 08-dark-mode-personality
plan: "02"
subsystem: ui
tags: [react, typescript, personality, copy, quips, statcard]

# Dependency graph
requires: []
provides:
  - "QUIPS object with 14 keys × 5 entries in dry/deadpan register"
  - "pickQuip() random selector utility"
  - "pickSpendQuip() spend-threshold selector with null-for-zero"
  - "StatCard with optional quip? prop and dark mode classes"
affects: ["08-03-wiring", "08-dark-mode-personality"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "satisfies Record<string, string[]> for QUIPS type safety"
    - "pickSpendQuip strict descending threshold ordering (100 → 50 → 10 → 5 → 1 → any → null)"
    - "quip && conditional render below children in StatCard"

key-files:
  created:
    - web/src/lib/quips.ts
  modified:
    - web/src/components/StatCard.tsx

key-decisions:
  - "quip renders AFTER children (commentary reads last, not before the trend indicator)"
  - "pickSpendQuip returns null for zero spend — no quip shown for blank state"
  - "spend_any catches 0 < x < $1 (fractional spend before first dollar milestone)"
  - "dark mode classes added to StatCard in same task as quip prop (zero overlap with Plan 01)"
  - "web/src/lib/ directory created — did not exist prior to this plan"

patterns-established:
  - "Quip register: dry/deadpan, 1-2 sentences, no exclamation marks, no emoji — enforced across all 70 entries"
  - "StatCard dark mode tokens: border=#30363d, bg=#161b22, label=#8b949e, value=#e6edf3"

requirements-completed: [PRSL-01]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 8 Plan 02: Personality Copy System Summary

**quips.ts personality copy system with 14 QUIPS keys × 5 entries each in dry/deadpan register; StatCard extended with quip? prop and dark mode classes**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-01T15:48:25Z
- **Completed:** 2026-03-01T15:50:04Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Created `web/src/lib/` directory and `quips.ts` with all 14 QUIPS keys, 5 entries each
- Implemented `pickQuip(quips)` for random selection and `pickSpendQuip(totalCostUsd)` with strict threshold ordering
- Extended `StatCard` with optional `quip?` prop that renders in text-xs italic muted style below children
- Added dark mode classes to StatCard card shell, label, and value elements

## Task Commits

Each task was committed atomically:

1. **Task 1: Create quips.ts with personality copy and utility functions** - `5f17fc3` (feat)
2. **Task 2: Add quip? prop to StatCard and dark mode classes** - `268b9db` (feat)

## Files Created/Modified
- `web/src/lib/quips.ts` - QUIPS object, pickQuip(), pickSpendQuip() — all personality copy for the app
- `web/src/components/StatCard.tsx` - Added quip? prop, dark mode Tailwind classes

## Decisions Made
- `quip` renders after `children` so commentary is the last thing read (after trend indicators)
- `pickSpendQuip` returns null for exact zero — no quip clutters the empty/zero-spend state
- `spend_any` catches fractional spend (cents before the $1 milestone) to avoid a gap in coverage
- dark mode classes added to StatCard here (not Plan 01) since there is zero file overlap — safe parallel execution

## Deviations from Plan

None - plan executed exactly as written. The `web/src/lib/` directory did not exist and was created as part of Task 1 (expected by plan: "if missing, create directory").

## Issues Encountered
- `bun` was not available in the shell PATH; used `npx tsc --noEmit` instead. No impact on output.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `quips.ts` and the updated `StatCard` are ready for Plan 03 wiring into Overview, Sessions, Models, and Projects pages
- All exports are typed and compile clean
- No blockers

---
*Phase: 08-dark-mode-personality*
*Completed: 2026-03-01*
