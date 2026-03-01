import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { serveStatic } from '@hono/node-server/serve-static';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { apiRoutes } from './routes/api.js';
import type { NormalizedEvent } from '../parser/types.js';
import type { CostEvent } from '../cost/types.js';

// Compute absolute path to dist/web/ relative to this file's location.
// src/server/server.ts compiles to dist/server/server.js via tsup.
// Two levels up from dist/server/ reaches project root, then dist/web/.
// Using import.meta.url (not process.cwd()) ensures correctness regardless of cwd (npx use case).
const webDistPath = fileURLToPath(new URL('../../dist/web', import.meta.url));

/**
 * Application state passed to the server factory.
 * All data is loaded at startup from the JSONL pipeline.
 */
export interface AppState {
  events: NormalizedEvent[];
  costs: CostEvent[];
}

/**
 * Creates a configured Hono application with:
 * - CSP middleware blocking all external requests
 * - API routes registered before static serving (prevents static catch-all blocking API)
 * - Static serving placeholder (implemented in Plan 03-03)
 *
 * Security posture: 127.0.0.1 binding is enforced in cli.ts (serve hostname option).
 * CSP here adds defense-in-depth for browser-level request blocking.
 *
 * @param state - Pre-loaded application state
 * @returns Configured Hono application
 */
export function createApp(state: AppState): Hono {
  const app = new Hono();

  // Apply Content-Security-Policy globally — blocks all external requests at browser level.
  // PITFALL (Research): Register secureHeaders BEFORE routes so all responses get CSP headers.
  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    }),
  );

  // PITFALL (Research): Register API routes BEFORE serveStatic.
  // Static catch-all ('*') would block API routes if registered first.
  app.route('/api/v1', apiRoutes(state));

  // Static assets (JS, CSS, images) — AFTER API routes, BEFORE SPA fallback.
  app.use('/*', serveStatic({ root: webDistPath }));

  // SPA fallback: all non-API, non-asset routes serve index.html.
  // Hash router handles client-side routing from there.
  app.get('*', serveStatic({ path: path.join(webDistPath, 'index.html') }));

  return app;
}
