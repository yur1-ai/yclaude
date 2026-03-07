import type { LoadOptions, ProviderAdapter, UnifiedEvent } from '../types.js';

/**
 * OpenCode provider adapter stub.
 *
 * Phase 14 will implement actual detection (checking for OpenCode
 * session files) and loading. Until then, this adapter always
 * reports as not found.
 */
export class OpenCodeAdapter implements ProviderAdapter {
  readonly id = 'opencode' as const;
  readonly name = 'OpenCode';

  async detect(): Promise<boolean> {
    return false;
  }

  async load(_opts: LoadOptions): Promise<UnifiedEvent[]> {
    return [];
  }
}
