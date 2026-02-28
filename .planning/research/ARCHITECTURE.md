# Architecture Research

**Domain:** npm-distributed local-first analytics dashboard (CLI + web)
**Researched:** 2026-02-28
**Confidence:** HIGH

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLI Layer (bin/yclaude)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐    │
│  │ Arg Parser   │  │ Config       │  │ Browser Launcher         │    │
│  │ (commander)  │  │ Resolver     │  │ (open)                   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────────┘    │
│         │                 │                                          │
├─────────┴─────────────────┴──────────────────────────────────────────┤
│                         Server Layer (Hono + @hono/node-server)       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐    │
│  │ API Routes   │  │ Static Asset │  │ SPA Fallback             │    │
│  │ /api/*       │  │ Serving      │  │ (index.html)             │    │
│  └──────┬───────┘  └──────────────┘  └──────────────────────────┘    │
│         │                                                            │
├─────────┴────────────────────────────────────────────────────────────┤
│                         Data Layer (Provider Abstraction)             │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                  DataProvider Interface                        │    │
│  │  getSessions() getProjects() getUsage() getTimeline()         │    │
│  └──────────┬───────────────────────────────┬────────────────────┘    │
│  ┌──────────┴──────────┐       ┌────────────┴──────────────────┐     │
│  │ LocalFSProvider     │       │ CloudAPIProvider (Phase 2+)   │     │
│  │ reads ~/.claude     │       │ fetches from REST API         │     │
│  └──────────┬──────────┘       └───────────────────────────────┘     │
│             │                                                        │
├─────────────┴────────────────────────────────────────────────────────┤
│                         Parser Layer (JSONL Processing)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐    │
│  │ JSONL Reader │  │ Event        │  │ Aggregation Engine       │    │
│  │ (streaming)  │  │ Normalizer   │  │ (cost, tokens, time)     │    │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                  FormatAdapter Interface                       │    │
│  │  ┌─────────────────┐  ┌─────────────────┐                    │    │
│  │  │ ClaudeCode      │  │ Future: Cursor,  │                    │    │
│  │  │ Adapter         │  │ Copilot, etc.    │                    │    │
│  │  └─────────────────┘  └─────────────────┘                    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                         Frontend (Pre-built React SPA)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐    │
│  │ Dashboard    │  │ Charts       │  │ Session Explorer         │    │
│  │ Views        │  │ (Recharts)   │  │ (drill-down)             │    │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐                                  │
│  │ Filter       │  │ Data Fetcher │                                  │
│  │ Controls     │  │ (API client) │                                  │
│  └──────────────┘  └──────────────┘                                  │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **CLI Entry** | Parse args (`--port`, `--dir`, `--no-open`), resolve config, bootstrap server | `commander` or `citty`; `bin` field in package.json |
| **HTTP Server** | Serve API routes + pre-built static frontend assets | Hono + `@hono/node-server` with `serveStatic` |
| **API Routes** | Expose parsed/aggregated data as JSON endpoints | Hono route handlers under `/api/v1/*` |
| **Static Asset Server** | Serve the pre-built React SPA from embedded dist | `serveStatic` with `import.meta.dirname` for absolute path resolution |
| **SPA Fallback** | Return `index.html` for any non-API, non-asset route | Catch-all middleware after API routes |
| **DataProvider** | Abstract interface over data sources (local FS vs cloud API) | TypeScript interface with `LocalFSProvider` and future `CloudAPIProvider` |
| **FormatAdapter** | Normalize tool-specific JSONL into canonical event schema | Adapter pattern; `ClaudeCodeAdapter` first, others later |
| **JSONL Reader** | Stream-read `.jsonl` files, parse line-by-line | Node.js `readline` + `createReadStream`, or `ndjson` |
| **Event Normalizer** | Transform raw events into typed canonical records | Maps Claude Code fields to `NormalizedEvent` type |
| **Aggregation Engine** | Compute costs, token sums, session durations, project totals | Pure functions over normalized events; pricing table lookup |
| **Frontend SPA** | Interactive dashboard with charts, filters, drill-downs | React + Vite (built at publish time, not runtime) |
| **Browser Launcher** | Auto-open `localhost:PORT` after server starts | `open` npm package |

## Recommended Project Structure

```
yclaude/
├── src/
│   ├── cli/
│   │   ├── index.ts           # CLI entrypoint (bin target)
│   │   ├── args.ts            # Argument parsing and validation
│   │   └── config.ts          # Config resolution (defaults, env, flags)
│   ├── server/
│   │   ├── index.ts           # Hono app factory
│   │   ├── routes/
│   │   │   ├── api.ts         # /api/v1/* route definitions
│   │   │   ├── projects.ts    # GET /api/v1/projects
│   │   │   ├── sessions.ts    # GET /api/v1/sessions
│   │   │   ├── usage.ts       # GET /api/v1/usage (aggregated)
│   │   │   └── timeline.ts    # GET /api/v1/timeline
│   │   └── static.ts          # Static asset + SPA fallback middleware
│   ├── data/
│   │   ├── provider.ts        # DataProvider interface
│   │   ├── local-provider.ts  # LocalFSProvider implementation
│   │   └── types.ts           # Canonical data types
│   ├── parser/
│   │   ├── reader.ts          # JSONL file discovery and streaming
│   │   ├── normalizer.ts      # Raw event → NormalizedEvent
│   │   └── adapters/
│   │       ├── adapter.ts     # FormatAdapter interface
│   │       └── claude-code.ts # Claude Code JSONL adapter
│   ├── aggregation/
│   │   ├── cost.ts            # Token → cost calculation
│   │   ├── pricing.ts         # Model pricing table (static data)
│   │   ├── timeline.ts        # Time-bucketed aggregations
│   │   └── summary.ts         # Project/session summaries
│   └── shared/
│       ├── types.ts           # Shared TypeScript types
│       └── utils.ts           # Date formatting, slug decoding, etc.
├── web/                       # Frontend SPA (separate Vite project)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Projects.tsx
│   │   │   ├── Sessions.tsx
│   │   │   └── SessionDetail.tsx
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   ├── filters/
│   │   │   └── layout/
│   │   ├── hooks/
│   │   │   └── useApi.ts      # Fetch wrapper for /api/v1/*
│   │   └── lib/
│   │       ├── api.ts         # API client
│   │       └── format.ts      # Display formatting, humorous copy
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json           # Web-only devDependencies
├── dist/                      # Built backend (tsup output)
├── web-dist/                  # Built frontend (vite build output, committed or built at prepublish)
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

### Structure Rationale

- **`src/cli/`:** Isolates CLI concerns (arg parsing, config) from server logic. The CLI is a thin shell that configures and starts the server -- it should have near-zero business logic.
- **`src/server/`:** Hono app factory pattern. The server can be created by the CLI (Phase 1) or imported by a cloud deployment (Phase 2) without modification. Routes are split by resource.
- **`src/data/`:** The DataProvider interface is the critical abstraction boundary. Phase 1 implements `LocalFSProvider`. Phase 2 adds `CloudAPIProvider`. The server routes never know which provider they are using.
- **`src/parser/`:** Separated from data providers because parsing is reusable. The `adapters/` subfolder uses the Adapter pattern for multi-tool support. Adding Cursor support means adding `cursor.ts` -- no changes to existing code.
- **`src/aggregation/`:** Pure functions with no I/O. Takes normalized events, returns aggregated results. Easy to test, easy to reuse across providers.
- **`web/`:** A separate Vite project. During development, run Vite dev server with proxy to the Hono backend. At publish time, `vite build` outputs to `web-dist/` which the Hono static middleware serves.
- **Single package, not monorepo:** For Phase 1, a single npm package is simpler. The `web/` directory is a build-time concern only -- it produces static assets that ship with the package. Avoid monorepo complexity until Phase 3+ when a shared SDK or separate cloud service may justify it.

## Architectural Patterns

### Pattern 1: Embedded SPA Serving (The Core Distribution Pattern)

**What:** Pre-build the React frontend at publish time (`npm run build`). Include the built assets in the npm package. The Hono server serves them as static files. Users run `npx yclaude` and get a full web dashboard without any frontend build step.

**When to use:** Always -- this is the fundamental architecture for an npm-distributed dashboard.

**Trade-offs:**
- (+) Zero setup for users. `npx yclaude` just works.
- (+) No runtime dependency on Vite, Webpack, or any build tool.
- (-) Package size is larger (includes pre-built JS/CSS/assets).
- (-) Contributors need to build frontend during development.

**Example:**
```typescript
// src/server/static.ts
import { serveStatic } from '@hono/node-server/serve-static';
import { join } from 'node:path';

export function setupStaticServing(app: Hono) {
  // Serve pre-built frontend assets using absolute path
  // import.meta.dirname resolves to the directory of THIS file,
  // so we navigate to the web-dist folder relative to the package root
  const webDistPath = join(import.meta.dirname, '../../web-dist');

  app.use('/*', serveStatic({ root: webDistPath }));

  // SPA fallback: return index.html for non-API routes
  app.get('*', async (c) => {
    const html = await readFile(join(webDistPath, 'index.html'), 'utf-8');
    return c.html(html);
  });
}
```

### Pattern 2: DataProvider Interface (Local-to-Cloud Bridge)

**What:** Define a `DataProvider` interface that abstracts all data access. Phase 1 implements it with local file system reads. Phase 2 implements it with cloud API calls. The server routes are provider-agnostic.

**When to use:** From day one. This is the architecture that prevents a rewrite when transitioning to cloud.

**Trade-offs:**
- (+) Adding cloud support requires zero changes to server routes or frontend.
- (+) Testable -- mock providers for unit tests.
- (-) Slight over-engineering for Phase 1 alone, but minimal cost.

**Example:**
```typescript
// src/data/provider.ts
export interface DataProvider {
  getProjects(): Promise<Project[]>;
  getSessions(filter?: SessionFilter): Promise<Session[]>;
  getSessionDetail(sessionId: string): Promise<SessionDetail>;
  getUsageSummary(filter?: UsageFilter): Promise<UsageSummary>;
  getTimeline(filter?: TimelineFilter): Promise<TimelineBucket[]>;
}

// src/data/local-provider.ts
export class LocalFSProvider implements DataProvider {
  constructor(private basePath: string) {} // e.g., ~/.claude/projects

  async getProjects(): Promise<Project[]> {
    // Discover project directories, decode slugs, aggregate per-project
    const dirs = await readdir(this.basePath);
    return Promise.all(dirs.map(slug => this.loadProject(slug)));
  }

  // ... other methods read from local JSONL files
}

// Phase 2: src/data/cloud-provider.ts
export class CloudAPIProvider implements DataProvider {
  constructor(private apiUrl: string, private authToken: string) {}

  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${this.apiUrl}/projects`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });
    return res.json();
  }
}
```

### Pattern 3: FormatAdapter (Provider-Agnostic Parsing)

**What:** Each AI tool (Claude Code, Cursor, Copilot) produces different data formats. A `FormatAdapter` normalizes them into a canonical `NormalizedEvent` schema. The adapter is selected based on data source detection.

**When to use:** From day one. Even with only Claude Code, the adapter pattern costs almost nothing and prevents a painful refactor later.

**Trade-offs:**
- (+) Adding a new tool = adding one adapter file. No changes to aggregation, API, or frontend.
- (+) Canonical schema means all downstream code works with one type.
- (-) Very slight indirection for Phase 1. Worthwhile for Phase 3.

**Example:**
```typescript
// src/parser/adapters/adapter.ts
export interface FormatAdapter {
  /** Detect if a file/directory belongs to this tool */
  canHandle(path: string): boolean;
  /** Parse a raw JSONL line into a NormalizedEvent (or null if irrelevant) */
  parseLine(line: string): NormalizedEvent | null;
  /** Detect the tool name for display */
  toolName: string;
}

