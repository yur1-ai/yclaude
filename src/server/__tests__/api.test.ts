import { describe, expect, it } from 'vitest';
import type { UnifiedEvent } from '../../providers/types.js';
import { createApp } from '../server.js';
import type { AppState } from '../server.js';

type SummaryBody = {
  totalCost: number;
  totalTokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
  eventCount: number;
};

type CostOverTimeBody = {
  data: Array<{ date: string; cost: number }>;
  bucket: string;
};

function makeUnifiedEvent(
  costUsd: number,
  overrides?: Partial<UnifiedEvent>,
): UnifiedEvent {
  return {
    id: `test-uuid-${Math.random()}`,
    provider: 'claude',
    sessionId: 'session-1',
    timestamp: '2024-01-01T00:00:00Z',
    type: 'assistant',
    costUsd,
    costSource: 'estimated',
    tokens: {
      input: overrides?.tokens?.input ?? 100,
      output: overrides?.tokens?.output ?? 50,
      cacheCreation: overrides?.tokens?.cacheCreation ?? 0,
      cacheRead: overrides?.tokens?.cacheRead ?? 0,
      cacheCreation5m: overrides?.tokens?.cacheCreation5m ?? 0,
      cacheCreation1h: overrides?.tokens?.cacheCreation1h ?? 0,
    },
    ...overrides,
  };
}

describe('/api/v1/summary', () => {
  it('returns empty aggregate for empty state', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary');
    const body = await res.json();
    expect(body).toEqual({
      totalCost: 0,
      totalTokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
      eventCount: 0,
      mainCostUsd: 0,
      subagentCostUsd: 0,
    });
  });

  it('aggregates totalCost across 2 events', async () => {
    const events = [makeUnifiedEvent(0.001), makeUnifiedEvent(0.002)];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary');
    const body = (await res.json()) as SummaryBody;
    expect(body.totalCost).toBeCloseTo(0.003, 6);
  });

  it('eventCount equals number of events in state', async () => {
    const events = [makeUnifiedEvent(0.001), makeUnifiedEvent(0.002), makeUnifiedEvent(0.003)];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary');
    const body = (await res.json()) as SummaryBody;
    expect(body.eventCount).toBe(3);
  });

  it('totalTokens sums input/output/cacheCreation/cacheRead across all events', async () => {
    const events = [
      makeUnifiedEvent(0.001, { tokens: { input: 100, output: 50, cacheCreation: 10, cacheRead: 5, cacheCreation5m: 0, cacheCreation1h: 0 } }),
      makeUnifiedEvent(0.002, { tokens: { input: 200, output: 75, cacheCreation: 20, cacheRead: 15, cacheCreation5m: 0, cacheCreation1h: 0 } }),
    ];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary');
    const body = (await res.json()) as SummaryBody;
    expect(body.totalTokens).toEqual({
      input: 300,
      output: 125,
      cacheCreation: 30,
      cacheRead: 20,
    });
  });
});

describe('/api/v1/summary date filtering', () => {
  it('?from= filters out events before the given timestamp', async () => {
    const events = [
      makeUnifiedEvent(0.001, { timestamp: '2024-01-01T00:00:00Z' }),
      makeUnifiedEvent(0.002, { timestamp: '2024-01-05T00:00:00Z' }),
      makeUnifiedEvent(0.003, { timestamp: '2024-01-10T00:00:00Z' }),
    ];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary?from=2024-01-05T00:00:00Z');
    const body = (await res.json()) as SummaryBody;
    expect(body.eventCount).toBe(2);
    expect(body.totalCost).toBeCloseTo(0.005, 6);
  });

  it('?to= filters out events after the given timestamp', async () => {
    const events = [
      makeUnifiedEvent(0.001, { timestamp: '2024-01-01T00:00:00Z' }),
      makeUnifiedEvent(0.002, { timestamp: '2024-01-05T00:00:00Z' }),
      makeUnifiedEvent(0.003, { timestamp: '2024-01-10T00:00:00Z' }),
    ];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary?to=2024-01-03T23:59:59Z');
    const body = (await res.json()) as SummaryBody;
    expect(body.eventCount).toBe(1);
    expect(body.totalCost).toBeCloseTo(0.001, 6);
  });

  it('?from=&to= combined — only in-window events counted', async () => {
    const events = [
      makeUnifiedEvent(0.001, { timestamp: '2024-01-01T00:00:00Z' }),
      makeUnifiedEvent(0.002, { timestamp: '2024-01-05T00:00:00Z' }),
      makeUnifiedEvent(0.003, { timestamp: '2024-01-10T00:00:00Z' }),
    ];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request(
      '/api/v1/summary?from=2024-01-04T00:00:00Z&to=2024-01-06T00:00:00Z',
    );
    const body = (await res.json()) as SummaryBody;
    expect(body.eventCount).toBe(1);
    expect(body.totalCost).toBeCloseTo(0.002, 6);
  });

  it('?from= with invalid date returns HTTP 400', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary?from=not-a-date');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid 'from' date" });
  });

  it('?to= with invalid date returns HTTP 400', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary?to=not-a-date');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid 'to' date" });
  });
});

