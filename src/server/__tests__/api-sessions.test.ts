import { describe, expect, it } from 'vitest';
import type { CostEvent } from '../../cost/types.js';
import { toEstimatedCost } from '../../cost/types.js';
import type { NormalizedEvent } from '../../parser/types.js';
import { createApp } from '../server.js';
import type { AppState } from '../server.js';

// -------------------------
// Test helpers
// -------------------------

let _eventIdx = 0;
function makeEvent(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    uuid: `uuid-${_eventIdx++}`,
    type: 'assistant',
    timestamp: '2024-01-01T00:00:00Z',
    sessionId: 'session-1',
    ...overrides,
  };
}

function makeCostEvent(overrides: Partial<NormalizedEvent> & { costUsd?: number } = {}): CostEvent {
  const { costUsd = 0.001, ...rest } = overrides;
  const base = makeEvent({
    tokens: {
      input: 100,
      output: 50,
      cacheCreation: 0,
      cacheRead: 0,
      cacheCreation5m: 0,
      cacheCreation1h: 0,
    },
    ...rest,
  });
  return { ...base, costUsd: toEstimatedCost(costUsd) };
}

function makeNonTokenEvent(
  overrides: Partial<NormalizedEvent> & { costUsd?: number } = {},
): CostEvent {
  const { costUsd = 0, ...rest } = overrides;
  const { tokens: _, ...base } = makeEvent(rest);
  return { ...base, costUsd: toEstimatedCost(costUsd) };
}

// -------------------------
// GET /api/v1/sessions
// -------------------------

