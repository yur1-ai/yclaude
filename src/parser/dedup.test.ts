import { describe, it, expect } from 'vitest';
import { DedupAccumulator } from '../parser/dedup.js';
import type { NormalizedEvent } from '../parser/types.js';

function makeEvent(uuid: string, extra?: Partial<NormalizedEvent>): NormalizedEvent {
  return { uuid, type: 'assistant', timestamp: '2026-01-01T00:00:00Z', sessionId: 'sess-1', ...extra };
}

describe('DedupAccumulator', () => {
  it('accepts a new event and returns true', () => {
    const dedup = new DedupAccumulator();
    expect(dedup.add(makeEvent('uuid-1'))).toBe(true);
  });

  it('rejects a duplicate uuid and returns false', () => {
    const dedup = new DedupAccumulator();
    dedup.add(makeEvent('uuid-1'));
    expect(dedup.add(makeEvent('uuid-1'))).toBe(false);
  });

  it('first-seen event is retained on duplicate', () => {
    const dedup = new DedupAccumulator();
    const first = makeEvent('uuid-1', { model: 'claude-sonnet-4-6' });
    const second = makeEvent('uuid-1', { model: 'claude-opus-4-6' });
    dedup.add(first);
    dedup.add(second);
    expect(dedup.results()[0]?.model).toBe('claude-sonnet-4-6');
  });

  it('results() returns events in insertion order', () => {
    const dedup = new DedupAccumulator();
    dedup.add(makeEvent('uuid-a'));
    dedup.add(makeEvent('uuid-b'));
    dedup.add(makeEvent('uuid-c'));
    expect(dedup.results().map(e => e.uuid)).toEqual(['uuid-a', 'uuid-b', 'uuid-c']);
  });

  it('size reflects unique events only', () => {
    const dedup = new DedupAccumulator();
    dedup.add(makeEvent('uuid-1'));
    dedup.add(makeEvent('uuid-1'));
    dedup.add(makeEvent('uuid-2'));
    expect(dedup.size).toBe(2);
    expect(dedup.duplicates).toBe(1);
  });
});