// src/parser/adapters/claude-code.ts
export class ClaudeCodeAdapter implements FormatAdapter {
  toolName = 'Claude Code';

  canHandle(path: string): boolean {
    // Claude Code stores data in ~/.claude/projects/
    return path.includes('.claude/projects');
  }

  parseLine(line: string): NormalizedEvent | null {
    const raw = JSON.parse(line);
    if (raw.type === 'assistant' && raw.message?.usage) {
      return {
        type: 'response',
        timestamp: new Date(raw.timestamp),
        sessionId: raw.sessionId,
        model: raw.message.model,
        tokens: {
          input: raw.message.usage.input_tokens,
          output: raw.message.usage.output_tokens,
          cacheCreation: raw.message.usage.cache_creation_input_tokens ?? 0,
          cacheRead: raw.message.usage.cache_read_input_tokens ?? 0,
        },
        metadata: {
          cwd: raw.cwd,
          gitBranch: raw.gitBranch,
          isSidechain: raw.isSidechain,
          agentId: raw.agentId,
        }
      };
    }
    // Handle 'user' type for session tracking, etc.
    return null;
  }
}
```

### Pattern 4: Hono App Factory (Testable, Composable Server)

**What:** Create the Hono app via a factory function that accepts dependencies (DataProvider, config). This makes the server testable without file system access and composable for different deployment targets.

**When to use:** Always. This is standard practice for any non-trivial HTTP server.

**Trade-offs:**
- (+) Unit tests pass in a mock provider, get deterministic results.
- (+) Cloud deployment imports the factory and passes a CloudAPIProvider.
- (+) The CLI calls the factory with LocalFSProvider and starts the Node server.

**Example:**
```typescript
// src/server/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { DataProvider } from '../data/provider';