describe('GET /api/v1/sessions — session list', () => {
  it('returns { sessions, total, page, pageSize } shape with empty costs', async () => {
    const state: AppState = { events: [], costs: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty('sessions');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('pageSize');
    expect(body.sessions).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(50);
  });

  it('groups events by sessionId and returns one row per session', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({ sessionId: 'sess-A', timestamp: '2024-01-01T00:00:00Z' }),
      makeCostEvent({ sessionId: 'sess-A', timestamp: '2024-01-01T01:00:00Z' }),
      makeCostEvent({ sessionId: 'sess-B', timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions');
    const body = (await res.json()) as { sessions: unknown[]; total: number };
    expect(body.sessions).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it('excludes sessions with zero token-bearing events', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({ sessionId: 'has-tokens', timestamp: '2024-01-01T00:00:00Z' }),
      // session with no token events — should be excluded
      makeNonTokenEvent({ sessionId: 'no-tokens', timestamp: '2024-01-01T00:00:00Z' }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions');
    const body = (await res.json()) as { sessions: Array<Record<string, unknown>>; total: number };
    expect(body.total).toBe(1);
    expect(body.sessions[0]?.sessionId).toBe('has-tokens');
  });

  it('sessions sorted by timestamp descending (newest first)', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({ sessionId: 'old', timestamp: '2024-01-01T00:00:00Z' }),
      makeCostEvent({ sessionId: 'new', timestamp: '2024-03-01T00:00:00Z' }),
      makeCostEvent({ sessionId: 'mid', timestamp: '2024-02-01T00:00:00Z' }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions');
    const body = (await res.json()) as { sessions: Array<Record<string, unknown>> };
    expect(body.sessions[0]?.sessionId).toBe('new');
    expect(body.sessions[1]?.sessionId).toBe('mid');
    expect(body.sessions[2]?.sessionId).toBe('old');
  });

  it('?page=2 returns the second page of results', async () => {
    // Create 55 sessions
    const costs: CostEvent[] = Array.from({ length: 55 }, (_, i) =>
      makeCostEvent({
        sessionId: `sess-${String(i).padStart(3, '0')}`,
        timestamp: `2024-01-${String((i % 28) + 1).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z`,
      }),
    );
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res1 = await app.request('/api/v1/sessions?page=1');
    const body1 = (await res1.json()) as { sessions: unknown[]; total: number; page: number };
    expect(body1.sessions).toHaveLength(50);
    expect(body1.total).toBe(55);
    expect(body1.page).toBe(1);

    const res2 = await app.request('/api/v1/sessions?page=2');
    const body2 = (await res2.json()) as { sessions: unknown[]; total: number; page: number };
    expect(body2.sessions).toHaveLength(5);
    expect(body2.total).toBe(55);
    expect(body2.page).toBe(2);
  });

  it('?project= filters sessions by cwd', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({
        sessionId: 'match-1',
        cwd: '/home/user/project-a',
        timestamp: '2024-01-01T00:00:00Z',
      }),
      makeCostEvent({
        sessionId: 'match-2',
        cwd: '/home/user/project-a',
        timestamp: '2024-01-02T00:00:00Z',
      }),
      makeCostEvent({
        sessionId: 'other',
        cwd: '/home/user/project-b',
        timestamp: '2024-01-03T00:00:00Z',
      }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions?project=/home/user/project-a');
    const body = (await res.json()) as { sessions: Array<Record<string, unknown>>; total: number };
    expect(body.total).toBe(2);
    expect(body.sessions.every((s) => s.cwd === '/home/user/project-a')).toBe(true);
  });

  it('?from= and ?to= filter sessions by event timestamp', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({ sessionId: 'before', timestamp: '2024-01-01T00:00:00Z' }),
      makeCostEvent({ sessionId: 'in-window', timestamp: '2024-01-15T00:00:00Z' }),
      makeCostEvent({ sessionId: 'after', timestamp: '2024-02-01T00:00:00Z' }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request(
      '/api/v1/sessions?from=2024-01-10T00:00:00Z&to=2024-01-20T00:00:00Z',
    );
    const body = (await res.json()) as { sessions: Array<Record<string, unknown>>; total: number };
    expect(body.total).toBe(1);
    expect(body.sessions[0]?.sessionId).toBe('in-window');
  });

  it('?from= with invalid date returns 400', async () => {
    const state: AppState = { events: [], costs: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions?from=not-a-date');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body).toHaveProperty('error');
  });

  it('?to= with invalid date returns 400', async () => {
    const state: AppState = { events: [], costs: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions?to=bad');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body).toHaveProperty('error');
  });

  it('durationMs is sourced from all events, not just token-bearing ones', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T00:00:00Z', durationMs: 1000 }),
      // non-token event with larger durationMs
      makeNonTokenEvent({
        sessionId: 'sess-1',
        timestamp: '2024-01-01T00:01:00Z',
        durationMs: 5000,
      }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions');
    const body = (await res.json()) as { sessions: Array<Record<string, unknown>> };
    expect(body.sessions[0]?.durationMs).toBe(5000);
  });

  it('durationMs is null when no event has durationMs', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T00:00:00Z' }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions');
    const body = (await res.json()) as { sessions: Array<Record<string, unknown>> };
    expect(body.sessions[0]?.durationMs).toBeNull();
  });

  it('model is "Mixed" when session uses more than one distinct model', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({
        sessionId: 'sess-1',
        model: 'claude-3-opus',
        timestamp: '2024-01-01T00:00:00Z',
      }),
      makeCostEvent({
        sessionId: 'sess-1',
        model: 'claude-3-sonnet',
        timestamp: '2024-01-01T01:00:00Z',
      }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions');
    const body = (await res.json()) as { sessions: Array<Record<string, unknown>> };
    expect(body.sessions[0]?.model).toBe('Mixed');
    const models = body.sessions[0]?.models as string[];
    expect(models).toContain('claude-3-opus');
    expect(models).toContain('claude-3-sonnet');
  });

  it('model is the single model name when all events use the same model', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({
        sessionId: 'sess-1',
        model: 'claude-3-opus',
        timestamp: '2024-01-01T00:00:00Z',
      }),
      makeCostEvent({
        sessionId: 'sess-1',
        model: 'claude-3-opus',
        timestamp: '2024-01-01T01:00:00Z',
      }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions');
    const body = (await res.json()) as { sessions: Array<Record<string, unknown>> };
    expect(body.sessions[0]?.model).toBe('claude-3-opus');
  });

  it('timestamp is the ISO string of the earliest event in the session', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T06:00:00Z' }),
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T02:00:00Z' }),
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T08:00:00Z' }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions');
    const body = (await res.json()) as { sessions: Array<Record<string, unknown>> };
    expect(body.sessions[0]?.timestamp).toBe('2024-01-01T02:00:00Z');
  });

  it('no message/content/prose text fields appear in response', async () => {
    const costs: CostEvent[] = [makeCostEvent({ sessionId: 'sess-1' })];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions');
    const body = (await res.json()) as { sessions: Array<Record<string, unknown>> };
    const session = body.sessions[0] ?? {};
    expect(session).not.toHaveProperty('message');
    expect(session).not.toHaveProperty('content');
  });
});

// -------------------------
// GET /api/v1/sessions/:id
// -------------------------

describe('GET /api/v1/sessions/:id — session detail', () => {
  it('returns 404 with { error: "Session not found" } for unknown sessionId', async () => {
    const state: AppState = { events: [], costs: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions/nonexistent-id');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: 'Session not found' });
  });

  it('returns { summary, turns } for a valid sessionId', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({
        sessionId: 'sess-abc',
        model: 'claude-opus',
        timestamp: '2024-01-01T00:00:00Z',
        costUsd: 0.01,
      }),
      makeCostEvent({
        sessionId: 'sess-abc',
        model: 'claude-opus',
        timestamp: '2024-01-01T01:00:00Z',
        costUsd: 0.02,
      }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions/sess-abc');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('turns');
  });

  it('turns are sorted by timestamp ascending', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T06:00:00Z', costUsd: 0.003 }),
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T02:00:00Z', costUsd: 0.001 }),
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T04:00:00Z', costUsd: 0.002 }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions/sess-1');
    const body = (await res.json()) as { turns: Array<Record<string, unknown>> };
    expect(body.turns[0]?.timestamp).toBe('2024-01-01T02:00:00Z');
    expect(body.turns[1]?.timestamp).toBe('2024-01-01T04:00:00Z');
    expect(body.turns[2]?.timestamp).toBe('2024-01-01T06:00:00Z');
  });

  it('each turn has correct 1-indexed turn number', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T01:00:00Z' }),
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T02:00:00Z' }),
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T03:00:00Z' }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions/sess-1');
    const body = (await res.json()) as { turns: Array<Record<string, unknown>> };
    expect(body.turns[0]?.turn).toBe(1);
    expect(body.turns[1]?.turn).toBe(2);
    expect(body.turns[2]?.turn).toBe(3);
  });

  it('cumulativeCost on last turn equals sum of all turn costs', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T01:00:00Z', costUsd: 0.01 }),
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T02:00:00Z', costUsd: 0.02 }),
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T03:00:00Z', costUsd: 0.03 }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions/sess-1');
    const body = (await res.json()) as { turns: Array<Record<string, unknown>> };
    expect(body.turns[0]?.cumulativeCost).toBeCloseTo(0.01, 6);
    expect(body.turns[1]?.cumulativeCost).toBeCloseTo(0.03, 6);
    expect(body.turns[2]?.cumulativeCost).toBeCloseTo(0.06, 6);
  });

  it('summary contains sessionId, displayName, cwd, model, models, totalCost, totalTokens, timestamp, durationMs, gitBranch', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({
        sessionId: 'sess-detail',
        model: 'claude-opus',
        timestamp: '2024-01-01T00:00:00Z',
        cwd: '/home/user/myproject',
        gitBranch: 'main',
        durationMs: 3000,
        costUsd: 0.05,
      }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions/sess-detail');
    const body = (await res.json()) as { summary: Record<string, unknown> };
    const s = body.summary;
    expect(s.sessionId).toBe('sess-detail');
    expect(typeof s.displayName).toBe('string');
    expect(s.cwd).toBe('/home/user/myproject');
    expect(s.model).toBe('claude-opus');
    expect(Array.isArray(s.models)).toBe(true);
    expect(s.totalCost).toBeCloseTo(0.05, 6);
    expect(s.totalTokens).toHaveProperty('input');
    expect(s.timestamp).toBe('2024-01-01T00:00:00Z');
    expect(s.durationMs).toBe(3000);
    expect(s.gitBranch).toBe('main');
  });

  it('summary.durationMs is sourced from ALL events including non-token events', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T00:00:00Z', durationMs: 100 }),
      makeNonTokenEvent({
        sessionId: 'sess-1',
        timestamp: '2024-01-01T00:01:00Z',
        durationMs: 9999,
      }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions/sess-1');
    const body = (await res.json()) as { summary: Record<string, unknown> };
    expect(body.summary.durationMs).toBe(9999);
  });

  it('summary.gitBranch is null when no event has gitBranch', async () => {
    const costs: CostEvent[] = [
      makeCostEvent({ sessionId: 'sess-1', timestamp: '2024-01-01T00:00:00Z' }),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions/sess-1');
    const body = (await res.json()) as { summary: Record<string, unknown> };
    expect(body.summary.gitBranch).toBeNull();
  });

  it('no message/content/prose fields in any response (summary or turns)', async () => {
    const costs: CostEvent[] = [makeCostEvent({ sessionId: 'sess-1' })];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/sessions/sess-1');
    const body = (await res.json()) as {
      summary: Record<string, unknown>;
      turns: Array<Record<string, unknown>>;
    };
    expect(body.summary).not.toHaveProperty('message');
    expect(body.summary).not.toHaveProperty('content');
    for (const turn of body.turns) {
      expect(turn).not.toHaveProperty('message');
      expect(turn).not.toHaveProperty('content');
    }
  });
});
