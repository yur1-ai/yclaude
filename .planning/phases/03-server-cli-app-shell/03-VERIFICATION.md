---
phase: 03-server-cli-app-shell
verified: 2026-02-28T16:02:15Z
status: human_needed
score: 11/12 must-haves verified
re_verification: false
human_verification:
  - test: "Start server with 'node dist/server/cli.js' and confirm browser opens automatically"
    expected: "A browser tab opens to http://127.0.0.1:3000 without passing --no-open"
    why_human: "Cannot automate browser-open behavior (open() package) in a non-GUI environment"
  - test: "Open http://127.0.0.1:3000 and inspect the sidebar and navigation"
    expected: "Left sidebar shows 'yclaude' logo and 4 nav items (Overview, Models, Projects, Sessions); clicking each routes to its placeholder page with 'Coming soon'; no console errors; no external network requests in DevTools"
    why_human: "Visual rendering, hash-router navigation, and DevTools inspection cannot be verified programmatically"
---

# Phase 3: Server, CLI & App Shell Verification Report

**Phase Goal:** User can run a single command and have a working web application open in their browser
**Verified:** 2026-02-28T16:02:15Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All success criteria from ROADMAP.md were used as the truth baseline.

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Running `npx yclaude` starts the server and automatically opens a browser tab | ? HUMAN NEEDED | `cli.ts:36-38` calls `open(url)` when `opts.open` is true (default); 127.0.0.1 binding at `cli.ts:33`; cannot verify open() fires a real browser without GUI |
| 2 | `--dir`, `--port`, `--no-open` flags parse and apply correctly | VERIFIED | `cli.ts:13-16` declares all three options; 6 tests in `cli.test.ts` pass verifying each flag; `npm test` 102/102 green |
| 3 | Browser shows a functioning SPA shell served by Hono server | ? HUMAN NEEDED | `server.ts:63,67` serves `web-dist/` via serveStatic; `web-dist/index.html` exists; `Layout.tsx` has sidebar + `<Outlet />`; visual confirmation requires human |
| 4 | API endpoints under `/api/v1/*` return parsed and aggregated data | VERIFIED | `routes/api.ts:15-38` aggregates totalCost/totalTokens/eventCount from state; 4 passing api.test.ts tests; `dist/server/cli.js` exists and is compiled |
| 5 | Server binds exclusively to 127.0.0.1 — not accessible from other machines | VERIFIED | `cli.ts:33`: `serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, ...)` — hostname hard-coded; 7 server tests pass |
| 6 | CSP headers block all external network requests from served pages | VERIFIED | `server.ts:42-56`: `secureHeaders({ contentSecurityPolicy: { defaultSrc: ["'none'"], connectSrc: ["'self'"] } })`; CSP test asserts no `https?://` in header; no external domains present |

**Score:** 4/6 truths fully verified programmatically; 2/6 need human (visual/browser)

---

### Required Artifacts

All must_haves artifacts across all three plans verified.

#### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/server/cli.ts` | CLI entry with shebang, Commander flags, server startup | VERIFIED | Line 1: `#!/usr/bin/env node`; Commander setup at lines 8-16; `serve()` at line 33 with `hostname: '127.0.0.1'` |
| `src/server/server.ts` | Hono factory with CSP middleware, API routes, static serving | VERIFIED | Exports `createApp` and `AppState`; CSP at lines 42-56; `apiRoutes` wired at line 60; `serveStatic` at lines 63-67 |
| `src/server/routes/api.ts` | GET /api/v1/summary route handler | VERIFIED | Exports `apiRoutes`; summary aggregation at lines 15-38; returns `{ totalCost, totalTokens, eventCount }` |
| `src/server/__tests__/server.test.ts` | Tests: CSP headers, Hono instance, route registration | VERIFIED | 7 tests; all pass; covers CSP presence, default-src, connect-src, no-external-domains |
| `src/server/__tests__/api.test.ts` | Tests: /api/v1/summary response shape | VERIFIED | 4 tests; all pass; covers empty state, totalCost sum, eventCount, totalTokens sum |
| `src/server/__tests__/cli.test.ts` | Tests: Commander option parsing, --no-open default | VERIFIED | 6 tests; all pass; covers open/no-open, port default, dir undefined/defined |

#### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `web/package.json` | Frontend dep isolation — vite, react, tailwind, react-router | VERIFIED | File exists; all required deps present; no frontend deps in root `package.json` |
| `web/vite.config.ts` | Vite config with React + Tailwind v4 plugins, outDir: '../web-dist' | VERIFIED | `outDir: '../web-dist'`; `react()` and `tailwindcss()` plugins declared |
| `web/src/App.tsx` | createHashRouter with Layout + 4 route children | VERIFIED | Uses `createHashRouter` (not `createBrowserRouter`); 4 route children wired: Overview, Models, Projects, Sessions |
| `web/src/components/Layout.tsx` | Left sidebar with yclaude logo + nav links, Outlet | VERIFIED | Renders `<Outlet />`; sidebar with "yclaude" text logo; NavLink for all 4 routes |
| `web/src/pages/Overview.tsx` | Placeholder with 'Coming soon' card | VERIFIED | Renders "Overview" heading + "Coming soon" subtext |

