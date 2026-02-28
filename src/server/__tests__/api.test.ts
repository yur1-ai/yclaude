import { describe, it, expect } from 'vitest';
import { createApp } from '../server.js';
import type { AppState } from '../server.js';
import type { CostEvent } from '../../cost/types.js';
import type { NormalizedEvent } from '../../parser/types.js';
import { toEstimatedCost } from '../../cost/types.js';

type SummaryBody = {
  totalCost: number;
  totalTokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
  eventCount: number;
};

type CostOverTimeBody = {
  data: Array<{ date: string; cost: number }>;
  bucket: string;
};

function makeEvent(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    uuid: 'test-uuid-' + Math.random(),
    type: 'assistant',
    timestamp: '2024-01-01T00:00:00Z',
    sessionId: 'session-1',
    ...overrides,
  };
}

function makeCostEvent(
  costUsd: number,
  timestamp?: string,
  tokens?: Partial<NonNullable<NormalizedEvent['tokens']>>,
): CostEvent {
  const base = makeEvent({
    timestamp: timestamp ?? '2024-01-01T00:00:00Z',
    tokens: {
      input: tokens?.input ?? 100,
      output: tokens?.output ?? 50,
      cacheCreation: tokens?.cacheCreation ?? 0,
      cacheRead: tokens?.cacheRead ?? 0,
      cacheCreation5m: tokens?.cacheCreation5m ?? 0,
      cacheCreation1h: tokens?.cacheCreation1h ?? 0,
    },
  });
  return {
    ...base,
    costUsd: toEstimatedCost(costUsd),
  };
}

