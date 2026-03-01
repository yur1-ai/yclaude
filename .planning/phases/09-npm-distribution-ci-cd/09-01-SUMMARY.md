---
phase: 09-npm-distribution-ci-cd
plan: "01"
subsystem: infra
tags: [tsup, biome, npm-publish, build-config, vite]

requires:
  - phase: 08-dark-mode-personality
    provides: complete frontend codebase ready for packaging

provides:
  - Unified dist/ output: server JS + dist/web/ frontend assets in one directory
  - Production tsup config (tsup.config.prod.ts) with noExternal bundling + Node built-in banner fix
  - Dynamic version reading from package.json in cli.ts
  - Biome 1.9.0 linter/formatter configured and passing on all src files
  - package.json publish-ready with files, engines>=24, prepublishOnly, build:prod, biome:check

affects:
  - 09-npm-distribution-ci-cd (subsequent plans: CI/CD, GitHub Actions, npm publish)

tech-stack:
  added: ["@biomejs/biome@1.9.0"]
  patterns:
    - "tsup prod build uses noExternal plus banner: require injection for CJS-in-ESM compat"
    - "Dynamic version via createRequire('../../package.json') from compiled dist location"
    - "biome-ignore lint/... inline suppression for unavoidable violations (test assertions, a11y table patterns)"
    - "Biome noArrayIndexKey disabled globally — rows have no stable identity key (established decision)"

key-files:
  created:
    - tsup.config.prod.ts
    - biome.json
  modified:
    - web/vite.config.ts
    - src/server/server.ts
    - src/server/cli.ts
    - tsup.config.ts
    - package.json
    - package-lock.json
    - src/server/routes/api.ts
    - web/src/components/SortableTable.tsx
    - web/src/components/DateRangePicker.tsx
    - web/src/components/Layout.tsx
    - web/src/pages/Sessions.tsx
    - web/src/pages/Overview.tsx
    - web/src/pages/SessionDetail.tsx
    - web/src/main.tsx
    - web/src/components/ActivityHeatmap.tsx
    - src/cost/__tests__/engine.test.ts
    - src/cost/__tests__/pricing.test.ts
    - src/cost/__tests__/privacy.test.ts

key-decisions:
  - "tsup prod config uses banner: { js: require injection } to fix dynamic require() inside CJS packages bundled with noExternal in ESM output"
  - "biome.json ignores .claude and .planning directories — they contain GSD tooling, not project source"
  - "noArrayIndexKey disabled globally in biome.json — rows have no stable identity key per existing STATE.md decision"
  - "Biome format pass sorted imports, added trailing commas, converted string concatenation to templates across 62 files"
  - "web/vite.config.ts: explicit sourcemap: false added (was Vite default) to prevent accidental map publication"
  - "tsup.config.ts: target updated node22→node24 to match new engines requirement"

patterns-established:
  - "Production build: tsup --config tsup.config.prod.ts && npm run build:frontend"
  - "CJS-in-ESM compat: banner require injection rather than external list (more reliable with noExternal /.*/)"
  - "biome-ignore for test !-assertions: comment on the line immediately before the statement"
  - "Button elements always get explicit type='button' to satisfy a11y rules"

requirements-completed:
  - DIST-01

duration: 9min
completed: "2026-03-01"
---

# Phase 09 Plan 01: npm Distribution Prep Summary

**Unified dist/ output with production tsup bundle (deps bundled, no maps), Biome linting at exit 0, and package.json publish-ready fields**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-01T22:48:01Z
- **Completed:** 2026-03-01T22:57:00Z
- **Tasks:** 2
- **Files modified:** ~50