export interface AppConfig {
  provider: DataProvider;
  basePath?: string; // API base path, default /api/v1
}

export function createApp(config: AppConfig): Hono {
  const app = new Hono();

  app.use('*', cors());

  // Mount API routes with provider injected
  const api = createApiRoutes(config.provider);
  app.route(config.basePath ?? '/api/v1', api);

  // Mount static asset serving (only in CLI mode, not cloud)
  setupStaticServing(app);

  return app;
}

// src/cli/index.ts
import { serve } from '@hono/node-server';
import { createApp } from '../server';
import { LocalFSProvider } from '../data/local-provider';
import open from 'open';

const provider = new LocalFSProvider(resolvedPath);
const app = createApp({ provider });

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`yclaude running at http://localhost:${info.port}`);
  open(`http://localhost:${info.port}`);
});
```

## Data Flow

### Primary Data Flow: JSONL to Dashboard

```
~/.claude/projects/{slug}/*.jsonl
    |
    | (1) File discovery: glob for *.jsonl files
    v
JSONL Reader (streaming, line-by-line)
    |
    | (2) Each line parsed by FormatAdapter
    v
ClaudeCodeAdapter.parseLine()
    |
    | (3) Returns NormalizedEvent or null (skip irrelevant types)
    v
NormalizedEvent[]
    |
    | (4) Aggregation engine computes derived data
    v
Aggregation: cost calculation, time bucketing, project grouping
    |
    | (5) Results cached in memory for the server lifecycle
    v
In-Memory Cache (Map<string, AggregatedData>)
    |
    | (6) API routes read from cache
    v
Hono API Routes: /api/v1/usage, /projects, /sessions, /timeline
    |
    | (7) JSON responses
    v
React SPA fetches from /api/v1/*
    |
    | (8) Renders charts, tables, drill-downs
    v
User sees dashboard in browser
```

### Key Data Flows

1. **Initial load:** CLI starts -> discovers JSONL files -> parses ALL files -> aggregates -> caches in memory -> server begins accepting requests. This happens once at startup. For a typical developer with weeks of Claude Code usage, this takes 1-3 seconds.

2. **API request flow:** Browser loads SPA -> SPA calls `/api/v1/usage?range=7d` -> Hono route handler queries in-memory cache -> returns JSON -> SPA renders chart.

3. **File watch (optional, Phase 1.5):** `fs.watch` or `chokidar` on `~/.claude/projects/` -> detect new/changed JSONL files -> re-parse only changed files -> update in-memory cache -> push update via SSE or WebSocket to connected browsers.

4. **Cloud transition (Phase 2):** Same SPA, same API contract. Server routes call `CloudAPIProvider.getUsage()` instead of `LocalFSProvider.getUsage()`. The frontend does not change. The API response shape does not change.

### State Management (Frontend)

```
API Response (JSON)
    |
    v
React Query / TanStack Query (caching, deduplication, refetch)
    |
    v
Page Components (Dashboard, Projects, Sessions)
    |
    v
Chart Components (Recharts) + Filter Controls
```

Use TanStack Query (React Query) for frontend state. It handles caching, loading states, error states, and refetching. No global state store needed for Phase 1 -- the server is the source of truth, and TanStack Query is the cache layer.

## Local-to-Cloud Transition Path

This is the most architecturally important concern. The design must prevent a rewrite at Phase 2.

### Phase 1: Local Only

```
User's machine:
  npx yclaude
    → LocalFSProvider reads ~/.claude/projects/
    → Hono serves API + SPA on localhost:3000
    → Browser opens, data stays local
```

### Phase 2: Cloud Deployment (Same SPA)

```
Option A: Upload-based cloud
  User visits yclaude.dev
    → SPA loads from CDN
    → User uploads ZIP of their .claude/projects/ data
    → Cloud server parses with same parser code
    → CloudAPIProvider backed by uploaded data in temp storage or DB
    → Same API contract, same SPA

Option B: Browser-local with File System Access API
  User visits yclaude.dev
    → SPA loads from CDN
    → User grants access to ~/.claude directory via File System Access API
    → Parser runs IN THE BROWSER (same parser code, bundled for browser)
    → No server needed for data -- SPA does everything client-side
    → BrowserFSProvider implements DataProvider using File System Access API

Option C: Persisted cloud (paid tier)
  User signs in at yclaude.dev
    → CloudAPIProvider calls REST API backed by database
    → Data previously uploaded/synced is persisted
    → Same SPA, same API contract
```

### What Makes This Work Without Rewrite

1. **DataProvider interface** -- Server routes never import filesystem modules directly. They call `provider.getProjects()`. Swap the provider, everything else works.

2. **Canonical event schema** -- The `NormalizedEvent` type is the contract between parsing and aggregation. Whether events come from local JSONL or a cloud database, they conform to the same shape.

3. **API contract stability** -- The REST API shape (`/api/v1/usage`, `/api/v1/projects`, etc.) is the contract between backend and frontend. As long as the response shape is stable, the frontend works with any backend.

4. **Parser code reuse in browser** -- Because the parser is pure TypeScript with no Node.js-specific dependencies (no `fs`, no `path` in the parser itself -- those are in the reader), it can be bundled for browser execution. The File System Access API path in Phase 2 reuses the exact same parsing and aggregation logic.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user (Phase 1) | In-memory cache of parsed data. Re-parse on startup. No database. This is fine for months of a single developer's usage data (typically < 100MB of JSONL). |
| Cloud, 100s of users (Phase 2) | Per-user data isolation. Parsed data stored in PostgreSQL or SQLite (cloud). Background jobs for parsing uploads. Add caching layer (Redis or in-memory). |
| Teams, 1000s of users (Phase 3) | Team-scoped queries. Database indexes on team_id, project, date range. Consider read replicas. Background aggregation jobs for expensive team-wide queries. |
| Crowdsourced benchmarks (Phase 4) | Pre-computed aggregate tables. Materialized views. Nightly batch jobs for benchmark statistics. This is a different query pattern -- reads from aggregate tables, not raw events. |

### Scaling Priorities

1. **First bottleneck (Phase 1):** Startup parse time for users with very large JSONL histories (months of heavy use). Mitigation: streaming parser, optional date range filter at parse time (`--since 30d`), cache parsed results to a local SQLite file.

2. **Second bottleneck (Phase 2):** Upload and parse time for large data sets in the cloud. Mitigation: background job queue (BullMQ or similar), progress indicators, incremental parsing.

3. **Third bottleneck (Phase 3):** Team-wide aggregation queries spanning many users. Mitigation: pre-computed aggregates, database materialized views, per-team caching.

## Anti-Patterns

### Anti-Pattern 1: Monorepo for Phase 1

**What people do:** Set up a full pnpm workspace monorepo with `packages/parser`, `packages/server`, `packages/web`, `apps/cli` before writing any features.

**Why it's wrong:** For a single npm package with an embedded dashboard, monorepo adds CI complexity, workspace configuration, cross-package build orchestration, and version management overhead. ccusage moved to a monorepo because it grew MCP integration and docs site -- yclaude has neither at Phase 1.

**Do this instead:** Single package with clear folder boundaries (`src/parser/`, `src/server/`, `web/`). The folder structure provides the same separation without the tooling overhead. Migrate to monorepo at Phase 3 if/when you have genuinely independent packages (CLI SDK, cloud service, shared types).

### Anti-Pattern 2: Runtime Frontend Bundling

**What people do:** Ship Vite or Webpack as a dependency and build the frontend at runtime when users run `npx yclaude`.

**Why it's wrong:** Adds 100MB+ of dependencies. Makes `npx` startup take 30+ seconds. Creates Node.js version compatibility issues. Breaks offline usage.

**Do this instead:** Build frontend at publish time (`prepublishOnly` script). Ship pre-built static assets. The npm package includes `web-dist/` with ready-to-serve HTML/JS/CSS. Zero build tools needed at runtime.

### Anti-Pattern 3: Direct File System Access in Route Handlers

**What people do:** Import `fs` and `path` directly in Hono route handlers to read JSONL files.

**Why it's wrong:** Couples routes to local filesystem. Makes cloud migration require rewriting every route. Makes testing require actual files on disk.

**Do this instead:** DataProvider interface. Routes call `provider.getProjects()`. Provider implementation decides whether that means reading local files or querying a database.

### Anti-Pattern 4: Parsing on Every Request

**What people do:** Re-read and re-parse JSONL files for each API request.

**Why it's wrong:** JSONL parsing is I/O-bound and CPU-intensive for large histories. A single dashboard page load triggers 4-6 API calls. Re-parsing on every request means 4-6x the work, adding seconds of latency.

**Do this instead:** Parse once at startup, cache in memory. Optionally watch for file changes and incrementally update the cache. For Phase 2 cloud, the "cache" becomes the database.

### Anti-Pattern 5: Tight Coupling to Claude Code JSONL Format

**What people do:** Hardcode Claude Code field names (`message.usage.input_tokens`, `sessionId`, etc.) throughout the aggregation and API layers.

**Why it's wrong:** When adding Cursor or Copilot support, field access is scattered across dozens of files.

**Do this instead:** FormatAdapter normalizes tool-specific formats into a canonical `NormalizedEvent` schema. All downstream code works with canonical types. Adding a new tool means adding one adapter file.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Local filesystem (`~/.claude`) | `fs.readdir` + `readline` for streaming JSONL | Use `import.meta.dirname` or user-provided `--dir` flag. Always resolve to absolute path. |
| Browser (SPA) | HTTP fetch to `/api/v1/*` | Same-origin in local mode. CORS configured for cloud mode. |
| File System Access API (Phase 2) | Browser-side `showDirectoryPicker()` | Chromium-only. Provide upload fallback for Firefox/Safari. |
| Auth provider (Phase 2+) | OAuth 2.0 / email magic link | Use a managed service (Clerk, Auth.js). Don't roll your own. |
| Database (Phase 2+) | PostgreSQL via Drizzle ORM or Prisma | Schema mirrors canonical event types. Migrations via ORM. |
| Background jobs (Phase 2+) | BullMQ or inngest | For async parsing of uploaded data. Not needed in Phase 1. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| CLI -> Server | Function call (imports `createApp`) | Same process. CLI configures, server runs. |
| Server -> DataProvider | TypeScript interface method calls | Async. Provider may do I/O (local) or HTTP (cloud). |
| DataProvider -> Parser | Function call (provider imports parser) | Parser is a dependency of LocalFSProvider only. CloudAPIProvider has no parser dependency. |
| Parser -> FormatAdapter | Interface method call | Adapter selected by `canHandle()` detection. |
| Aggregation -> Pricing | Pure function import | `pricing.ts` exports a static lookup table. Updated manually when Anthropic changes prices. |
| Frontend -> Server | HTTP REST (`fetch`) | Contract defined by API response types. Shared types ensure consistency. |

## Build and Distribution Strategy

### Build Pipeline

```
Development:
  Terminal 1: tsup --watch (builds backend to dist/)
  Terminal 2: cd web && vite dev --proxy (frontend dev server proxying /api to Hono)

Production build:
  1. tsup src/cli/index.ts --format esm  (backend → dist/)
  2. cd web && vite build               (frontend → web-dist/)
  3. npm publish                        (ships dist/ + web-dist/)

npx execution:
  npx yclaude
    → npm downloads package (includes dist/ + web-dist/)
    → runs dist/cli/index.js
    → Hono serves web-dist/ as static assets
    → opens browser
```

### package.json Key Fields

```json
{
  "name": "yclaude",
  "type": "module",
  "bin": {
    "yclaude": "./dist/cli/index.js"
  },
  "files": [
    "dist",
    "web-dist"
  ],
  "scripts": {
    "build": "tsup && cd web && npm run build",
    "prepublishOnly": "npm run build"
  }
}
```

### Why This Works for npx

When a user runs `npx yclaude`, npm downloads the package to a temp directory and executes the `bin` entry. Because the frontend is pre-built and included in `files`, no build step happens at runtime. The package includes everything needed to serve a full dashboard.

## Sources

- [Hono Node.js server and static serving](https://hono.dev/docs/getting-started/nodejs) (HIGH confidence -- official docs)
- [Hono static file serving with absolute paths](https://deepwiki.com/honojs/node-server/2.4-static-file-serving) (MEDIUM confidence)
- [Vite build for production](https://vite.dev/guide/build) (HIGH confidence -- official docs)
- [tsup for TypeScript library bundling](https://tsup.egoist.dev/) (HIGH confidence -- official docs)
- [Express static serving patterns](https://expressjs.com/en/starter/static-files.html) (HIGH confidence -- pattern reference)
- [File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) (HIGH confidence -- Chrome official docs)
- [File System Access API browser support](https://caniuse.com/native-filesystem-api) (HIGH confidence -- Chromium only, no Firefox/Safari)
- [Adapter pattern in TypeScript](https://refactoring.guru/design-patterns/adapter/typescript/example) (HIGH confidence)
- [ccusage repository architecture](https://github.com/ryoppippi/ccusage) (HIGH confidence -- direct competitor reference)
- [Local-first web architecture patterns](https://plainvanillaweb.com/blog/articles/2025-07-16-local-first-architecture/) (MEDIUM confidence)
- [`open` npm package for browser launching](https://github.com/sindresorhus/open) (HIGH confidence)
- [Local-first architecture CTO guide](https://blog.4geeks.io/implementing-local-first-architecture-a-ctos-guide-to-performance-resilience-and-data-sovereignty/) (MEDIUM confidence)

---
*Architecture research for: yclaude -- npm-distributed local-first analytics dashboard*
*Researched: 2026-02-28*
