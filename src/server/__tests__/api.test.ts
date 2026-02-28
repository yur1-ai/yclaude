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

function makeEvent(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    uuid: 'test-uuid-' + Math.random(),
    type: 'assistant',
    timestamp: '2024-01-01T00:00:00Z',
    sessionId: 'session-1',
    ...overrides,
  };
}

function makeCostEvent(costUsd: number, tokens?: Partial<NonNullable<NormalizedEvent['tokens']>>): CostEvent {
  const base = makeEvent({
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
      makeCostEvent(0.001, { input: 100, output: 50, cacheCreation: 10, cacheRead: 5 }),
      makeCostEvent(0.002, { input: 200, output: 75, cacheCreation: 20, cacheRead: 15 }),
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