## Accomplishments
- Build output unified: `dist/web/` replaces `web-dist/` for all future builds
- Production bundle (`npm run build:prod`) produces 1.2 MB self-contained artifact — all npm deps bundled, no source maps
- `yclaude --version` reads version dynamically from package.json (not hardcoded)
- Biome 1.9.0 installed and configured; one-time format pass applied to entire src; `npx @biomejs/biome check .` exits 0
- `package.json` publish-ready: `"files": ["dist"]`, `"engines": { "node": ">=24.0.0" }`, `"prepublishOnly": "npm run build:prod"`

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate build output from web-dist/ to dist/web/** - `4f94580` (feat)
2. **Task 2: Production build config, package.json updates, and Biome setup** - `07d17cc` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `tsup.config.prod.ts` - Production tsup config: noExternal bundling + banner require injection
- `biome.json` - Biome 1.9.0 config: recommended rules, single-quote JS, ignores dist/.claude/.planning
- `web/vite.config.ts` - outDir `../web-dist` → `../dist/web`; explicit `sourcemap: false`
- `src/server/server.ts` - webDistPath URL `../../web-dist` → `../../dist/web`; updated comment
- `src/server/cli.ts` - Dynamic version via `createRequire('../../package.json')`; replaces hardcoded `'0.1.0'`
- `tsup.config.ts` - target node22 → node24
- `package.json` - files, engines>=24, build:prod, biome:check, prepublishOnly
- `src/server/routes/api.ts` - biome-ignore for noNonNullAssertion on models[0]!
- Web components (SortableTable, DateRangePicker, Layout, Sessions, Overview, SessionDetail, ActivityHeatmap, main.tsx) - type="button" additions, biome-ignore suppressions, format pass

## Decisions Made
- **Banner require injection over external list:** `noExternal: /.*/` bundles commander (CJS) which calls `require('events')` dynamically. Adding `events` to `external` alone doesn't fix the `__require` shim in the CJS-to-ESM wrapper. Adding `import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url)` as a banner at the top of each output file overrides the broken shim — the injected `require` correctly resolves Node built-ins at runtime.
- **noArrayIndexKey globally disabled:** SortableTable uses array index as row key per documented architectural decision (rows have no stable identity). Inline `biome-ignore` was ineffective for JSX attribute-level rules in Biome 1.9.0; rule disabled globally instead.
- **biome.json ignores .claude and .planning:** GSD tooling in .claude/get-shit-done/ is third-party (has its own CJS patterns). .planning/ contains markdown/yaml only.
- **Biome format pass applied codebase-wide:** Sorted imports, trailing commas, template literals. All changes are purely cosmetic — no logic changes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed dynamic require() crash in production ESM bundle**
- **Found during:** Task 2 (verifying `yclaude --version` after prod build)
- **Issue:** `noExternal: /.*/` bundles commander (CJS package). Commander internally calls `require('events')` — the tsup CJS-to-ESM `__require` shim throws `Error('Dynamic require of "events" is not supported')` in Node ESM context
- **Fix:** Added `banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' }` to `tsup.config.prod.ts`. This injects a proper require function that overrides the broken shim, allowing CJS packages to resolve Node built-ins at runtime
- **Files modified:** `tsup.config.prod.ts`
- **Verification:** `node dist/server/cli.js --version` prints `0.1.0`
- **Committed in:** `07d17cc` (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added type="button" to all button elements**
- **Found during:** Task 2 (Biome one-time fix pass)
- **Issue:** Biome `a11y/useButtonType` flagged 9 `<button>` elements missing explicit `type` attribute — without it, buttons inside forms default to `type="submit"` which causes accidental form submission
- **Fix:** Added `type="button"` to all action buttons across CacheEfficiencyCard, CostBarChart, DateRangePicker, Layout, Sessions, SessionDetail
- **Files modified:** Multiple web/src components
- **Committed in:** `07d17cc` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical a11y attribute)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
- Biome `// biome-ignore` placement in JSX `return()` blocks is sensitive: comment must be directly before the JSX element, not before the `return` statement. Parse errors occur if placed as `{/* */}` JSX expression before a sibling element. Resolved by positioning comments correctly.

## User Setup Required
None - no external service configuration required.

## Self-Check: PASSED

All created files found on disk. Both task commits verified in git log.

## Next Phase Readiness
- `npm run build:prod` produces a self-contained bundle ready for `npx` use
- `npm pack --dry-run` confirms correct tarball contents (dist/server/cli.js + dist/web/)
- `package.json` is publish-ready — only npm registry credentials needed for actual publish
- Next: CI/CD setup (GitHub Actions), npm publish workflow, potentially version bumping automation
