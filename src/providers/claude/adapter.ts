import type { LoadOptions, ProviderAdapter, UnifiedEvent } from '../types.js';
import { computeCosts } from './cost/engine.js';
import { applyPrivacyFilter } from './cost/privacy.js';
import { DedupAccumulator } from './parser/dedup.js';
import { normalizeEvent } from './parser/normalizer.js';
import { discoverJSONLFiles, streamJSONLFile } from './parser/reader.js';
import { enableDebug } from '../../shared/debug.js';

/**
 * Claude Code provider adapter.
 *
 * Wraps the existing parse -> privacy-filter -> cost pipeline to produce
 * UnifiedEvent[] from Claude Code JSONL files. No algorithmic changes --
 * the same normalization, deduplication, privacy filtering, and cost
 * computation logic runs; only the output type is mapped to UnifiedEvent.
 */
export class ClaudeAdapter implements ProviderAdapter {
  readonly id = 'claude' as const;
  readonly name = 'Claude Code';

  async detect(): Promise<boolean> {
    const files = await discoverJSONLFiles();
    return files.length > 0;
  }

  async load(opts: LoadOptions): Promise<UnifiedEvent[]> {
    if (opts.debug) {
      enableDebug();
    }

    // 1. Discover JSONL files
    const files = await discoverJSONLFiles(opts.dir);

    // 2. Stream, normalize, and deduplicate (same as existing parseAll)
    const dedup = new DedupAccumulator();
    for (const file of files) {
      for await (const raw of streamJSONLFile(file)) {
        if (typeof raw !== 'object' || raw === null) continue;
        const event = normalizeEvent(
          raw as Record<string, unknown>,
          opts.preserveContent ? { preserveContent: true } : undefined,
        );
        if (event !== null) {
          dedup.add(event);
        }
      }
    }

    let normalized = dedup.results();

    // 3. Apply privacy filter unless content is explicitly preserved
    if (!opts.preserveContent) {
      normalized = applyPrivacyFilter(normalized);
    }

    // 4. Compute costs
    const costed = computeCosts(normalized);

    // 5. Map CostEvent[] to UnifiedEvent[]
    return costed.map((e): UnifiedEvent => {
      // Access passthrough fields via Record cast
      const raw = e as Record<string, unknown>;

      return {
        id: e.uuid,
        provider: 'claude',
        sessionId: e.sessionId,
        timestamp: e.timestamp,
        type: e.type,
        costUsd: e.costUsd as number, // strip EstimatedCost brand
        costSource: 'estimated',
        // Optional shared fields — conditional spread for exactOptionalPropertyTypes
        ...(e.model !== undefined ? { model: e.model } : {}),
        ...(e.tokens !== undefined ? { tokens: e.tokens } : {}),
        ...(e.cwd !== undefined ? { cwd: e.cwd } : {}),
        ...(e.gitBranch !== undefined ? { gitBranch: e.gitBranch } : {}),
        ...(e.durationMs !== undefined ? { durationMs: e.durationMs } : {}),
        // Claude-specific optionals
        ...(e.isSidechain !== undefined ? { isSidechain: e.isSidechain } : {}),
        ...(e.agentId !== undefined ? { agentId: e.agentId } : {}),
        ...(e.requestId !== undefined ? { requestId: e.requestId } : {}),
        ...(e.unknownModel !== undefined ? { unknownModel: e.unknownModel } : {}),
        // Passthrough message field (conversation content when preserveContent=true)
        ...(raw.message !== undefined ? { message: raw.message as Record<string, unknown> } : {}),
      };
    });
  }
}
