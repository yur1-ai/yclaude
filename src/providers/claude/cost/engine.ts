import type { NormalizedEvent } from '../parser/types.js';
import { debugLog } from '../../../shared/debug.js';
import { MODEL_PRICING } from './pricing.js';
import type { ModelPricing } from './pricing.js';
import { toEstimatedCost } from './types.js';
import type { CostEvent } from './types.js';

const PER_MILLION = 1_000_000;

/**
 * Maps an array of NormalizedEvents to CostEvents, adding per-event USD cost estimates.
 *
 * @param events - Array of NormalizedEvents from the parser (after privacy filtering)
 * @returns Array of CostEvents with costUsd field added
 *
 * Rules:
 * - Events without tokens or without a model ID get costUsd=0 (no unknownModel flag)
 * - Events with an unrecognized model ID get costUsd=0 and unknownModel=true, with a warning to stderr
 * - Cache token double-counting is avoided: baseInput = max(0, input - cacheCreation - cacheRead)
 * - All original NormalizedEvent fields are preserved on each CostEvent (spread, not stripped)
 */
export function computeCosts(events: NormalizedEvent[]): CostEvent[] {
  return events.map(computeEventCost);
}

function computeEventCost(event: NormalizedEvent): CostEvent {
  // Events without token data or without a model contribute zero cost
  if (!event.tokens || !event.model) {
    return { ...event, costUsd: toEstimatedCost(0) };
  }

  const pricing = (MODEL_PRICING as Record<string, ModelPricing | undefined>)[event.model];

  if (!pricing) {
    debugLog(`[cost-engine] Unknown model: ${event.model} — costing as $0`);
    return { ...event, costUsd: toEstimatedCost(0), unknownModel: true };
  }

  const { tokens } = event;

  // cacheCreation = cacheCreation5m + cacheCreation1h (the parser splits these for us).
  // Subtract total cache (writes + reads) from input so we don't double-count:
  // base input tokens are billed at the standard input rate, while cache tiers are billed separately.
  // The max(0, ...) guard handles edge cases where input may already be net-of-cache.
  const baseInput = Math.max(0, tokens.input - tokens.cacheCreation - tokens.cacheRead);

  const cost =
    (baseInput * pricing.inputPerMTok) / PER_MILLION +
    (tokens.output * pricing.outputPerMTok) / PER_MILLION +
    (tokens.cacheCreation5m * pricing.cacheWrite5mPerMTok) / PER_MILLION +
    (tokens.cacheCreation1h * pricing.cacheWrite1hPerMTok) / PER_MILLION +
    (tokens.cacheRead * pricing.cacheReadPerMTok) / PER_MILLION;

  return { ...event, costUsd: toEstimatedCost(cost) };
}
