import { debugLog } from '../shared/debug.js';
import type { NormalizedEvent } from './types.js';

// Streaming deduplication accumulator.
// First-seen event wins; subsequent events with the same uuid are silently dropped.
// Map preserves insertion order, so results() returns events in parse order.
export class DedupAccumulator {
  private readonly seen = new Map<string, NormalizedEvent>();
  private duplicateCount = 0;

  // Returns true if event was added (new uuid), false if dropped (duplicate).
  add(event: NormalizedEvent): boolean {
    if (this.seen.has(event.uuid)) {
      this.duplicateCount++;
      debugLog(`Duplicate uuid dropped: ${event.uuid} (total duplicates: ${this.duplicateCount})`);
      return false;
    }
    this.seen.set(event.uuid, event);
    return true;
  }

  results(): NormalizedEvent[] {
    return Array.from(this.seen.values());
  }

  get size(): number {
    return this.seen.size;
  }

  get duplicates(): number {
    return this.duplicateCount;
  }
}