describe('/api/v1/summary', () => {
  it('returns empty aggregate for empty state', async () => {
    const state: AppState = { events: [], costs: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary');
    const body = await res.json();
    expect(body).toEqual({
      totalCost: 0,
      totalTokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
      eventCount: 0,
    });
  });

  it('aggregates totalCost across 2 CostEvents', async () => {
    const costs = [makeCostEvent(0.001), makeCostEvent(0.002)];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary');
    const body = (await res.json()) as SummaryBody;
    expect(body.totalCost).toBeCloseTo(0.003, 6);
  });

  it('eventCount equals number of CostEvents in state', async () => {
    const costs = [makeCostEvent(0.001), makeCostEvent(0.002), makeCostEvent(0.003)];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary');
    const body = (await res.json()) as SummaryBody;
    expect(body.eventCount).toBe(3);
  });

  it('totalTokens sums input/output/cacheCreation/cacheRead across all CostEvents', async () => {
    const costs = [
      makeCostEvent(0.001, undefined, { input: 100, output: 50, cacheCreation: 10, cacheRead: 5 }),
      makeCostEvent(0.002, undefined, { input: 200, output: 75, cacheCreation: 20, cacheRead: 15 }),
    ];
    const state: AppState = { events: [], costs };
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
    const costs = [
      makeCostEvent(0.001, '2024-01-01T00:00:00Z'),
      makeCostEvent(0.002, '2024-01-05T00:00:00Z'),
      makeCostEvent(0.003, '2024-01-10T00:00:00Z'),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary?from=2024-01-05T00:00:00Z');
    const body = (await res.json()) as SummaryBody;
    expect(body.eventCount).toBe(2);
    expect(body.totalCost).toBeCloseTo(0.005, 6);
  });

  it('?to= filters out events after the given timestamp', async () => {
    const costs = [
      makeCostEvent(0.001, '2024-01-01T00:00:00Z'),
      makeCostEvent(0.002, '2024-01-05T00:00:00Z'),
      makeCostEvent(0.003, '2024-01-10T00:00:00Z'),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary?to=2024-01-03T23:59:59Z');
    const body = (await res.json()) as SummaryBody;
    expect(body.eventCount).toBe(1);
    expect(body.totalCost).toBeCloseTo(0.001, 6);
  });

  it('?from=&to= combined — only in-window events counted', async () => {
    const costs = [
      makeCostEvent(0.001, '2024-01-01T00:00:00Z'),
      makeCostEvent(0.002, '2024-01-05T00:00:00Z'),
      makeCostEvent(0.003, '2024-01-10T00:00:00Z'),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary?from=2024-01-04T00:00:00Z&to=2024-01-06T00:00:00Z');
    const body = (await res.json()) as SummaryBody;
    expect(body.eventCount).toBe(1);
    expect(body.totalCost).toBeCloseTo(0.002, 6);
  });

  it('?from= with invalid date returns HTTP 400', async () => {
    const state: AppState = { events: [], costs: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary?from=not-a-date');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid 'from' date" });
  });

  it('?to= with invalid date returns HTTP 400', async () => {
    const state: AppState = { events: [], costs: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary?to=not-a-date');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid 'to' date" });
  });
});

describe('/api/v1/cost-over-time', () => {
  it('returns empty data for empty state', async () => {
    const state: AppState = { events: [], costs: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/cost-over-time');
    expect(res.status).toBe(200);
    const body = (await res.json()) as CostOverTimeBody;
    expect(body).toEqual({ data: [], bucket: 'day' });
  });

  it('2 events on the same day → one bucket with summed cost', async () => {
    const costs = [
      makeCostEvent(0.001, '2024-01-05T09:00:00Z'),
      makeCostEvent(0.002, '2024-01-05T18:00:00Z'),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/cost-over-time');
    const body = (await res.json()) as CostOverTimeBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].date).toBe('2024-01-05');
    expect(body.data[0].cost).toBeCloseTo(0.003, 6);
  });

  it('events on days 1 and 3 with ?from=day1&to=day3 → 3 entries, day 2 has cost 0', async () => {
    const costs = [
      makeCostEvent(0.001, '2024-01-01T00:00:00Z'),
      makeCostEvent(0.003, '2024-01-03T00:00:00Z'),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/cost-over-time?from=2024-01-01T00:00:00Z&to=2024-01-03T23:59:59Z');
    const body = (await res.json()) as CostOverTimeBody;
    expect(body.data).toHaveLength(3);
    expect(body.data[0]).toEqual({ date: '2024-01-01', cost: 0.001 });
    expect(body.data[1]).toEqual({ date: '2024-01-02', cost: 0 });
    expect(body.data[2].date).toBe('2024-01-03');
    expect(body.data[2].cost).toBeCloseTo(0.003, 6);
    expect(body.bucket).toBe('day');
  });

  it('bucket=week groups events by ISO week Monday date', async () => {
    // 2024-01-01 is a Monday; 2024-01-08 is the next Monday
    const costs = [
      makeCostEvent(0.001, '2024-01-01T00:00:00Z'), // Monday week 1
      makeCostEvent(0.002, '2024-01-03T00:00:00Z'), // Wednesday — same week
      makeCostEvent(0.004, '2024-01-08T00:00:00Z'), // Monday week 2
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/cost-over-time?bucket=week');
    const body = (await res.json()) as CostOverTimeBody;
    expect(body.bucket).toBe('week');
    expect(body.data).toHaveLength(2);
    const week1 = body.data.find((d) => d.date === '2024-01-01');
    const week2 = body.data.find((d) => d.date === '2024-01-08');
    expect(week1).toBeDefined();
    expect(week1!.cost).toBeCloseTo(0.003, 6);
    expect(week2).toBeDefined();
    expect(week2!.cost).toBeCloseTo(0.004, 6);
  });

  it('bucket=month groups events by YYYY-MM key', async () => {
    const costs = [
      makeCostEvent(0.001, '2024-01-15T00:00:00Z'),
      makeCostEvent(0.002, '2024-01-20T00:00:00Z'),
      makeCostEvent(0.005, '2024-02-01T00:00:00Z'),
    ];
    const state: AppState = { events: [], costs };
    const app = createApp(state);
    const res = await app.request('/api/v1/cost-over-time?bucket=month');
    const body = (await res.json()) as CostOverTimeBody;
    expect(body.bucket).toBe('month');
    expect(body.data).toHaveLength(2);
    const jan = body.data.find((d) => d.date === '2024-01');
    const feb = body.data.find((d) => d.date === '2024-02');
    expect(jan).toBeDefined();
    expect(jan!.cost).toBeCloseTo(0.003, 6);
    expect(feb).toBeDefined();
    expect(feb!.cost).toBeCloseTo(0.005, 6);
  });

  it('?from= with invalid date returns HTTP 400', async () => {
    const state: AppState = { events: [], costs: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/cost-over-time?from=bad-date');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid 'from' date" });
  });
});
