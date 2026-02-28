import { enableDebug } from './shared/debug.js';
import { discoverJSONLFiles, streamJSONLFile } from './parser/reader.js';
import { normalizeEvent } from './parser/normalizer.js';
import { DedupAccumulator } from './parser/dedup.js';
import type { ParseOptions } from './parser/types.js';

// Re-export types for consumers (Phase 2 imports NormalizedEvent from here)
export type { NormalizedEvent, ParseOptions } from './parser/types.js';

// Main entry point: discover all JSONL files, parse and normalize every event,
// deduplicate by UUID, return the canonical event collection.
export async function parseAll(options: ParseOptions = {}): Promise<import('./parser/types.js').NormalizedEvent[]> {
  if (options.debug) {
    enableDebug();
  }

  const files = await discoverJSONLFiles(options.dir);
  const dedup = new DedupAccumulator();

  for (const file of files) {
    for await (const raw of streamJSONLFile(file)) {
      if (typeof raw !== 'object' || raw === null) continue;
      const event = normalizeEvent(raw as Record<string, unknown>);
      if (event !== null) {
        dedup.add(event);
      }
    }
  }

  return dedup.results();
}