describe('/api/v1/cost-over-time', () => {
  it('returns empty data for empty state', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/cost-over-time');
    expect(res.status).toBe(200);
    const body = (await res.json()) as CostOverTimeBody;
    expect(body).toEqual({ data: [], bucket: 'day' });
  });

  it('2 events on the same day → one bucket with summed cost', async () => {
    const events = [
      makeUnifiedEvent(0.001, { timestamp: '2024-01-05T09:00:00Z' }),
      makeUnifiedEvent(0.002, { timestamp: '2024-01-05T18:00:00Z' }),
    ];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/cost-over-time');
    const body = (await res.json()) as CostOverTimeBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.date).toBe('2024-01-05');
    expect(body.data[0]?.cost).toBeCloseTo(0.003, 6);
  });

  it('events on days 1 and 3 with ?from=day1&to=day3 → 3 entries, day 2 has cost 0', async () => {
    const events = [
      makeUnifiedEvent(0.001, { timestamp: '2024-01-01T00:00:00Z' }),
      makeUnifiedEvent(0.003, { timestamp: '2024-01-03T00:00:00Z' }),
    ];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request(
      '/api/v1/cost-over-time?from=2024-01-01T00:00:00Z&to=2024-01-03T23:59:59Z',
    );
    const body = (await res.json()) as CostOverTimeBody;
    expect(body.data).toHaveLength(3);
    expect(body.data[0]).toEqual({ date: '2024-01-01', cost: 0.001 });
    expect(body.data[1]).toEqual({ date: '2024-01-02', cost: 0 });
    expect(body.data[2]?.date).toBe('2024-01-03');
    expect(body.data[2]?.cost).toBeCloseTo(0.003, 6);
    expect(body.bucket).toBe('day');
  });

  it('bucket=week groups events by ISO week Monday date', async () => {
    // 2024-01-01 is a Monday; 2024-01-08 is the next Monday
    const events = [
      makeUnifiedEvent(0.001, { timestamp: '2024-01-01T00:00:00Z' }), // Monday week 1
      makeUnifiedEvent(0.002, { timestamp: '2024-01-03T00:00:00Z' }), // Wednesday — same week
      makeUnifiedEvent(0.004, { timestamp: '2024-01-08T00:00:00Z' }), // Monday week 2
    ];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/cost-over-time?bucket=week');
    const body = (await res.json()) as CostOverTimeBody;
    expect(body.bucket).toBe('week');
    expect(body.data).toHaveLength(2);
    const week1 = body.data.find((d) => d.date === '2024-01-01');
    const week2 = body.data.find((d) => d.date === '2024-01-08');
    expect(week1).toBeDefined();
    expect(week1?.cost).toBeCloseTo(0.003, 6);
    expect(week2).toBeDefined();
    expect(week2?.cost).toBeCloseTo(0.004, 6);
  });

  it('bucket=month groups events by YYYY-MM key', async () => {
    const events = [
      makeUnifiedEvent(0.001, { timestamp: '2024-01-15T00:00:00Z' }),
      makeUnifiedEvent(0.002, { timestamp: '2024-01-20T00:00:00Z' }),
      makeUnifiedEvent(0.005, { timestamp: '2024-02-01T00:00:00Z' }),
    ];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/cost-over-time?bucket=month');
    const body = (await res.json()) as CostOverTimeBody;
    expect(body.bucket).toBe('month');
    expect(body.data).toHaveLength(2);
    const jan = body.data.find((d) => d.date === '2024-01');
    const feb = body.data.find((d) => d.date === '2024-02');
    expect(jan).toBeDefined();
    expect(jan?.cost).toBeCloseTo(0.003, 6);
    expect(feb).toBeDefined();
    expect(feb?.cost).toBeCloseTo(0.005, 6);
  });

  it('?from= with invalid date returns HTTP 400', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/cost-over-time?from=bad-date');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid 'from' date" });
  });
});

