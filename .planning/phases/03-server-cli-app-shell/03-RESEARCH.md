# Phase 3: Server, CLI & App Shell - Research

**Researched:** 2026-02-28
**Domain:** Hono HTTP server + Node.js CLI + Vite/React SPA shell
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Bundler:** Vite (separate from tsup backend build)
- **Styling:** Tailwind CSS
- **Routing:** React Router v7 with `createHashRouter` (hash-based, zero server config)
- **Project structure:** `/web` directory at project root, separate `package.json` for frontend deps
  - Backend: `src/` (untouched), builds to `dist/` via tsup
  - Frontend: `web/`, builds to `web-dist/` via Vite
  - Hono serves static assets from `web-dist/`
- **Layout:** Left sidebar
- **Nav items (Phase 3 shell defines all 4):** Overview, Models, Projects, Sessions
- **Placeholder pages:** "Coming soon" card with page name
- **Sidebar header:** "yclaude" text logo at top
- **Verbosity:** Minimal terminal output — version + URL + open message only
  ```
  yclaude v0.1.0
  Local: http://127.0.0.1:3000
  ✓ Opening browser...
  Press Ctrl+C to stop
  ```
- **Color:** Minimal — green checkmark for success, bold URL
- **`--no-open` / auto-open failure:** Print URL prominently: `→ Open http://127.0.0.1:3000 in your browser`
- **API Phase 3 builds:** One real endpoint — `GET /api/v1/summary`
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLI-01 | User can run `npx yclaude` with zero installation and have a browser tab open automatically | `open` package (v11, ESM-only) + `#!/usr/bin/env node` shebang in CLI entry; tsup auto-makes executable when shebang is present |
| CLI-02 | User can customize behavior via `--dir <path>`, `--port <n>`, and `--no-open` flags | Commander.js v14 with `.option('-p, --port <number>')` and negatable `--no-open` pattern |
| CORE-04 | Server binds to 127.0.0.1 exclusively; CSP headers block external requests; zero telemetry | `@hono/node-server` `serve({ hostname: '127.0.0.1' })`; `secureHeaders()` with restrictive CSP `defaultSrc: ["'none'"]` |
</phase_requirements>

## Summary

Phase 3 assembles three distinct concerns: (1) a Node.js CLI entry point that parses flags and launches a server, (2) a Hono HTTP server that serves static assets and exposes API routes, and (3) a Vite-built React SPA shell with left-nav layout. These three parts each have well-established patterns that compose cleanly; the main complexity is in the build orchestration — two separate build systems (tsup for backend, Vite for frontend) that must produce output the server can find at runtime.

