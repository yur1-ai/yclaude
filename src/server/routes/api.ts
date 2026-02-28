import { Hono } from 'hono';
import type { AppState } from '../server.js';

/**
 * Parses an optional date string from query params.
 * Returns null if the string is absent, 'invalid' if it cannot be parsed as a date,
 * or a Date object if valid.
 */
function parseDate(str: string | undefined): Date | null | 'invalid' {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? 'invalid' : d;
}

/**
 * Creates the /api/v1 sub-router with all API endpoints.
 * Route ordering: summary first, then cost-over-time, then stub routes.
 *
 * @param state - Application state with events and computed costs
 * @returns Hono sub-application mounted at /api/v1
 */
export function apiRoutes(state: AppState): Hono {
  const app = new Hono();

  // GET /api/v1/summary — aggregates cost data into a single summary object.
  // Supports optional ?from=ISO and ?to=ISO date-range filtering.
  // No params = all-time totals (backward compatible).
  app.get('/summary', (c) => {
    const fromStr = c.req.query('from');
    const toStr = c.req.query('to');

    const from = parseDate(fromStr);
    const to = parseDate(toStr);

    if (from === 'invalid') return c.json({ error: "Invalid 'from' date" }, 400);
    if (to === 'invalid') return c.json({ error: "Invalid 'to' date" }, 400);

    // Filter into a new variable — never mutate state.costs
    let costs = state.costs;
    if (from) costs = costs.filter((e) => new Date(e.timestamp) >= from);
    if (to) costs = costs.filter((e) => new Date(e.timestamp) <= to);

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

  // GET /api/v1/cost-over-time — returns cost bucketed by day, week, or month.
  // Supports ?from=ISO, ?to=ISO, ?bucket=day|week|month.
  // When ?from and ?to are both provided with bucket=day, zero-cost gap-fill is applied
  // so every day in the range is represented (even if $0 cost).
  app.get('/cost-over-time', (c) => {
    const fromStr = c.req.query('from');
    const toStr = c.req.query('to');
    const bucket = c.req.query('bucket') ?? 'day';

    const from = parseDate(fromStr);
    const to = parseDate(toStr);

    if (from === 'invalid') return c.json({ error: "Invalid 'from' date" }, 400);
    if (to === 'invalid') return c.json({ error: "Invalid 'to' date" }, 400);

    // Filter costs by date range — never mutate state.costs
    let costs = state.costs;
    if (from) costs = costs.filter((e) => new Date(e.timestamp) >= from);
    if (to) costs = costs.filter((e) => new Date(e.timestamp) <= to);

    // Build grouped map: key → accumulated cost
    const groups = new Map<string, number>();

    for (const e of costs) {
      // Clone the date to avoid mutations affecting the original timestamp.
      // All bucketing uses UTC methods to match the ISO timestamp strings.
      const d = new Date(e.timestamp);
      let key: string;

      if (bucket === 'week') {
        // ISO week: Monday is day 1. getUTCDay() returns 0 for Sunday.
        // dow = day of week as 1 (Mon)..7 (Sun)
        const dow = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() - dow + 1);
        key = d.toISOString().slice(0, 10);
      } else if (bucket === 'month') {
        key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      } else {
        // Default: day bucket
        key = d.toISOString().slice(0, 10);
      }

      groups.set(key, (groups.get(key) ?? 0) + e.costUsd);
    }

    let result: Array<{ date: string; cost: number }>;

    // Zero-cost gap-fill: only for day bucket when both bounds are explicit
    if (fromStr && toStr && bucket === 'day' && from && from !== 'invalid' && to && to !== 'invalid') {
      result = [];
      const cursor = new Date(from);
      // Normalize cursor to midnight UTC
      cursor.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(to);
      endDate.setUTCHours(0, 0, 0, 0);

      while (cursor <= endDate) {
        const key = cursor.toISOString().slice(0, 10);
        result.push({ date: key, cost: groups.get(key) ?? 0 });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    } else {
      // No gap-fill: sort entries chronologically
      result = Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, cost]) => ({ date, cost }));
    }

    return c.json({ data: result, bucket });
  });

  // Stub routes — return empty shapes for Phase 4+ implementation
  app.get('/events', (c) => c.json({ events: [] }));
  app.get('/sessions', (c) => c.json({ sessions: [] }));

  return app;
}