describe('/api/v1/pricing-meta', () => {
  it('returns pricing metadata with lastUpdated and source', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/pricing-meta');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { lastUpdated: string; source: string };
    expect(body).toHaveProperty('lastUpdated');
    expect(body).toHaveProperty('source');
    expect(typeof body.lastUpdated).toBe('string');
    expect(typeof body.source).toBe('string');
    // Verify they match the actual exports
    expect(body.lastUpdated).toBe('2026-02-28');
    expect(body.source).toContain('anthropic.com');
  });
});

type ModelsBody = {
  rows: Array<{
    model: string;
    costUsd: number;
    eventCount: number;
    tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
  }>;
  totalCost: number;
  unknownModels: { models: string[]; sessionCount: number } | null;
};

function makeUnifiedEventWithModel(
  costUsd: number,
  model: string,
  opts?: { unknownModel?: boolean; timestamp?: string; sessionId?: string },
): UnifiedEvent {
  return makeUnifiedEvent(costUsd, {
    model,
    ...(opts?.timestamp ? { timestamp: opts.timestamp } : {}),
    ...(opts?.sessionId ? { sessionId: opts.sessionId } : {}),
    ...(opts?.unknownModel ? { unknownModel: true } : {}),
  });
}

describe('/api/v1/models', () => {
  it('empty state returns rows: [], totalCost: 0, unknownModels: null', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/models');
    const body = (await res.json()) as ModelsBody;
    expect(body).toEqual({ rows: [], totalCost: 0, unknownModels: null });
  });

  it('2 known-model events returns unknownModels: null', async () => {
    const events = [
      makeUnifiedEventWithModel(0.01, 'claude-sonnet-4-20250514'),
      makeUnifiedEventWithModel(0.02, 'claude-sonnet-4-20250514'),
    ];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/models');
    const body = (await res.json()) as ModelsBody;
    expect(body.unknownModels).toBeNull();
    expect(body.rows).toHaveLength(1);
  });

  it('1 unknown-model event returns unknownModels with model and session count', async () => {
    const events = [makeUnifiedEventWithModel(0.01, 'fake-model', { unknownModel: true })];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/models');
    const body = (await res.json()) as ModelsBody;
    expect(body.unknownModels).toEqual({
      models: ['fake-model'],
      sessionCount: 1,
    });
  });

  it('3 events (2 unknown same model, 1 known) returns correct unknownModels', async () => {
    const events = [
      makeUnifiedEventWithModel(0.01, 'fake-model', { unknownModel: true, sessionId: 'sess-a' }),
      makeUnifiedEventWithModel(0.02, 'fake-model', { unknownModel: true, sessionId: 'sess-b' }),
      makeUnifiedEventWithModel(0.03, 'claude-sonnet-4-20250514'),
    ];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/models');
    const body = (await res.json()) as ModelsBody;
    expect(body.unknownModels).toEqual({
      models: ['fake-model'],
      sessionCount: 2,
    });
  });

  it('date filter excludes unknown models outside range (unknownModels: null)', async () => {
    const events = [
      makeUnifiedEventWithModel(0.01, 'claude-sonnet-4-20250514', {
        timestamp: '2024-01-05T00:00:00Z',
      }),
      makeUnifiedEventWithModel(0.02, 'fake-model', {
        unknownModel: true,
        timestamp: '2024-01-01T00:00:00Z',
      }),
    ];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    // Filter to only include 2024-01-04 onward — excludes the unknown model event
    const res = await app.request('/api/v1/models?from=2024-01-04T00:00:00Z');
    const body = (await res.json()) as ModelsBody;
    expect(body.unknownModels).toBeNull();
    expect(body.rows).toHaveLength(1);
  });

  it('unknownModels.models array is sorted alphabetically', async () => {
    const events = [
      makeUnifiedEventWithModel(0.01, 'zebra-model', { unknownModel: true }),
      makeUnifiedEventWithModel(0.02, 'alpha-model', { unknownModel: true }),
      makeUnifiedEventWithModel(0.03, 'mid-model', { unknownModel: true }),
    ];
    const state: AppState = { events, providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/models');
    const body = (await res.json()) as ModelsBody;
    expect(body.unknownModels).not.toBeNull();
    expect(body.unknownModels?.models).toEqual(['alpha-model', 'mid-model', 'zebra-model']);
  });
});
