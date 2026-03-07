import { describe, expect, it } from 'vitest';
import { DedupAccumulator } from '../dedup.js';
import type { NormalizedEvent } from '../types.js';

function makeEvent(uuid: string, type = 'assistant'): NormalizedEvent {
  return {
    uuid,
    type,
    timestamp: '2024-01-01T00:00:00Z',
    sessionId: 'session-1',
  };
}

describe('DedupAccumulator', () => {
  it('add() returns true for new events', () => {
    const dedup = new DedupAccumulator();
    expect(dedup.add(makeEvent('uuid-1'))).toBe(true);
  });

  it('add() returns false for duplicate UUIDs', () => {
    const dedup = new DedupAccumulator();
    dedup.add(makeEvent('uuid-1'));
    expect(dedup.add(makeEvent('uuid-1'))).toBe(false);
  });

  it('results() returns all deduplicated events in insertion order', () => {
    const dedup = new DedupAccumulator();
    dedup.add(makeEvent('uuid-1'));
    dedup.add(makeEvent('uuid-2'));
    dedup.add(makeEvent('uuid-1')); // duplicate
    dedup.add(makeEvent('uuid-3'));

    const results = dedup.results();
    expect(results.length).toBe(3);
    expect(results[0]?.uuid).toBe('uuid-1');
    expect(results[1]?.uuid).toBe('uuid-2');
    expect(results[2]?.uuid).toBe('uuid-3');
  });

  it('size getter returns number of unique events', () => {
    const dedup = new DedupAccumulator();
    dedup.add(makeEvent('uuid-1'));
    dedup.add(makeEvent('uuid-2'));
    dedup.add(makeEvent('uuid-1')); // duplicate

    expect(dedup.size).toBe(2);
  });

  it('duplicates getter tracks count of dropped events', () => {
    const dedup = new DedupAccumulator();
    dedup.add(makeEvent('uuid-1'));
    dedup.add(makeEvent('uuid-1')); // dup 1
    dedup.add(makeEvent('uuid-1')); // dup 2

    expect(dedup.duplicates).toBe(2);
  });

  it('starts empty', () => {
    const dedup = new DedupAccumulator();
    expect(dedup.results()).toEqual([]);
    expect(dedup.size).toBe(0);
    expect(dedup.duplicates).toBe(0);
  });

  it('retains first-seen event data when duplicate UUID is added', () => {
    const dedup = new DedupAccumulator();
    const first = { ...makeEvent('uuid-1'), model: 'claude-sonnet-4-6' };
    const second = { ...makeEvent('uuid-1'), model: 'claude-opus-4-6' };
    dedup.add(first);
    dedup.add(second);
    expect(dedup.results()[0]?.model).toBe('claude-sonnet-4-6');
  });
});
