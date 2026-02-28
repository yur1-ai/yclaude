import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { apiRoutes } from './routes/api.js';
import type { NormalizedEvent } from '../parser/types.js';
import type { CostEvent } from '../cost/types.js';

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

  // TODO(03-03): Register serveStatic for the Vite SPA build output here.
  // Use fileURLToPath(new URL('../../../web-dist', import.meta.url)) for absolute path
  // since serveStatic uses process.cwd() by default, not import.meta.url.

  return app;
}
