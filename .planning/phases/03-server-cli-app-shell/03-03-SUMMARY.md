---
phase: 03-server-cli-app-shell
plan: "03"
subsystem: infra

tags: [hono, serveStatic, vite, concurrently, tsup, spa, static-serving]

# Dependency graph
requires:
  - phase: 03-01
    provides: Hono server factory, CLI binary with flag parsing, /api/v1/summary endpoint, CSP headers, 127.0.0.1 binding
  - phase: 03-02
    provides: React SPA shell (web-dist/index.html) with hash router, layout sidebar, 4 placeholder pages

provides:
  - Full-stack runnable application: Hono server statically serves the Vite SPA from web-dist/
  - npm run build produces both dist/ (tsup/backend) and web-dist/ (Vite/frontend)
  - npm run dev runs tsup --watch + vite concurrently for development
  - node dist/server/cli.js starts the server and serves the SPA at http://127.0.0.1:3000
  - Human-verified: sidebar, nav routing, placeholder pages, no console errors, no external requests

affects:
  - Phase 4 (dashboard charts) — SPA shell integration pattern is now established
  - Phase 5/6 (features) — same static serving pattern applies

# Tech tracking
tech-stack:
  added:
    - concurrently (devDep) — parallel dev mode (tsup --watch + vite)
    - "@hono/node-server/serve-static" — static file middleware (already installed in 03-01)
  patterns:
    - serveStatic with absolute path via fileURLToPath(import.meta.url) for npx correctness
    - API routes registered before serveStatic catch-all (order matters)
    - SPA fallback (app.get('*', serveStatic({ path: index.html }))) as last route
    - Two-step build: build:backend (tsup) then build:frontend (cd web && npm run build)

key-files:
  created: []
  modified:
    - src/server/server.ts — added serveStatic for web-dist/ assets + SPA index.html fallback
    - package.json — added build, build:backend, build:frontend, dev scripts; concurrently devDep
    - .gitignore — added web-dist/ and web/node_modules/ exclusions

key-decisions:
  - "webDistPath computed via fileURLToPath(new URL('../../web-dist', import.meta.url)) — resolves correctly from both source (src/server/) and compiled (dist/server/) locations, enabling npx usage"
  - "serveStatic route order: API routes first, then static assets (/*), then SPA fallback (*) — any other order would break API or routing"
  - "npm run build chains build:backend then build:frontend sequentially (not parallel) — tsup must succeed before Vite runs to avoid stale types"

patterns-established:
  - "Static serving pattern: absolute path from import.meta.url, API-before-static order, SPA fallback last"
  - "Monorepo build pattern: root package.json orchestrates backend (tsup) and frontend (cd web && vite) builds"

requirements-completed: [CLI-01, CLI-02, CORE-04]

# Metrics
duration: ~25min (including checkpoint wait)
completed: 2026-02-28
---

# Phase 3 Plan 03: Server-CLI-App-Shell Integration Summary

**Hono server wired to serve React SPA from web-dist/ using fileURLToPath(import.meta.url) absolute path — full-stack application verified working in browser with API endpoint, CSP headers, and hash-based navigation**

## Performance

- **Duration:** ~25 min (including human-verify checkpoint)
- **Started:** 2026-02-28T10:30:00Z (approx)
- **Completed:** 2026-02-28T15:58:38Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 4

## Accomplishments

- Static serving wired into Hono server: web-dist/ assets served via serveStatic, SPA index.html served as fallback for all non-API routes
- npm run build produces both dist/ (tsup backend) and web-dist/ (Vite frontend) in sequence
- npm run dev runs tsup --watch and vite concurrently for development
- End-to-end curl smoke test: GET / returns 200, /api/v1/summary returns JSON, CSP header present
- Human verification passed: sidebar renders, all 4 nav routes work, no console errors, no external network requests

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire static serving into Hono server and update build infrastructure** - `ea7a283` (feat)
2. **Task 2: Smoke-test the assembled server end-to-end with curl** - (no files changed — smoke test passed, no fixes needed)
3. **Task 3: Human verify the complete application in browser** - `fb15dea` (docs — minor comment fix applied per user feedback)

**Plan metadata:** (this docs commit)

## Files Created/Modified

- `src/server/server.ts` — added fileURLToPath webDistPath constant, serveStatic for assets (/*), SPA fallback (app.get('*')), updated comment to clarify tsup compilation path
- `package.json` — added build, build:backend, build:frontend, dev scripts; concurrently devDep
- `package-lock.json` — updated with concurrently install
- `.gitignore` — added web-dist/ and web/node_modules/ entries

## Decisions Made

- `webDistPath = fileURLToPath(new URL('../../web-dist', import.meta.url))` — relative to `dist/server/server.js` after tsup compilation, two levels up reaches project root, then `web-dist/`. This is the correct pattern for npx compatibility where cwd cannot be assumed.
- Route registration order enforced: API routes (registered in 03-01) come before `app.use('/*', serveStatic(...))` and `app.get('*', serveStatic(...))`. The static catch-all would shadow API routes if registered first.
- Sequential build (backend then frontend) chosen over parallel — avoids potential TypeScript type issues if Vite runs against stale types.

## Deviations from Plan

None — plan executed exactly as written. The smoke test (Task 2) passed without requiring any fixes.

The only post-checkpoint change was a user-requested minor comment clarification (`webDistPath` comment updated to say "via tsup" to clarify it refers to the compiled output path), committed as `fb15dea`.

## Issues Encountered

None. The webDistPath computation worked correctly on first attempt. The curl smoke test confirmed all three checks (200 response, JSON API, CSP header) without any path resolution debugging required.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 3 is complete. All three plans done: Hono server (03-01), SPA shell (03-02), integration (03-03).
- Phase 4 (dashboard charts, real data rendering) can begin immediately.
- The established static serving pattern (API-before-static, absolute webDistPath, SPA fallback) must be maintained.
- L2 noted by user during verification: localhost vs 127.0.0.1 distinction behavior — deferred to future phase.

---
*Phase: 03-server-cli-app-shell*
*Completed: 2026-02-28*
