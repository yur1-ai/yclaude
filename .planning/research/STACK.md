# Stack Research

**Domain:** Local-first analytics dashboard distributed via npm (CLI + embedded SPA)
**Researched:** 2026-02-28
**Confidence:** HIGH (most recommendations verified across multiple sources)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.x | UI framework | Largest ecosystem for charting/dashboard components; shadcn/ui + Recharts integration is battle-tested for dashboards; 19.2 is stable with no breaking changes expected |
| Vite | 7.3.x | Frontend build tool | First-party Tailwind v4 plugin; 5x faster full builds vs v5; SPA-first design with no framework overhead; vite-plugin-singlefile enables the critical "embed dashboard in CLI" pattern |
| Hono | 4.12.x | HTTP server (CLI backend) | 14KB, zero dependencies, built on Web Standards; serves both API routes and static files; 3.5x faster than Express; runs identically on Node.js, Cloudflare Workers, and Bun -- critical for future cloud deployment |
| TypeScript | 5.7.x | Language | Non-negotiable for a project this size; strict mode from day 1 |
| Node.js | 22 LTS | Runtime target | LTS with native ESM, performance improvements; minimum for commander v14 |

### Frontend Stack

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Recharts | 3.7.x | Charting | Built for React with composition-based API; shadcn/ui's official chart components use Recharts under the hood; SVG-based rendering handles the <5K data point range this dashboard will use; 53 pre-built chart patterns via shadcn |
| shadcn/ui | latest (CLI) | UI component library | Copy-paste model means zero runtime dependency bloat in npm package; Radix UI primitives for accessibility; built-in chart components wrapping Recharts; dark mode via CSS variables; Tailwind v4 + React 19 compatible |
| Tailwind CSS | 4.2.x | Styling | Zero-config in v4; first-party Vite plugin; CSS-only config (no tailwind.config.js); incremental builds 100x faster than v3 |
| Zustand | 5.0.x | State management | 1.2KB gzipped; centralized store pattern ideal for dashboard with interconnected filter state (date range, model, project); simpler than Jotai for this use case; works outside React components (useful for data processing) |
| TanStack Router | 1.x | Client-side routing | Type-safe routing with automatic search param serialization; file-based route generation; superior to React Router v7 for SPA use (v7's best features require framework mode) |
| date-fns | 4.1.x | Date manipulation | Tree-shakable (import only what you use); functional API matches React patterns; handles the date range filtering, grouping by day/week/month |

### CLI & Build Stack

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Commander.js | 14.x | CLI argument parsing | 25M+ weekly downloads; battle-tested; sufficient for yclaude's simple CLI surface (`--dir`, `--port`, `--no-open`); 116K dependents prove reliability; TypeScript types via `@commander-js/extra-typings` |
| tsup | 8.5.x | CLI bundler | Bundles TypeScript CLI into single JS file with all deps inlined; esbuild-powered for speed; proven pattern for npm CLI distribution; tsdown (0.20.x) is the successor but still <1.0 -- use tsup now, migrate to tsdown when stable |
| vite-plugin-singlefile | 2.3.x | Dashboard inlining | Inlines all JS/CSS into a single `index.html`; this HTML file ships inside the npm package and is served by Hono; eliminates static asset path complexity |
| open | latest | Browser launch | Cross-platform "open URL in default browser" by Sindre Sorhus; standard pattern for CLI tools that launch a UI |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Vitest | 4.0.x | Testing | Native Vite integration; browser mode for component tests; fastest test runner in 2026 |
| @testing-library/react | latest | Component testing | Standard for React component testing |
| ESLint | 9.x | Linting | Flat config format; paired with typescript-eslint |
| Prettier | 3.x | Formatting | Or use ESLint Stylistic; pick one, enforce it |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.90.x | Async data fetching | Bridge between Hono API and React UI; handles caching, refetching, loading states for dashboard data |
| zod | 3.x | Schema validation | Validate JSONL parsing output; validate CLI input; shared schemas between CLI and frontend |
| clsx + tailwind-merge | latest | Class composition | Conditional Tailwind classes in components; standard shadcn/ui pattern |

## Architecture Pattern: CLI-Embedded SPA

This is the most critical architectural decision. The pattern:

```
Build phase (development):
  Vite + React + Recharts + Tailwind --> vite-plugin-singlefile --> single index.html

Distribution (npm package):
  /bin/yclaude.js        (CLI entrypoint, bundled by tsup)
  /dist/index.html       (entire dashboard as one file)

Runtime (user runs npx yclaude):
  1. CLI parses args (commander)
  2. CLI reads ~/.claude JSONL files (Node.js fs)
  3. Hono server starts on localhost:PORT
  4. Hono serves /api/* routes (parsed data as JSON)
  5. Hono serves / with the embedded index.html
  6. open() launches browser
  7. React SPA fetches data from /api/* via TanStack Query
```

This is the same fundamental pattern used by tools like Vite's dev server, Storybook, and similar CLI-to-browser tools. The key insight is: **the frontend is a build artifact shipped inside the npm package, not a separate deployment**.

### Why This Pattern

- **Zero friction**: `npx yclaude` just works -- no separate frontend install
- **Offline-capable**: Everything is local, no CDN dependencies
- **Cloud-ready**: The same React SPA can be deployed to Vercel/Cloudflare later with a different API backend
- **Small package**: Single HTML file + bundled CLI keeps npm package under 2MB

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| UI Framework | React 19 | Svelte 5 | 1.6KB runtime vs 44KB is tempting, but: shadcn/ui + Recharts ecosystem does not exist for Svelte; smaller hiring pool; React's ecosystem advantage is decisive for a dashboard app |
| UI Framework | React 19 | Preact 10 | API-compatible but shadcn/ui relies on React internals (useId, etc.); compatibility shims add complexity; not worth the 40KB savings when the entire SPA is a build artifact anyway |
| Charting | Recharts 3 | Chart.js 4 | Chart.js is framework-agnostic (canvas-based), requires react-chartjs-2 wrapper; Recharts is React-native with composition API; shadcn/ui standardized on Recharts |
| Charting | Recharts 3 | uPlot | Faster for 100K+ points, but our dataset is <5K points (daily cost entries); uPlot has sparse docs and no React integration |
| Charting | Recharts 3 | ECharts | Powerful but massive (40KB+); better for complex scientific viz; overkill for cost/usage charts |
| Server | Hono | Express | Express is 5x larger, slower, callback-based; Hono's Web Standards API means the same code runs on Cloudflare Workers for cloud deployment |
| Server | Hono | Fastify | Fastify is excellent but heavier (schema validation, plugin system); Hono is leaner for "serve API + static file" use case |
| State | Zustand | Redux Toolkit | RTK is 30KB+ and overkill; yclaude has ~5 stores max (filters, data cache, UI state) |
| State | Zustand | Jotai | Jotai's atomic model is better for forms/fine-grained updates; Zustand's centralized store is better for interconnected dashboard filter state |
| CLI Parser | Commander | gunshi | gunshi (used by ccusage) is TypeScript-first but has tiny ecosystem (<100 npm dependents); Commander is battle-tested and sufficient for yclaude's simple CLI |
| CLI Parser | Commander | Optique | Optique is interesting (type-safe composition) but very new; Commander's simplicity is fine for `--dir`, `--port`, `--no-open` |
| CLI Bundler | tsup | tsdown | tsdown (Rolldown-based) is the future but at 0.20.x it is not yet 1.0; tsup 8.5 is stable and proven; migrate when tsdown reaches 1.0 |
| Routing | TanStack Router | React Router v7 | React Router v7's best features (file-based routing, type safety) only work in framework mode; in SPA library mode it is inferior to TanStack Router |
| Date | date-fns | dayjs | dayjs is smaller (6KB) but not tree-shakable; date-fns lets you import only `format`, `startOfWeek`, etc. individually |
| Date | date-fns | Temporal API | Chrome 144 shipped Temporal but Firefox/Safari support is incomplete; cannot rely on it for a Node.js CLI tool yet |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Next.js / Remix | SSR frameworks add massive complexity for what is fundamentally a client-side dashboard; cannot be embedded in an npm CLI package | Vite SPA + Hono server |
| Express | 2x larger than Hono, slower, callback-oriented, no Web Standards compatibility for cloud portability | Hono |
| D3.js directly | Steep learning curve, imperative API clashes with React's declarative model; raw D3 for charts is a time sink | Recharts (built on D3 under the hood) |
| Moment.js | Deprecated, massive bundle (66KB), mutable API | date-fns |
| Redux | Boilerplate-heavy, 30KB+, designed for much larger state complexity than yclaude needs | Zustand |
| CSS Modules / Emotion / styled-components | Tailwind v4 is the standard in 2026; CSS-in-JS libraries add runtime overhead and complexity | Tailwind CSS v4 |
| Webpack | Slower, more config, no first-party Tailwind v4 integration | Vite |
| Jest | Slower than Vitest, requires separate config, no native ESM support | Vitest |
| Electron | Nuclear option for a tool that only needs a browser tab; adds 100MB+ to package size | Hono server + system browser |
| Prisma / Drizzle | No database in v1 (all data from JSONL files); premature ORM adoption | Direct file parsing; add DB layer in Phase 2 |
| GraphQL | Over-engineering for a local tool with <10 API endpoints | REST-style JSON API via Hono |

## Stack Patterns by Variant

**If building Phase 1 (Local MVP) only:**
- Skip TanStack Router (single-page with tabs is enough)
- Skip TanStack Query (data loaded once at server start, served as static JSON)
- Use simple `fetch()` + Zustand for data loading

**If building with cloud deployment in mind (Phase 2+):**
- Add TanStack Query from the start (handles refetching, caching, optimistic updates)
- Add TanStack Router (separate routes for dashboard, sessions, settings)
- Abstract data access behind a provider interface (local file reader vs cloud API)

**If the npm package gets too large (>5MB):**
- Switch from vite-plugin-singlefile to serving pre-built assets from a `/dist` directory
- Use Vite's code splitting to lazy-load chart components
- Consider Preact as a React drop-in to save ~40KB (only if other optimizations are exhausted)

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React 19.2.x | Recharts 3.7.x | Recharts 3.x has full React 19 support; earlier versions needed workarounds |
| React 19.2.x | shadcn/ui (2026-02) | Full support confirmed; unified radix-ui package |
| Tailwind CSS 4.2.x | Vite 7.x | First-party @tailwindcss/vite plugin; no PostCSS config needed |
| Tailwind CSS 4.2.x | shadcn/ui (2026-02) | shadcn/ui updated for Tailwind v4 CSS-based config |
| Hono 4.12.x | @hono/node-server | Required adapter for Node.js; install both |
| tsup 8.5.x | TypeScript 5.7.x | Fully compatible |
| Vitest 4.0.x | Vite 7.x | Same underlying engine; guaranteed compatibility |
| Commander 14.x | Node.js 22+ | Requires Node.js 20+ minimum |

## Installation

```bash
# Core frontend
npm install react react-dom recharts zustand date-fns zod clsx tailwind-merge

# Server
npm install hono @hono/node-server

# CLI
npm install commander open

# Dev dependencies - frontend build
npm install -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite vite-plugin-singlefile

# Dev dependencies - CLI build
npm install -D tsup typescript @types/node

# Dev dependencies - testing
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# Dev dependencies - code quality
npm install -D eslint prettier typescript-eslint

# shadcn/ui (run interactively)
npx shadcn@latest init
npx shadcn@latest add chart card tabs select button
```

## Competitor Stack Reference

**ccusage** (primary competitor, CLI-only):
- TypeScript, pnpm monorepo
- gunshi (CLI framework), Hono (MCP server)
- tsdown (bundler), bun (dev runtime)
- LiteLLM pricing database
- **No web dashboard** -- this is yclaude's key differentiator

yclaude should learn from ccusage's obsession with bundle size (all deps bundled as devDependencies, extreme tree-shaking) but add the web dashboard layer that ccusage lacks.

## Sources

- [Chart.js vs Recharts ecosystem comparison](https://embeddable.com/blog/javascript-charting-libraries) -- MEDIUM confidence (aggregator blog, verified against npm data)
- [shadcn/ui official chart docs](https://ui.shadcn.com/docs/components/radix/chart) -- HIGH confidence (official docs)
- [shadcn/ui Feb 2026 changelog](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui) -- HIGH confidence (official changelog)
- [Hono official Node.js docs](https://hono.dev/docs/getting-started/nodejs) -- HIGH confidence (official docs)
- [Hono npm: v4.12.2](https://www.npmjs.com/package/hono) -- HIGH confidence (npm registry)
- [React npm: v19.2.4](https://react.dev/blog/2025/10/01/react-19-2) -- HIGH confidence (official blog)
- [Vite npm: v7.3.1](https://www.npmjs.com/package/vite) -- HIGH confidence (npm registry)
- [Recharts npm: v3.7.0](https://www.npmjs.com/package/recharts) -- HIGH confidence (npm registry)
- [Zustand npm: v5.0.11](https://www.npmjs.com/package/zustand) -- HIGH confidence (npm registry)
- [TanStack Router npm: v1.163.x](https://www.npmjs.com/package/@tanstack/react-router) -- HIGH confidence (npm registry)
- [Commander npm: v14.0.3](https://www.npmjs.com/package/commander) -- HIGH confidence (npm registry)
- [tsup npm: v8.5.1](https://www.npmjs.com/package/tsup) -- HIGH confidence (npm registry)
- [vite-plugin-singlefile npm: v2.3.0](https://www.npmjs.com/package/vite-plugin-singlefile) -- HIGH confidence (npm registry)
- [Vitest npm: v4.0.18](https://www.npmjs.com/package/vitest) -- HIGH confidence (npm registry)
- [Tailwind CSS npm: v4.2.1](https://www.npmjs.com/package/tailwindcss) -- HIGH confidence (npm registry)
- [date-fns npm: v4.1.0](https://www.npmjs.com/package/date-fns) -- HIGH confidence (npm registry)
- [TanStack Query npm: v5.90.x](https://www.npmjs.com/package/@tanstack/react-query) -- HIGH confidence (npm registry)
- [ccusage GitHub](https://github.com/ryoppippi/ccusage) -- HIGH confidence (primary source)
- [ryoppippi JS CLI stack 2025](https://ryoppippi.com/blog/2025-08-12-my-js-cli-stack-2025-en) -- MEDIUM confidence (individual blog, but from ccusage author)
- [Zustand vs Jotai comparison 2026](https://inhaq.com/blog/react-state-management-2026-redux-vs-zustand-vs-jotai.html) -- MEDIUM confidence (verified against multiple sources)
- [TanStack Router vs React Router 2026](https://medium.com/ekino-france/tanstack-router-vs-react-router-v7-32dddc4fcd58) -- MEDIUM confidence (verified with official TanStack docs)
- [Chrome 144 Temporal API](https://www.infoq.com/news/2026/02/chrome-temporal-date-api/) -- HIGH confidence (InfoQ verified)
- [Building CLI apps with TypeScript in 2026](https://dev.to/hongminhee/building-cli-apps-with-typescript-in-2026-5c9d) -- MEDIUM confidence (community source)
- [tsdown vs tsup comparison](https://alan.norbauer.com/articles/tsdown-bundler/) -- MEDIUM confidence (individual blog, verified with npm data)

---
*Stack research for: yclaude (AI coding analytics dashboard)*
*Researched: 2026-02-28*
