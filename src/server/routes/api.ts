import { Hono } from 'hono';
import type { AppState } from '../server.js';

/**
 * Creates the /api/v1 sub-router with all API endpoints.
 * Route ordering: summary first, then stub routes for Phase 4+.
 *
 * @param state - Application state with events and computed costs
 * @returns Hono sub-application mounted at /api/v1
 */
export function apiRoutes(state: AppState): Hono {
  const app = new Hono();

  // GET /api/v1/summary — aggregates all cost data into a single summary object
  app.get('/summary', (c) => {
    const { costs } = state;

    const totalCost = costs.reduce((sum, event) => sum + event.costUsd, 0);

    const totalTokens = costs.reduce(
      (acc, event) => {
        const t = event.tokens;
        if (!t) return acc;
        return {
          input: acc.input + t.input,
          output: acc.output + t.output,
          cacheCreation: acc.cacheCreation + t.cacheCreation,
          cacheRead: acc.cacheRead + t.cacheRead,
        };
      },
      { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
    );

    return c.json({
      totalCost,
      totalTokens,
      eventCount: costs.length,
    });
  });

  // Stub routes — return empty shapes for Phase 4+ implementation
  app.get('/events', (c) => c.json({ events: [] }));
  app.get('/sessions', (c) => c.json({ sessions: [] }));

  return app;
}
