import type { NormalizedEvent } from '../parser/types.js';

// Unique symbol brand — prevents accidental structural satisfaction from external code.
// Any object with `{ __brand: 'EstimatedCost' }` as a string literal would satisfy
// a string-literal brand; `unique symbol` closes that loophole.
declare const __brand: unique symbol;

/**
 * A branded number type representing an estimated USD cost.
 * The brand is phantom — zero runtime cost, JSON-serializes as a plain number.
 * Use toEstimatedCost() to construct values; plain `number` is not assignable.
 */
export type EstimatedCost = number & { readonly [__brand]: 'EstimatedCost' };

/**
 * The ONLY way to produce an EstimatedCost value.
 * All cost values returned by the cost engine must pass through this constructor.
 */
export function toEstimatedCost(value: number): EstimatedCost {
  return value as EstimatedCost;
}

/**
 * A NormalizedEvent enriched with per-event cost information.
 * All other NormalizedEvent fields are preserved (spread, not stripped).
 */
export type CostEvent = NormalizedEvent & {
  /** Estimated USD cost for this event. Typed as EstimatedCost — not assignable from a bare number. */
  costUsd: EstimatedCost;
  /** Present (and true) only when the event's model ID was not found in MODEL_PRICING. */
  unknownModel?: true;
};
