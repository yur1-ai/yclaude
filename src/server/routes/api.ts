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
  return Number.isNaN(d.getTime()) ? 'invalid' : d;
}

/**
 * Returns the last non-empty path segment of a cwd string.
 * e.g. "/Users/foo/ai-projects/yclaude" → "yclaude"
 */
function lastSegment(cwd: string): string {
  return cwd.split('/').filter(Boolean).at(-1) ?? cwd;
}

/**
 * Assigns human-readable display names for all unique cwd values.
 * If two distinct cwds share the same last segment, show parent/name for both.
 * Null cwd (no cwd field) → "Unknown project".
 */
function assignProjectNames(cwds: (string | null)[]): Map<string | null, string> {
  const freq = new Map<string, number>();
  for (const cwd of cwds) {
    if (!cwd) continue;
    const last = lastSegment(cwd);
    freq.set(last, (freq.get(last) ?? 0) + 1);
  }
  const result = new Map<string | null, string>();
  for (const cwd of cwds) {
    if (!cwd) {
      result.set(null, 'Unknown project');
      continue;
    }
    const parts = cwd.split('/').filter(Boolean);
    const last = parts.at(-1) ?? cwd;
    if ((freq.get(last) ?? 0) > 1) {
      const parent = parts.at(-2);
      result.set(cwd, parent ? `${parent}/${last}` : last);
    } else {
      result.set(cwd, last);
    }
  }
  return result;
}

/**
 * Extracts local-timezone hour key 'YYYY-MM-DDTHH' from an ISO timestamp.
 * Uses Intl.DateTimeFormat with the given IANA timezone string.
 */
