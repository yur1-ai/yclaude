# Phase 3: Server, CLI & App Shell - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Hono HTTP server serving a React SPA shell, launched via `npx yclaude` with CLI flags and auto-open browser. Delivers the infrastructure (server, CLI entry point, SPA scaffold, one real API endpoint) that all future dashboard phases build on. Data views (charts, tables, breakdowns) are out of scope — this phase establishes the skeleton.

</domain>

<decisions>
## Implementation Decisions

### Frontend Stack
- **Bundler:** Vite (separate from tsup backend build)
- **Styling:** Tailwind CSS
- **Routing:** React Router v7 with `createHashRouter` (hash-based, zero server config)
- **Project structure:** `/web` directory at project root, separate `package.json` for frontend deps
  - Backend: `src/` (untouched), builds to `dist/` via tsup
  - Frontend: `web/`, builds to `web-dist/` via Vite
  - Hono serves static assets from `web-dist/`

### Navigation Structure
- **Layout:** Left sidebar
- **Nav items (Phase 3 shell defines all 4):** Overview, Models, Projects, Sessions
- **Placeholder pages:** "Coming soon" card with page name — makes the shell feel intentional
- **Sidebar header:** "yclaude" text logo at top

### CLI Terminal UX
- **Verbosity:** Minimal — version + URL + open message only
  ```
  yclaude v0.1.0
  Local: http://127.0.0.1:3000
  ✓ Opening browser...
  Press Ctrl+C to stop
  ```
- **Color:** Minimal — green checkmark for success, bold URL
- **Process behavior:** Stays alive until Ctrl+C
- **`--no-open` / auto-open failure:** Print URL prominently: `→ Open http://127.0.0.1:3000 in your browser`

### API Scope
- **Phase 3 builds:** One real endpoint — `GET /api/v1/summary`
- **Response shape:**
  ```json
  {
    "totalCost": <EstimatedCost>,
    "totalTokens": { "input": n, "output": n, "cacheCreation": n, "cacheRead": n },
    "eventCount": n
  }
  ```
- **Data loading:** Parse at startup via `parseAll()` + `computeCosts()`, cache in memory
- **Other endpoints:** Stubbed routes returning empty shapes — Phase 4+ fills them in

### Claude's Discretion
- Exact Tailwind theme tokens (colors, spacing)
- Error boundary design for the SPA
- Exact CSP header values (beyond blocking external requests)
- Temp file handling during Vite build integration
- Whether to use `concurrently` or `npm-run-all` for parallel dev scripts

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/index.ts`: Exports `parseAll()`, `computeCosts()`, `applyPrivacyFilter()` — the server imports these directly to populate the API cache at startup
- `src/cost/types.ts`: `EstimatedCost` branded type — the summary endpoint response uses this type
- `src/shared/debug.ts`: Debug utility — server can use `enableDebug()` for verbose logging mode

### Established Patterns
- TypeScript with ESM (`"type": "module"`) — all new code must use `.js` imports for TypeScript files
- `tsup` at root builds `src/` to `dist/` — Vite build (`web/`) is additive, does not conflict
- `vitest` for testing — server-side tests follow same pattern as existing parser/cost tests

### Integration Points
- `src/index.ts` public API → Hono server imports `parseAll` + `computeCosts` for the startup cache
- Root `package.json` scripts need to orchestrate both `tsup` (backend) and `cd web && vite build` (frontend)
- `tsup.config.ts` entry point will need a new `src/server/cli.ts` entry added alongside existing `src/index.ts`
- `"bin": { "yclaude": "./dist/index.js" }` in `package.json` — the CLI entry point must be in `dist/`, produced by tsup

</code_context>

<specifics>
## Specific Ideas

- Terminal output modeled after Vite's dev server presentation — clean, informative, not noisy
- Nav structure mirrors the final Phase 8 scope (Overview, Models, Projects, Sessions) so no structural changes are needed as phases ship
- `/web` structure gives clean mental model: if it's in `src/`, it's backend; if it's in `web/`, it's frontend

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-server-cli-app-shell*
*Context gathered: 2026-02-28*
