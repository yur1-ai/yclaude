import type { LoadOptions, ProviderAdapter, UnifiedEvent } from '../types.js';

/**
 * Cursor provider adapter stub.
 *
 * Phase 12 will implement actual detection (checking for state.vscdb)
 * and loading (parsing SQLite database). Until then, this adapter
 * always reports as not found.
 */
export class CursorAdapter implements ProviderAdapter {
  readonly id = 'cursor' as const;
  readonly name = 'Cursor';

  async detect(): Promise<boolean> {
    return false;
  }

  async load(_opts: LoadOptions): Promise<UnifiedEvent[]> {
    return [];
  }
}