function getLocalHourKey(timestamp: string, tz: string): string {
  const d = new Date(timestamp);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  const hour = parts.hour === '24' ? '00' : (parts.hour ?? '00');
  return `${parts.year}-${parts.month}-${parts.day}T${hour}`;
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

    const subagentCostUsd = costs
      .filter((e) => e.isSidechain === true)
      .reduce((s, e) => s + e.costUsd, 0);
    const mainCostUsd = totalCost - subagentCostUsd;

    return c.json({
      totalCost,
      totalTokens,
      eventCount: costs.length,
      subagentCostUsd,
      mainCostUsd,
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
    const tz = c.req.query('tz') ?? 'UTC';

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
      } else if (bucket === 'hour') {
        key = getLocalHourKey(e.timestamp, tz);
      } else {
        // Default: day bucket
        key = d.toISOString().slice(0, 10);
      }

      groups.set(key, (groups.get(key) ?? 0) + e.costUsd);
    }

    let result: Array<{ date: string; cost: number }>;

    // Zero-cost gap-fill: only for day bucket when both bounds are explicit
    // Note: 'invalid' was already filtered by early returns above; from/to here are Date | null
    if (fromStr && toStr && bucket === 'day' && from && to) {
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

  // GET /api/v1/models — aggregates cost data grouped by model.
  // Supports optional ?from=ISO and ?to=ISO date-range filtering.
  // Events with undefined model are grouped as 'Unknown'.
  // Rows sorted by costUsd descending.
  app.get('/models', (c) => {
    const fromStr = c.req.query('from');
    const toStr = c.req.query('to');

    const from = parseDate(fromStr);
    const to = parseDate(toStr);

    if (from === 'invalid') return c.json({ error: "Invalid 'from' date" }, 400);
    if (to === 'invalid') return c.json({ error: "Invalid 'to' date" }, 400);

    let costs = state.costs;
    if (from) costs = costs.filter((e) => new Date(e.timestamp) >= from);
    if (to) costs = costs.filter((e) => new Date(e.timestamp) <= to);

    const groups = new Map<
      string,
      {
        costUsd: number;
        eventCount: number;
        tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
      }
    >();

    for (const e of costs) {
      const key = e.model ?? 'Unknown';
      const existing = groups.get(key) ?? {
        costUsd: 0,
        eventCount: 0,
        tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
      };
      existing.costUsd += e.costUsd;
      existing.eventCount += 1;
      if (e.tokens) {
        existing.tokens.input += e.tokens.input;
        existing.tokens.output += e.tokens.output;
        existing.tokens.cacheCreation += e.tokens.cacheCreation;
        existing.tokens.cacheRead += e.tokens.cacheRead;
      }
      groups.set(key, existing);
    }

    const rows = Array.from(groups.entries())
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.costUsd - a.costUsd);

    const totalCost = rows.reduce((s, r) => s + r.costUsd, 0);

    // Collect unknown model IDs and their distinct session count
    const unknownModelIds = new Set<string>();
    const unknownSessionIds = new Set<string>();
    for (const e of costs) {
      if (e.unknownModel && e.model) {
        unknownModelIds.add(e.model);
        unknownSessionIds.add(e.sessionId);
      }
    }

    return c.json({
      rows,
      totalCost,
      unknownModels: unknownModelIds.size > 0
        ? { models: [...unknownModelIds].sort(), sessionCount: unknownSessionIds.size }
        : null,
    });
  });

  // GET /api/v1/projects — aggregates cost data grouped by project (cwd).
  // Supports optional ?from=ISO and ?to=ISO date-range filtering.
  // Events with undefined cwd are grouped as "Unknown project" (cwd: null).
  // Collision detection: if two distinct cwds share the same last path segment,
  // both display as "parent/name" format.
  // Rows sorted by costUsd descending.
  app.get('/projects', (c) => {
    const fromStr = c.req.query('from');
    const toStr = c.req.query('to');

    const from = parseDate(fromStr);
    const to = parseDate(toStr);

    if (from === 'invalid') return c.json({ error: "Invalid 'from' date" }, 400);
    if (to === 'invalid') return c.json({ error: "Invalid 'to' date" }, 400);

    let costs = state.costs;
    if (from) costs = costs.filter((e) => new Date(e.timestamp) >= from);
    if (to) costs = costs.filter((e) => new Date(e.timestamp) <= to);

    const groups = new Map<
      string | null,
      {
        costUsd: number;
        eventCount: number;
        tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
      }
    >();

    for (const e of costs) {
      const key = e.cwd ?? null;
      const existing = groups.get(key) ?? {
        costUsd: 0,
        eventCount: 0,
        tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
      };
      existing.costUsd += e.costUsd;
      existing.eventCount += 1;
      if (e.tokens) {
        existing.tokens.input += e.tokens.input;
        existing.tokens.output += e.tokens.output;
        existing.tokens.cacheCreation += e.tokens.cacheCreation;
        existing.tokens.cacheRead += e.tokens.cacheRead;
      }
      groups.set(key, existing);
    }

    const uniqueCwds = Array.from(groups.keys());
    const names = assignProjectNames(uniqueCwds);

    const rows = Array.from(groups.entries())
      .map(([cwd, data]) => ({ displayName: names.get(cwd) ?? 'Unknown project', cwd, ...data }))
      .sort((a, b) => b.costUsd - a.costUsd);

    const totalCost = rows.reduce((s, r) => s + r.costUsd, 0);

    return c.json({ rows, totalCost });
  });

  // Stub routes — return empty shapes for Phase 4+ implementation
  app.get('/events', (c) => c.json({ events: [] }));

  // GET /api/v1/branches — returns sorted unique non-null gitBranch values from all events.
  app.get('/branches', (c) => {
    const branches = [
      ...new Set(
        state.costs
          .map((e) => e.gitBranch)
          .filter((b): b is string => typeof b === 'string' && b.length > 0),
      ),
    ].sort();
    return c.json({ branches });
  });

  // GET /api/v1/activity?year=YYYY&tz=IANA_TZ
  // Returns { data: Activity[], year } where Activity = { date: string; count: number; level: number }
  // data is gap-filled: ALL days in the year are present (count=0, level=0 for days with no sessions).
  // level 0 = no sessions, 1-4 = quartile of session count relative to max day.
  // Counts DISTINCT sessionIds per local date (not event count).
  app.get('/activity', (c) => {
    const year = Number.parseInt(c.req.query('year') ?? String(new Date().getFullYear()), 10);
    const tz = c.req.query('tz') ?? 'UTC';

    // Group by local date, counting distinct sessionIds
    const daySessions = new Map<string, Set<string>>();
    for (const e of state.costs) {
      const d = new Date(e.timestamp);
      const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
      if (!localDate.startsWith(String(year))) continue;
      const set = daySessions.get(localDate) ?? new Set<string>();
      set.add(e.sessionId);
      daySessions.set(localDate, set);
    }

    const counts = new Map<string, number>();
    for (const [date, sessions] of daySessions) {
      counts.set(date, sessions.size);
    }

    const max = Math.max(...(counts.size > 0 ? [...counts.values()] : [1]), 1);

    // Gap-fill all days of the year (up to 366 to handle leap years)
    const result: Array<{ date: string; count: number; level: number }> = [];
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    for (let i = 0; i < 366; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      // Stop when we cross into the next year
      if (!dateStr.startsWith(String(year))) break;
      const count = counts.get(dateStr) ?? 0;
      const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));
      result.push({ date: dateStr, count, level });
    }

    return c.json({ data: result, year });
  });

  // GET /api/v1/sessions — paginated session list.
  // Groups state.costs by sessionId. Sessions with no token-bearing events are excluded.
  // Supports ?from=ISO, ?to=ISO date filtering, ?project=cwd filter, ?branch=name filter, ?page=N pagination.
  app.get('/sessions', (c) => {
    interface SessionRow extends Record<string, unknown> {
      sessionId: string;
      displayName: string;
      cwd: string | null;
      model: string;
      models: string[];
      costUsd: number;
      tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
      timestamp: string;
      durationMs: number | null;
      gitBranch: string | null;
      hasSubagents: boolean;
      mainCostUsd: number;
      subagentCostUsd: number;
    }

    const PAGE_SIZE = 50;

    const fromStr = c.req.query('from');
    const toStr = c.req.query('to');
    const projectFilter = c.req.query('project') ?? null;
    const branchFilter = c.req.query('branch') ?? null;
    const pageParam = Number.parseInt(c.req.query('page') ?? '1', 10);
    const page = Math.max(1, Number.isNaN(pageParam) ? 1 : pageParam);

    const from = parseDate(fromStr);
    const to = parseDate(toStr);

    if (from === 'invalid') return c.json({ error: "Invalid 'from' date" }, 400);
    if (to === 'invalid') return c.json({ error: "Invalid 'to' date" }, 400);

    // Filter by date range — never mutate state.costs
    let costs = state.costs;
    if (from) costs = costs.filter((e) => new Date(e.timestamp).getTime() >= from.getTime());
    if (to) costs = costs.filter((e) => new Date(e.timestamp).getTime() <= to.getTime());

    // Filter by project (cwd)
    if (projectFilter !== null) {
      costs = costs.filter((e) => (e.cwd ?? null) === projectFilter);
    }

    // Filter by branch (gitBranch)
    if (branchFilter !== null) {
      costs = costs.filter((e) => (e.gitBranch ?? null) === branchFilter);
    }

    // Group ALL events by sessionId (not just token-bearing)
    const sessionMap = new Map<string, { events: typeof costs }>();
    for (const e of costs) {
      const group = sessionMap.get(e.sessionId);
      if (group) {
        group.events.push(e);
      } else {
        sessionMap.set(e.sessionId, { events: [e] });
      }
    }

    // Build SessionRow for each group
    const allSessions: SessionRow[] = [];

    for (const [sessionId, { events }] of sessionMap) {
      // Sort events by timestamp ascending (stable: JS .sort() is stable in V8)
      const sorted = [...events].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      const tokenEvents = sorted.filter((e) => e.tokens !== undefined);

      // Skip sessions with zero token-bearing events
      if (tokenEvents.length === 0) continue;

      const timestamp = sorted[0]?.timestamp ?? '';
      const cwd = sorted[0]?.cwd ?? null;

      // durationMs: max across ALL events (not just token-bearing), null if none have it
      let durationMs: number | null = null;
      for (const e of sorted) {
        if (e.durationMs !== undefined) {
          durationMs = durationMs === null ? e.durationMs : Math.max(durationMs, e.durationMs);
        }
      }

      // costUsd: sum across ALL events (mainCostUsd + subagentCostUsd === costUsd)
      const mainEvents = sorted.filter((e) => !e.isSidechain);
      const sideEvents = sorted.filter((e) => e.isSidechain === true);
      const mainCostUsd = mainEvents.reduce((s, e) => s + e.costUsd, 0);
      const subagentCostUsd = sideEvents.reduce((s, e) => s + e.costUsd, 0);
      const costUsd = mainCostUsd + subagentCostUsd;
      const hasSubagents = sideEvents.length > 0;
      const gitBranch = sorted.find((e) => e.gitBranch)?.gitBranch ?? null;

      // tokens: sum across token-bearing events only
      const tokens = tokenEvents.reduce(
        (acc, e) => ({
          input: acc.input + (e.tokens?.input ?? 0),
          output: acc.output + (e.tokens?.output ?? 0),
          cacheCreation: acc.cacheCreation + (e.tokens?.cacheCreation ?? 0),
          cacheRead: acc.cacheRead + (e.tokens?.cacheRead ?? 0),
        }),
        { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
      );

      // models: distinct model names from token-bearing events
      const models = [...new Set(tokenEvents.map((e) => e.model ?? 'Unknown'))];
      // biome-ignore lint/style/noNonNullAssertion: models[0] is defined when models.length === 1
      const model = models.length === 1 ? models[0]! : 'Mixed';

      allSessions.push({
        sessionId,
        displayName: '',
        cwd,
        model,
        models,
        costUsd,
        tokens,
        timestamp,
        durationMs,
        gitBranch,
        hasSubagents,
        mainCostUsd,
        subagentCostUsd,
      });
    }

    // Assign display names for all unique cwds
    const uniqueCwds = [...new Set(allSessions.map((s) => s.cwd))];
    const names = assignProjectNames(uniqueCwds);
    for (const s of allSessions) {
      s.displayName = names.get(s.cwd) ?? s.cwd ?? 'Unknown project';
    }

    // Sort by timestamp descending
    allSessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = allSessions.length;
    const sessions = allSessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return c.json({ sessions, total, page, pageSize: PAGE_SIZE });
  });

  // GET /api/v1/sessions/:id — session detail with per-turn breakdown.
  // Returns { summary, turns } for a valid sessionId, 404 for unknown IDs.
  app.get('/sessions/:id', (c) => {
    interface TurnRow {
      turn: number;
      model: string;
      tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
      costUsd: number;
      cumulativeCost: number;
      timestamp: string;
    }

    interface SessionSummary {
      sessionId: string;
      displayName: string;
      cwd: string | null;
      model: string;
      models: string[];
      totalCost: number;
      totalTokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
      timestamp: string;
      durationMs: number | null;
      gitBranch: string | null;
      mainCostUsd: number;
      subagentCostUsd: number;
      hasSubagents: boolean;
    }

    const sessionId = c.req.param('id');
    const allEvents = state.costs.filter((e) => e.sessionId === sessionId);

    if (allEvents.length === 0) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Sort all events by timestamp ascending (stable)
    const sorted = [...allEvents].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const tokenEvents = sorted.filter((e) => e.tokens !== undefined);

    // Build turns from token-bearing events with running cumulative cost
    let cumulative = 0;
    const turns: TurnRow[] = tokenEvents.map((e, i) => {
      cumulative += e.costUsd;
      return {
        turn: i + 1,
        model: e.model ?? 'Unknown',
        tokens: {
          input: e.tokens?.input ?? 0,
          output: e.tokens?.output ?? 0,
          cacheCreation: e.tokens?.cacheCreation ?? 0,
          cacheRead: e.tokens?.cacheRead ?? 0,
        },
        costUsd: e.costUsd,
        cumulativeCost: cumulative,
        timestamp: e.timestamp,
      };
    });

    // Build summary from all events
    const cwd = sorted[0]?.cwd ?? null;
    const timestamp = sorted[0]?.timestamp ?? '';

    let durationMs: number | null = null;
    for (const e of sorted) {
      if (e.durationMs !== undefined) {
        durationMs = durationMs === null ? e.durationMs : Math.max(durationMs, e.durationMs);
      }
    }

    const gitBranch = sorted.find((e) => e.gitBranch)?.gitBranch ?? null;
    const mainCostUsd = sorted.filter((e) => !e.isSidechain).reduce((s, e) => s + e.costUsd, 0);
    const subagentCostUsd = sorted
      .filter((e) => e.isSidechain === true)
      .reduce((s, e) => s + e.costUsd, 0);
    const hasSubagents = sorted.some((e) => e.isSidechain === true);
    const totalCost = mainCostUsd + subagentCostUsd;

    const models = [...new Set(tokenEvents.map((e) => e.model ?? 'Unknown'))];
    // biome-ignore lint/style/noNonNullAssertion: models[0] is defined when models.length === 1
    const model = models.length === 1 ? models[0]! : 'Mixed';

    const totalTokens = tokenEvents.reduce(
      (acc, e) => ({
        input: acc.input + (e.tokens?.input ?? 0),
        output: acc.output + (e.tokens?.output ?? 0),
        cacheCreation: acc.cacheCreation + (e.tokens?.cacheCreation ?? 0),
        cacheRead: acc.cacheRead + (e.tokens?.cacheRead ?? 0),
      }),
      { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
    );

    const displayName = assignProjectNames([cwd]).get(cwd) ?? cwd ?? 'Unknown';

    const summary: SessionSummary = {
      sessionId,
      displayName,
      cwd,
      model,
      models,
      totalCost,
      totalTokens,
      timestamp,
      durationMs,
      gitBranch,
      mainCostUsd,
      subagentCostUsd,
      hasSubagents,
    };

    return c.json({ summary, turns });
  });

  return app;
}
