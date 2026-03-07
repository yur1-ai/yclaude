import { describe, expect, it } from 'vitest';
import type { NormalizedEvent } from '../parser/types.js';
import { computeCosts } from '../cost/engine.js';
import { toEstimatedCost } from '../cost/types.js';

// Baseline event for tests — no tokens, no model
const baseEvent: NormalizedEvent = {
  uuid: 'test-uuid',
  type: 'assistant',
  timestamp: '2024-01-01T00:00:00Z',
  sessionId: 'session-1',
};

describe('computeCosts()', () => {
  it('returns [] for empty input', () => {
    expect(computeCosts([])).toEqual([]);
  });

  it('event with no tokens returns costUsd=0, no unknownModel', () => {
    const events: NormalizedEvent[] = [{ ...baseEvent }];
    const result = computeCosts(events);
    expect(result).toHaveLength(1);
    expect(result[0]?.costUsd).toBe(toEstimatedCost(0));
    expect(result[0]?.unknownModel).toBeUndefined();
  });

  it('event with no model returns costUsd=0, no unknownModel', () => {
    const events: NormalizedEvent[] = [
      {
        ...baseEvent,
        tokens: {
          input: 100,
          output: 50,
          cacheCreation: 0,
          cacheRead: 0,
          cacheCreation5m: 0,
          cacheCreation1h: 0,
        },
        // model intentionally absent
      },
    ];
    const result = computeCosts(events);
    expect(result[0]?.costUsd).toBe(toEstimatedCost(0));
    expect(result[0]?.unknownModel).toBeUndefined();
  });

  it('event with recognized model and pure input tokens (no cache)', () => {
    // claude-sonnet-4-6: inputPerMTok=3.00, outputPerMTok=15.00
    // input=1000, output=0, no cache
    // cost = (1000 * 3.00) / 1_000_000 = 0.003
    const events: NormalizedEvent[] = [
      {
        ...baseEvent,
        model: 'claude-sonnet-4-6',
        tokens: {
          input: 1000,
          output: 0,
          cacheCreation: 0,
          cacheRead: 0,
          cacheCreation5m: 0,
          cacheCreation1h: 0,
        },
      },
    ];
    const result = computeCosts(events);
    expect(result[0]?.costUsd).toBeCloseTo(0.003, 8);
    expect(result[0]?.unknownModel).toBeUndefined();
  });

  it('cache math: no double-counting with split cache tiers', () => {
    // claude-sonnet-4-6: inputPerMTok=3.00, outputPerMTok=15.00
    // cacheWrite5mPerMTok=3.75, cacheWrite1hPerMTok=6.00, cacheReadPerMTok=0.30
    // tokens: input=300, output=0, cacheCreation5m=150, cacheCreation1h=50, cacheRead=30
    // cacheCreation = 150 + 50 = 200
    // baseInput = max(0, 300 - 200 - 30) = 70
    // cost = (70 * 3.00 + 0 * 15.00 + 150 * 3.75 + 50 * 6.00 + 30 * 0.30) / 1_000_000
    //      = (210 + 0 + 562.5 + 300 + 9) / 1_000_000
    //      = 1081.5 / 1_000_000
    //      = 0.0010815
    const events: NormalizedEvent[] = [
      {
        ...baseEvent,
        model: 'claude-sonnet-4-6',
        tokens: {
          input: 300,
          output: 0,
          cacheCreation: 200, // sum of 5m + 1h
          cacheRead: 30,
          cacheCreation5m: 150,
          cacheCreation1h: 50,
        },
      },
    ];
    const result = computeCosts(events);
    expect(result[0]?.costUsd).toBeCloseTo(0.0010815, 8);
  });

  it('event with unrecognized model: costUsd=0, unknownModel=true', () => {
    const events: NormalizedEvent[] = [
      {
        ...baseEvent,
        model: 'claude-future-model-9999',
        tokens: {
          input: 100,
          output: 50,
          cacheCreation: 0,
          cacheRead: 0,
          cacheCreation5m: 0,
          cacheCreation1h: 0,
        },
      },
    ];
    const result = computeCosts(events);
    expect(result[0]?.costUsd).toBe(toEstimatedCost(0));
    expect(result[0]?.unknownModel).toBe(true);
  });

  it('preserves all NormalizedEvent fields on CostEvent (spread, not stripped)', () => {
    const events: NormalizedEvent[] = [
      {
        ...baseEvent,
        model: 'claude-sonnet-4-6',
        tokens: {
          input: 100,
          output: 50,
          cacheCreation: 0,
          cacheRead: 0,
          cacheCreation5m: 0,
          cacheCreation1h: 0,
        },
        requestId: 'req-123',
        isSidechain: true,
        agentId: 'agent-1',
        gitBranch: 'main',
        cwd: '/home/user/project',
        durationMs: 1500,
      },
    ];
    const result = computeCosts(events);
    // biome-ignore lint/style/noNonNullAssertion: test-only; input has exactly 1 event
    const event = result[0]!;
    expect(event.uuid).toBe('test-uuid');
    expect(event.type).toBe('assistant');
    expect(event.timestamp).toBe('2024-01-01T00:00:00Z');
    expect(event.sessionId).toBe('session-1');
    expect(event.requestId).toBe('req-123');
    expect(event.isSidechain).toBe(true);
    expect(event.agentId).toBe('agent-1');
    expect(event.gitBranch).toBe('main');
    expect(event.cwd).toBe('/home/user/project');
    expect(event.durationMs).toBe(1500);
  });

  it('returns CostEvent[] — every element has costUsd as a number', () => {
    const events: NormalizedEvent[] = [
      { ...baseEvent, uuid: 'a' },
      {
        ...baseEvent,
        uuid: 'b',
        model: 'claude-opus-4-6',
        tokens: {
          input: 100,
          output: 50,
          cacheCreation: 0,
          cacheRead: 0,
          cacheCreation5m: 0,
          cacheCreation1h: 0,
        },
      },
    ];
    const result = computeCosts(events);
    for (const e of result) {
      expect(typeof e.costUsd).toBe('number');
    }
  });
});