The technology choices are mature and well-documented. Hono v4.12.3 with `@hono/node-server` v1.19.9 is production-ready and has explicit `hostname` binding support for `127.0.0.1`. Commander.js v14 handles the CLI flag parsing idiomatically with the `--no-open` negatable flag pattern built in. The `open` package v11 (ESM-only, matches the project's `"type": "module"`) handles cross-platform browser launch. Tailwind v4 with the `@tailwindcss/vite` plugin eliminates the old `tailwind.config.js` entirely — CSS-first configuration via `@import "tailwindcss"`.

The key build insight: the `web/` directory needs its own `package.json` (to isolate frontend deps from the npm binary consumers), its own `vite.config.ts` (setting `outDir: '../web-dist'`), and the root `tsup.config.ts` needs a second entry `src/server/cli.ts` alongside the existing `src/index.ts`. The Hono server uses `serveStatic` for SPA assets plus a catch-all route returning `index.html` for all non-API paths (enabling hash-based routing).

**Primary recommendation:** Build in this sequence: CLI entry → Hono server with static serving + CSP → `GET /api/v1/summary` endpoint → React SPA scaffold → Tailwind + sidebar layout → stitch builds with root `package.json` scripts.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `hono` | 4.12.3 | HTTP framework | Tiny, fast, first-class TypeScript; `@hono/node-server` is the official Node.js adapter |
| `@hono/node-server` | 1.19.9 | Node.js HTTP adapter for Hono | Required to run Hono on Node; exposes `serve()` with `hostname` option |
| `commander` | 14.0.3 | CLI flag parsing | De facto standard for Node.js CLIs; handles `--no-open` negatable flags natively |
| `open` | 11.0.0 | Open browser cross-platform | Handles macOS/Windows/Linux differences; pure ESM matches project's `"type": "module"` |
| `vite` | 7.3.1 | Frontend build tool | Fastest dev/build for React SPAs; used per user decision |
| `@vitejs/plugin-react` | 5.1.4 | Vite React JSX transform | Official plugin; Fast Refresh + JSX runtime |
| `tailwindcss` | 4.2.1 | Utility CSS framework | User decision; v4 requires `@tailwindcss/vite` plugin (no config file needed) |
| `@tailwindcss/vite` | 4.x | Tailwind v4 Vite integration | Required for Tailwind v4 — replaces `tailwind.config.js` |
| `react` | 19.2.4 | UI framework | User decision for SPA shell |
| `react-dom` | 19.2.4 | React DOM renderer | Required with React |
| `react-router` | 7.13.1 | Client-side routing | User decision; `createHashRouter` for zero server config |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `concurrently` OR `npm-run-all2` | 9.2.1 / 8.0.4 | Parallel dev scripts | Root `package.json` dev script runs tsup watch + vite dev simultaneously |
| `@types/react` | 19.2.14 | React TypeScript types | Required for TSX in web/ |
| `@types/react-dom` | 19.2.3 | React DOM TypeScript types | Required for ReactDOM.createRoot |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `commander` | Node.js built-in `util.parseArgs` | parseArgs is zero-dep but less ergonomic for `--no-open` negation and help generation |
| `open` | `child_process.spawn` with platform detection | open handles 3 platforms, edge cases (WSL, Snap), and race conditions; don't hand-roll |
| `concurrently` | `npm-run-all2` | Both work; `concurrently` has more output formatting options; `npm-run-all2` is smaller. Either is fine — user's discretion |

**Installation (root package — backend/CLI deps):**
```bash
npm install hono @hono/node-server commander open
```

**Installation (web/ package — frontend deps):**
```bash
cd web && npm install vite @vitejs/plugin-react tailwindcss @tailwindcss/vite react react-dom react-router
cd web && npm install -D @types/react @types/react-dom typescript
```

**Installation (root devDeps — build orchestration):**
```bash
npm install -D concurrently   # or npm-run-all2
```

## Architecture Patterns

### Recommended Project Structure
```
yclaude/                         # existing root
├── src/                         # EXISTING — untouched
│   ├── index.ts                 # existing public API (parseAll, computeCosts, etc.)
│   ├── server/                  # NEW — server and CLI code
│   │   ├── cli.ts               # NEW — CLI entry point (shebang, Commander, open)
│   │   ├── server.ts            # NEW — Hono app factory
│   │   └── routes/
│   │       └── api.ts           # NEW — /api/v1/* route handlers
│   ├── parser/                  # EXISTING
│   └── cost/                    # EXISTING
├── web/                         # NEW — Vite frontend
│   ├── package.json             # NEW — frontend deps isolated here
│   ├── tsconfig.json            # NEW — TSX config (DOM lib)
│   ├── vite.config.ts           # NEW — outDir: '../web-dist'
│   ├── index.html               # NEW — SPA entry point
│   └── src/
│       ├── main.tsx             # NEW — ReactDOM.createRoot
│       ├── App.tsx              # NEW — router provider + layout
│       ├── index.css            # NEW — @import "tailwindcss"
│       ├── components/
│       │   └── Layout.tsx       # NEW — sidebar + outlet
│       └── pages/
│           ├── Overview.tsx     # NEW — placeholder
│           ├── Models.tsx       # NEW — placeholder
│           ├── Projects.tsx     # NEW — placeholder
│           └── Sessions.tsx     # NEW — placeholder
├── web-dist/                    # GENERATED by Vite build — gitignored
├── dist/                        # EXISTING — generated by tsup
├── tsup.config.ts               # MODIFIED — add src/server/cli.ts entry
├── package.json                 # MODIFIED — add bin, scripts, deps
└── tsconfig.json                # EXISTING — no changes needed (rootDir: src/)
```

### Pattern 1: Hono Server Factory

The server is created as a factory function (not a module-level singleton) so it can be tested without side effects.

```typescript
// src/server/server.ts
// Source: https://hono.dev/docs/getting-started/nodejs
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { secureHeaders } from 'hono/secure-headers';
import type { NormalizedEvent } from '../parser/types.js';
import type { CostEvent } from '../cost/types.js';

export interface AppState {
  events: NormalizedEvent[];
  costs: CostEvent[];
}

export function createApp(state: AppState): Hono {
  const app = new Hono();

  // Security headers — apply globally
  app.use('*', secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  }));

  // API routes registered BEFORE static serving
  app.get('/api/v1/summary', (c) => {
    // ... aggregate from state
  });

  // Static assets from Vite build
  app.use('/*', serveStatic({ root: './web-dist' }));

  // SPA fallback — all non-API routes serve index.html (hash router handles the rest)
  app.get('*', serveStatic({ path: './web-dist/index.html' }));

  return app;
}
```

### Pattern 2: CLI Entry Point with Shebang

tsup automatically detects the `#!/usr/bin/env node` shebang and makes the output file executable (no manual `chmod +x` needed).

```typescript
// src/server/cli.ts
#!/usr/bin/env node
// Source: https://github.com/tj/commander.js#readme
import { program } from 'commander';
import { serve } from '@hono/node-server';
import open from 'open';
import { parseAll } from '../index.js';
import { computeCosts } from '../cost/engine.js';
import { createApp } from './server.js';

program
  .name('yclaude')
  .version('0.1.0')
  .option('-d, --dir <path>', 'custom data directory')
  .option('-p, --port <number>', 'port number', '3000')
  .option('--no-open', 'do not open browser automatically')
  .parse();

const opts = program.opts<{
  dir?: string;
  port: string;
  open: boolean;        // --no-open sets this to false
}>();

const port = parseInt(opts.port, 10);
const url = `http://127.0.0.1:${port}`;

// Load data at startup
const events = await parseAll({ dir: opts.dir });
const costs = computeCosts(events);

const app = createApp({ events, costs });

serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => {
  console.log(`yclaude v0.1.0`);
  console.log(`Local: \x1b[1m${url}\x1b[0m`);

  if (opts.open) {
    console.log('\x1b[32m✓\x1b[0m Opening browser...');
    open(url).catch(() => {
      console.log(`→ Open ${url} in your browser`);
    });
  } else {
    console.log(`→ Open ${url} in your browser`);
  }

  console.log('Press Ctrl+C to stop');
});
```

### Pattern 3: tsup Multi-Entry Configuration

```typescript
// tsup.config.ts — modified from existing
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/server/cli.ts'],  // Add CLI entry
  format: ['esm'],
  target: 'node22',
  clean: true,
  dts: true,        // dts only needed for src/index.ts (library); cli.ts doesn't need it
  sourcemap: true,
});
```

Note: tsup generates `dist/index.js` and `dist/server/cli.js`. The `package.json` `bin` field currently points to `dist/index.js` — this must be updated to `dist/server/cli.js`.

### Pattern 4: Vite Configuration for Nested Frontend

```typescript
// web/vite.config.ts
// Source: https://vite.dev/config/build-options
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../web-dist',       // output relative to web/ — lands at project root
    emptyOutDir: true,
  },
  // appType defaults to 'spa' — correct for this use case
});
```

### Pattern 5: React Router v7 with createHashRouter

```tsx
// web/src/App.tsx
// Source: https://reactrouter.com/home (Data Routers section)
import { createHashRouter, RouterProvider } from 'react-router';
import Layout from './components/Layout.js';
import Overview from './pages/Overview.js';
import Models from './pages/Models.js';
import Projects from './pages/Projects.js';
import Sessions from './pages/Sessions.js';

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Overview /> },
      { path: 'models', element: <Models /> },
      { path: 'projects', element: <Projects /> },
      { path: 'sessions', element: <Sessions /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
```

### Pattern 6: Tailwind CSS v4 (CSS-First, No Config File)

```css
/* web/src/index.css */
/* Source: https://tailwindcss.com/docs/installation/using-vite */
@import "tailwindcss";
```

No `tailwind.config.js` needed. The Vite plugin (`@tailwindcss/vite`) handles content scanning automatically.

### Pattern 7: package.json bin and scripts wiring

```json
// root package.json modifications
{
  "bin": {
    "yclaude": "./dist/server/cli.js"   // Updated from ./dist/index.js
  },
  "scripts": {
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "tsup",
    "build:frontend": "cd web && npm run build",
    "dev": "concurrently \"tsup --watch\" \"cd web && vite\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit && cd web && tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.12.3",
    "@hono/node-server": "^1.19.9",
    "commander": "^14.0.3",
    "open": "^11.0.0",
    "zod": "^4.3.6"
  }
}
```

### Anti-Patterns to Avoid

- **Putting frontend deps in root `package.json`**: They'd be bundled into the npm package consumers download. Frontend deps belong in `web/package.json`.
- **Binding server to `0.0.0.0` or omitting `hostname`**: Default Node.js HTTP server may bind to all interfaces. Always pass `hostname: '127.0.0.1'` explicitly.
- **Using `createBrowserRouter` instead of `createHashRouter`**: Browser router requires server-side catch-all for deep links. Hash router works with static file serving with no server config.
- **Registering static routes BEFORE API routes**: `serveStatic` will intercept `/api/v1/summary` requests. API routes MUST be registered first.
- **Omitting shebang in CLI entry**: Without `#!/usr/bin/env node`, `npx yclaude` will not execute — Node.js cannot infer the runtime without it.
- **`dts: true` for CLI entry in tsup**: Declaration files for the CLI binary are meaningless and slow the build. Consider per-entry `dts` control or accept the generated `.d.ts` as harmless.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser auto-open | Custom `child_process` + platform detection | `open` package v11 | Handles WSL, Snap-packaged browsers, race conditions, Windows `start` vs macOS `open` vs Linux `xdg-open` |
| CLI flag parsing | `process.argv.slice(2)` manual parsing | `commander` v14 | `--no-open` negation, auto-generated `--help`, type coercion, validation |
| CSP header construction | Manual `res.setHeader('Content-Security-Policy', ...)` | `hono/secure-headers` | Covers 20+ security headers with correct defaults; avoids directive typos |
| Static file serving with MIME types | Manual `fs.readFile` + MIME lookup | `@hono/node-server/serve-static` | Handles MIME types, range requests, `ETag`, `Last-Modified`, gzip precompressed |
| Frontend bundling | Webpack/Rollup manual config | Vite (user decision) | Zero-config SPA support, HMR, Rollup-based production build |

**Key insight:** The "simple" parts of a server CLI (open browser, parse flags, serve files) each have subtle platform-specific or security edge cases that mature packages handle. None of them are worth hand-rolling for a local-first tool.

## Common Pitfalls

### Pitfall 1: Static Serving Path Resolution at Runtime

**What goes wrong:** `serveStatic({ root: './web-dist' })` resolves relative to `process.cwd()`. When users run `npx yclaude` from their home directory, `./web-dist` doesn't exist there — only in the package installation directory.

**Why it happens:** `serveStatic` uses `process.cwd()` not `import.meta.url` for path resolution in Hono's Node.js adapter.

**How to avoid:** Use `path.join(new URL(import.meta.url).pathname, '../../..', 'web-dist')` or `fileURLToPath(new URL('../../../web-dist', import.meta.url))` to compute the absolute path from the CLI file's location. Pass the absolute path to `serveStatic({ root: absolutePath })`.

**Warning signs:** Works during `npm run dev` but fails when installed via `npx`. Test by `cd /tmp && npx yclaude` (before publishing).

### Pitfall 2: `open` Package is ESM-Only

**What goes wrong:** `import open from 'open'` works, but if any code path requires it with `require()` or if tsup bundles it as CJS, the import fails at runtime.

**Why it happens:** `open` v10+ dropped CJS. The project uses `"type": "module"` and tsup outputs ESM, so this is fine by default — but any accidental CJS format configuration breaks it.

**How to avoid:** Ensure tsup `format: ['esm']` (already configured). Do NOT add `'cjs'` to the CLI entry format. Verify `dist/server/cli.js` is valid ESM after build.

**Warning signs:** `ERR_REQUIRE_ESM` or `SyntaxError: Cannot use import statement` in the `open` module.

### Pitfall 3: Commander --no-open Flag Name Collision

**What goes wrong:** Commander normalizes `--no-open` to `opts.open = false`. If you declare `.option('--open', ...)` AND `.option('--no-open', ...)`, Commander creates a conflict.

**Why it happens:** Commander's negatable boolean pattern works by declaring ONLY `.option('--no-open', ...)` — this automatically creates a `open` property defaulting to `true` that becomes `false` when `--no-open` is passed.

**How to avoid:** Declare only the negative form: `.option('--no-open', 'do not open browser automatically')`. Access via `opts.open` (boolean). Do NOT declare a positive `--open` option.

**Warning signs:** `opts.open` is always `undefined` instead of `true` by default.

### Pitfall 4: Hono serveStatic and SPA Catch-All Order

**What goes wrong:** If the SPA fallback catch-all `app.get('*', serveStatic({ path: './web-dist/index.html' }))` is registered before API routes, API routes never execute.

**Why it happens:** Hono routes match in registration order. A `*` catch-all registered first wins.

**How to avoid:** Register API routes first, then `serveStatic` for assets, then the `index.html` fallback last.

**Warning signs:** `GET /api/v1/summary` returns HTML instead of JSON.

### Pitfall 5: Tailwind v4 Content Path Detection

**What goes wrong:** Tailwind v4's automatic content scanning may miss `web/src/**/*.tsx` files if vite.config.ts is not in the web/ directory root.

**Why it happens:** The `@tailwindcss/vite` plugin scans from the Vite project root (the `web/` directory). As long as `vite.config.ts` is in `web/`, auto-detection works.

**How to avoid:** Keep `vite.config.ts` inside `web/` (not at project root). No explicit `content` configuration needed for v4.

**Warning signs:** Tailwind classes in `.tsx` files have no effect in production build.

### Pitfall 6: tsup dts and the CLI Entry

**What goes wrong:** tsup with `dts: true` tries to generate type declarations for `src/server/cli.ts`. Since `cli.ts` has a shebang comment as its first line (`#!/usr/bin/env node`), this may confuse the TypeScript compiler for `.d.ts` generation.

**Why it happens:** `#!/usr/bin/env node` is not valid TypeScript — TypeScript ignores it at runtime compilation but may error during declaration emit.

**How to avoid:** Either (a) accept the harmless `.d.ts` file generated (TypeScript strips the shebang), or (b) use `dts: { entry: ['src/index.ts'] }` to limit declaration output to the library entry only.

**Warning signs:** `tsup build` fails with TS error on the shebang line.

## Code Examples

Verified patterns from official sources:

### Hono serve() with hostname binding
```typescript
// Source: https://github.com/honojs/node-server (server.ts — hostname option confirmed)
import { serve } from '@hono/node-server';

serve({
  fetch: app.fetch,
  port: 3000,
  hostname: '127.0.0.1',   // Explicitly bind to loopback only
}, (info) => {
  console.log(`Listening on http://${info.address}:${info.port}`);
});
```

### Commander --no-open negatable boolean
```typescript
// Source: https://github.com/tj/commander.js#readme (Negatable boolean options)
program
  .option('--no-open', 'do not open browser automatically');

