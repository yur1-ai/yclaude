import { describe, expect, it } from 'vitest';
import type { NormalizedEvent } from '../../parser/types.js';
import { toEstimatedCost } from '../types.js';
import type { CostEvent, EstimatedCost } from '../types.js';

describe('EstimatedCost branded type', () => {
  it('toEstimatedCost wraps a number into EstimatedCost', () => {
    const cost: EstimatedCost = toEstimatedCost(0.001234);
    expect(cost).toBe(0.001234);
  });

  it('toEstimatedCost(0) returns 0', () => {
    const cost: EstimatedCost = toEstimatedCost(0);
    expect(cost).toBe(0);
  });

  it('EstimatedCost serializes as a plain number in JSON', () => {
    const cost: EstimatedCost = toEstimatedCost(0.001234);
    const json = JSON.stringify({ costUsd: cost });
    expect(json).toBe('{"costUsd":0.001234}');
  });
});

describe('CostEvent type', () => {
  it('CostEvent extends NormalizedEvent with costUsd as EstimatedCost', () => {
    const base: NormalizedEvent = {
      uuid: 'test-uuid',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-1',
    };

    const event: CostEvent = {
      ...base,
      costUsd: toEstimatedCost(0.005),
    };

    expect(event.uuid).toBe('test-uuid');
    expect(event.costUsd).toBe(0.005);
    expect(event.unknownModel).toBeUndefined();
  });

  it('CostEvent supports optional unknownModel flag', () => {
    const base: NormalizedEvent = {
      uuid: 'test-uuid',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-1',
    };

    const event: CostEvent = {
      ...base,
      costUsd: toEstimatedCost(0),
      unknownModel: true,
    };

    expect(event.unknownModel).toBe(true);
  });
});