#### Plan 03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `web-dist/index.html` | Built SPA entry point served by Hono | VERIFIED | File exists at project root after build |
| `dist/server/cli.js` | Compiled CLI binary (tsup output) | VERIFIED | File exists; shebang `#!/usr/bin/env node` present as line 1 |
| `.gitignore` | Excludes web-dist/ and web/node_modules/ | VERIFIED | Both `web-dist/` and `web/node_modules/` present in `.gitignore` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/server/cli.ts` | `src/index.ts` | `import { parseAll } from '../index.js'` | WIRED | `cli.ts:5` imports parseAll, applyPrivacyFilter, computeCosts; all called at lines 25-27 |
| `src/server/cli.ts` | `src/server/server.ts` | `import { createApp } from './server.js'` | WIRED | `cli.ts:6` imports createApp; called at line 30 with `{ events: filtered, costs }` |
| `src/server/server.ts` | `src/server/routes/api.ts` | `app.route('/api/v1', apiRoutes)` | WIRED | `server.ts:6` imports apiRoutes; mounted at line 60: `app.route('/api/v1', apiRoutes(state))` |
| `web/src/main.tsx` | `web/src/App.tsx` | `import App from './App'` | WIRED | `main.tsx` imports App and renders it in StrictMode |
| `web/src/App.tsx` | `web/src/components/Layout.tsx` | `element: <Layout />` | WIRED | `App.tsx:11` — root route uses `<Layout />` as element |
| `web/src/components/Layout.tsx` | react-router | `<Outlet />` from react-router | WIRED | `Layout.tsx:1` imports Outlet; `Layout.tsx:37` renders `<Outlet />` in main content area |
| `src/server/server.ts` | `web-dist/` | `serveStatic({ root: webDistPath })` | WIRED | `server.ts:14` computes `webDistPath`; `server.ts:63` mounts `serveStatic({ root: webDistPath })`; `server.ts:67` SPA fallback |
| `package.json scripts.build` | `dist/ and web-dist/` | `build:backend && build:frontend` | WIRED | `package.json:14`: `"build": "npm run build:backend && npm run build:frontend"` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| CLI-01 | 03-01, 03-02, 03-03 | User can run `npx yclaude` with zero installation and have a browser tab open automatically | VERIFIED (auto) + HUMAN NEEDED (browser-open) | `bin.yclaude` points to `./dist/server/cli.js`; `open(url)` called in startup callback; auto-open requires human confirmation |
| CLI-02 | 03-01, 03-03 | User can customize via `--dir`, `--port`, and `--no-open` flags | VERIFIED | Commander declares all 3 flags; 6 cli tests pass; opts applied in CLI data pipeline and serve() call |
| CORE-04 | 03-01, 03-03 | User's data stays private — 127.0.0.1 binding, zero telemetry, CSP blocking external requests | VERIFIED | `hostname: '127.0.0.1'` in serve(); CSP `default-src 'none'` and `connect-src 'self'`; no external domain in CSP; 7 server tests pass |

**Orphaned requirements:** None. All three IDs (CLI-01, CLI-02, CORE-04) are claimed by plans and have supporting implementation evidence.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/server/server.ts` | 29 | "Static serving placeholder (implemented in Plan 03-03)" in JSDoc comment | Info | Not a stub — documentation note; actual serveStatic code is present at lines 63-67 |
| `src/server/routes/api.ts` | 42-43 | Stub routes `/events` and `/sessions` return `{ events: [] }` / `{ sessions: [] }` | Info | Intentional stubs for Phase 4+; documented in SUMMARY; not blocking Phase 3 goal |

No blocker or warning anti-patterns found. The two info items are intentional by design.

---

### Human Verification Required

#### 1. Browser Auto-Open

**Test:** Start the server with `node dist/server/cli.js` (no flags) pointing at real or empty data directory
**Expected:** Terminal shows startup output and a browser tab opens automatically to http://127.0.0.1:3000
**Why human:** The `open()` package triggers OS-level browser launch; cannot be verified from a non-GUI CLI/CI context

#### 2. SPA Visual and Navigation Verification

**Test:** With the server running, visit http://127.0.0.1:3000 and interact with the UI:
1. Sidebar shows "yclaude" text logo at top
2. Four nav items visible: Overview, Models, Projects, Sessions
3. Click each nav item — URL hash changes (#/, #/models, #/projects, #/sessions), correct "Coming soon" card displays
4. Open DevTools Console — no errors
5. Open DevTools Network tab — all requests go to 127.0.0.1:3000 only (no external domains)
6. Visit http://127.0.0.1:3000/api/v1/summary — returns JSON with `totalCost`, `totalTokens`, `eventCount` keys

**Expected:** All 6 checks pass
**Why human:** Visual rendering, client-side hash routing behavior, and DevTools inspection cannot be automated

---

### Gaps Summary

No gaps found. All automated checks pass:

- All 12 source artifacts exist and are substantive (not stubs or placeholders)
- All 8 key links verified as wired (imports + usage confirmed)
- All 3 requirement IDs (CLI-01, CLI-02, CORE-04) have supporting implementation
- 102/102 tests pass across 13 test files
- Build artifacts present: `dist/server/cli.js` (compiled CLI), `web-dist/index.html` (built SPA)
- CSP header hardened: `default-src 'none'`, `connect-src 'self'`, no external domains
- 127.0.0.1 binding hard-coded in serve() call
- `package.json bin.yclaude` points to `./dist/server/cli.js`
- `tsup.config.ts` entry includes both `src/index.ts` and `src/server/cli.ts`
- `.gitignore` excludes `web-dist/` and `web/node_modules/`

The two human verification items are behavioral checks (browser opens, visual UI correct) that were human-verified during plan execution per the 03-03-SUMMARY.md checkpoint, but must be re-confirmed if needed by the verifier.

---

_Verified: 2026-02-28T16:02:15Z_
_Verifier: Claude (gsd-verifier)_