program.parse();
const opts = program.opts();
// opts.open === true  (default when --no-open not passed)
// opts.open === false (when --no-open is passed)
```

### Hono secureHeaders with blocking CSP
```typescript
// Source: https://hono.dev/docs/middleware/builtin/secure-headers
import { secureHeaders } from 'hono/secure-headers';

app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'none'"],       // Block everything by default
    scriptSrc: ["'self'"],        // Scripts: same origin only
    styleSrc: ["'self'", "'unsafe-inline'"],  // Styles + Tailwind inline
    imgSrc: ["'self'", 'data:'],  // Images + data URIs
    connectSrc: ["'self'"],       // XHR/fetch: same origin only
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
  },
}));
```

### Hono SPA serving pattern (API-first, static-second, fallback-third)
```typescript
// Source: WebSearch verified — https://github.com/orgs/honojs/discussions/4390
import { serveStatic } from '@hono/node-server/serve-static';

// 1. API routes
app.get('/api/v1/summary', (c) => c.json(summary));

// 2. Static assets (JS, CSS, images)
app.use('/*', serveStatic({ root: absoluteWebDistPath }));

// 3. SPA fallback — must be last
app.get('*', serveStatic({ path: path.join(absoluteWebDistPath, 'index.html') }));
```

### Tailwind v4 with Vite — complete vite.config.ts
```typescript
// Source: https://tailwindcss.com/docs/installation/using-vite
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../web-dist',
    emptyOutDir: true,
  },
});
```

### react-router createHashRouter (v7 declarative mode)
```tsx
// Source: https://reactrouter.com/home (Data Routers)
import { createHashRouter, RouterProvider, Outlet } from 'react-router';

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Overview /> },
      { path: 'models', element: <Models /> },
    ],
  },
]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` with `content` array | `@import "tailwindcss"` + Vite plugin, no config file | Tailwind v4 (2025) | Simpler setup; auto content detection |
| `@tailwind base; @tailwind components;` directives | Single `@import "tailwindcss"` | Tailwind v4 (2025) | Old directives fail in v4 |
| `react-router-dom` (separate package) | `react-router` (unified package) | React Router v7 (2024) | `react-router-dom` still works but `react-router` is the canonical import |
| Express.js for simple local servers | Hono + `@hono/node-server` | 2023-2024 | Hono has zero platform lock-in; same code runs on Workers/Bun/Node |

**Deprecated/outdated:**
- `tailwind.config.js`: Not needed in Tailwind v4. Do not create it.
- `react-router-dom` package: Use `react-router` directly in v7. Both work but `react-router` is canonical.
- `@tailwind base;` / `@tailwind components;` / `@tailwind utilities;` directives: Replaced by `@import "tailwindcss"` in v4.

## Open Questions

1. **Absolute path for serveStatic at runtime**
   - What we know: `serveStatic` uses `process.cwd()` for relative paths; `import.meta.url` gives the CLI file's runtime location
   - What's unclear: Whether `@hono/node-server` `serveStatic` accepts absolute paths in its `root` option (it should, as it uses Node.js `fs` underneath)
   - Recommendation: Use `fileURLToPath(new URL('../../../web-dist', import.meta.url))` to compute absolute path; verify with integration test

2. **tsup dts with shebang line**
   - What we know: tsup auto-detects shebangs for executable permission; TypeScript may or may not error on shebang during dts emit
   - What's unclear: Whether the current tsup v8.5.1 handles shebang in dts generation correctly
   - Recommendation: Try `dts: true` first; if it errors, use `dts: { entry: ['src/index.ts'] }` to limit to library only

3. **web/ package.json for npm publish**
   - What we know: `web/package.json` isolates frontend deps; but when user runs `npx yclaude`, they install the root package (not web/)
   - What's unclear: Whether `npm publish` needs a `.npmignore` to exclude `web/node_modules` and `web/src`
   - Recommendation: Add `.npmignore` (or `"files"` field in package.json) to include only `dist/` and `web-dist/`; exclude `web/node_modules`, `src/`, `web/src/`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest v4.0.18 |
| Config file | `/Users/ishevtsov/ai-projects/yclaude/vitest.config.ts` (exists, `environment: 'node'`) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLI-01 | `npx yclaude` starts server; browser auto-opens | smoke/manual | manual only — requires actual browser | ❌ manual-only (no automated equivalent) |
| CLI-02 | `--dir`, `--port`, `--no-open` flags parse correctly | unit | `npm test -- src/server/__tests__/cli.test.ts` | ❌ Wave 0 |
| CLI-02 | Server binds to specified port | integration | `npm test -- src/server/__tests__/server.test.ts` | ❌ Wave 0 |
| CORE-04 | Server binds to 127.0.0.1 | integration | `npm test -- src/server/__tests__/server.test.ts` | ❌ Wave 0 |
| CORE-04 | CSP headers present and correct | integration | `npm test -- src/server/__tests__/server.test.ts` | ❌ Wave 0 |
| CORE-04 | `GET /api/v1/summary` returns correct shape | integration | `npm test -- src/server/__tests__/api.test.ts` | ❌ Wave 0 |

**Manual-only justification for CLI-01 (browser open):** Opening a real browser tab requires a display and cannot be asserted in a headless Node.js test. The `open` package call can be mocked to verify it's called with the correct URL — this is the testable boundary.

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/server/__tests__/cli.test.ts` — covers CLI-02 (option parsing; mock `open`, mock `serve`)
- [ ] `src/server/__tests__/server.test.ts` — covers CORE-04 (Hono app factory; CSP headers; 127.0.0.1 binding)
- [ ] `src/server/__tests__/api.test.ts` — covers CORE-04 (`GET /api/v1/summary` response shape)
- [ ] SPA visual tests are manual-only — no Wave 0 setup needed for frontend components

## Sources

### Primary (HIGH confidence)
- `https://hono.dev/docs/getting-started/nodejs` — serve() options, serveStatic usage
- `https://hono.dev/docs/middleware/builtin/secure-headers` — secureHeaders CSP API
- `https://github.com/honojs/node-server/blob/main/src/server.ts` — confirmed `hostname` option in serve()
- `https://tailwindcss.com/docs/installation/using-vite` — Tailwind v4 Vite setup, `@import "tailwindcss"`, no config file
- `https://github.com/tj/commander.js#readme` — Commander v14 option API, `--no-open` negatable boolean
- `https://github.com/sindresorhus/open/blob/main/readme.md` — open() API, ESM-only requirement
- `https://reactrouter.com/home` — React Router v7 `createHashRouter` in Data Routers section
- `npm info` commands — verified versions: hono@4.12.3, @hono/node-server@1.19.9, vite@7.3.1, react-router@7.13.1, tailwindcss@4.2.1, commander@14.0.3, open@11.0.0

### Secondary (MEDIUM confidence)
- `https://vite.dev/config/shared-options` — `appType: 'spa'` default, `root` and `base` options
- `https://vite.dev/config/build-options` — `build.outDir` default (`dist`), `build.emptyOutDir`
- WebSearch "Hono serveStatic SPA index.html fallback 2025" — confirmed catch-all pattern; cross-verified with hono.dev

### Tertiary (LOW confidence)
- WebSearch "tsup config entry array shebang banner 2025" — shebang auto-executable claim; unverified against tsup v8.5.1 changelog but consistent across multiple sources and with known tsup behavior

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via `npm info`; APIs verified via official docs
- Architecture: HIGH — patterns drawn from official Hono, Vite, React Router, Commander docs
- Pitfalls: MEDIUM — most pitfalls are verified (CSP ordering, static paths, Commander negation); path resolution at runtime is LOW (plausible but not end-to-end tested)
- Tailwind v4 specifics: HIGH — official docs confirm `@import "tailwindcss"` and plugin-only setup

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable libraries; Tailwind v4 and React Router v7 are relatively recent but stable)
