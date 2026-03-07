// Source: https://platform.claude.com/docs/en/about-claude/pricing (fetched 2026-02-28)
// Model IDs from: https://platform.claude.com/docs/en/about-claude/models/overview (fetched 2026-02-28)
//
// Architecture: Named tier constants referenced by model-ID entries.
// Only 7 distinct pricing tiers exist across 19 model IDs.
//
// Cache multipliers (relative to base input price):
//   5-minute cache write: 1.25x base input
//   1-hour cache write:   2.00x base input
//   Cache read:           0.10x base input

// === Metadata ===

/** ISO date when pricing data was last verified against Anthropic docs. */
export const PRICING_LAST_UPDATED = '2026-02-28';

/** URL of the canonical Anthropic pricing/models documentation. */
export const PRICING_SOURCE = 'https://docs.anthropic.com/en/docs/about-claude/models';

// === Interface ===

export interface ModelPricing {
  inputPerMTok: number; // USD per million input tokens (base)
  outputPerMTok: number; // USD per million output tokens
  cacheWrite5mPerMTok: number; // USD per million 5-min ephemeral cache write tokens (1.25x input)
  cacheWrite1hPerMTok: number; // USD per million 1-hour ephemeral cache write tokens (2.0x input)
  cacheReadPerMTok: number; // USD per million cache read tokens (0.1x input)
}

// === Tier Definitions ===
// Each tier is a single object referenced by multiple model IDs.
// Cache fields are derived from the multiplier rules above.

/** Opus 4.0, 4.1, 3-opus — premium Opus pricing ($15/$75) */
const TIER_OPUS_PREMIUM: ModelPricing = {
  inputPerMTok: 15.0,
  outputPerMTok: 75.0,
  cacheWrite5mPerMTok: 18.75,
  cacheWrite1hPerMTok: 30.0,
  cacheReadPerMTok: 1.5,
};

/** Opus 4.5, 4.6 — current Opus pricing ($5/$25) */
const TIER_OPUS: ModelPricing = {
  inputPerMTok: 5.0,
  outputPerMTok: 25.0,
  cacheWrite5mPerMTok: 6.25,
  cacheWrite1hPerMTok: 10.0,
  cacheReadPerMTok: 0.5,
};

/** Sonnet 4.0, 4.5, 4.6, 3.7 — current-gen Sonnet pricing ($3/$15) */
const TIER_SONNET: ModelPricing = {
  inputPerMTok: 3.0,
  outputPerMTok: 15.0,
  cacheWrite5mPerMTok: 3.75,
  cacheWrite1hPerMTok: 6.0,
  cacheReadPerMTok: 0.3,
};

/** Haiku 4.5 ($1/$5) */
const TIER_HAIKU_45: ModelPricing = {
  inputPerMTok: 1.0,
  outputPerMTok: 5.0,
  cacheWrite5mPerMTok: 1.25,
  cacheWrite1hPerMTok: 2.0,
  cacheReadPerMTok: 0.1,
};

/** Claude 3.5 Haiku ($0.80/$4) */
const TIER_HAIKU_35: ModelPricing = {
  inputPerMTok: 0.8,
  outputPerMTok: 4.0,
  cacheWrite5mPerMTok: 1.0,
  cacheWrite1hPerMTok: 1.6,
  cacheReadPerMTok: 0.08,
};

/** Claude 3 Haiku — deprecated ($0.25/$1.25, published cache prices slightly rounded) */
const TIER_HAIKU_3: ModelPricing = {
  inputPerMTok: 0.25,
  outputPerMTok: 1.25,
  cacheWrite5mPerMTok: 0.3,
  cacheWrite1hPerMTok: 0.5,
  cacheReadPerMTok: 0.03,
};

/** Claude 3 Sonnet — deprecated, kept separate from TIER_SONNET for generational clarity ($3/$15) */
const TIER_SONNET_3: ModelPricing = {
  inputPerMTok: 3.0,
  outputPerMTok: 15.0,
  cacheWrite5mPerMTok: 3.75,
  cacheWrite1hPerMTok: 6.0,
  cacheReadPerMTok: 0.3,
};

// === Model ID -> Tier Mapping ===

/** Indexed by exact API model ID strings. Lookup is case-sensitive — preserve event.model exactly. */
export const MODEL_PRICING = {
  // --- Latest models (current as of 2026-02-28) ---
  'claude-opus-4-6': TIER_OPUS,
  'claude-sonnet-4-6': TIER_SONNET,

  // --- Claude Haiku 4.5 ---
  'claude-haiku-4-5-20251001': TIER_HAIKU_45,
  'claude-haiku-4-5': TIER_HAIKU_45,

  // --- Claude Sonnet 4.5 ---
  'claude-sonnet-4-5-20250929': TIER_SONNET,
  'claude-sonnet-4-5': TIER_SONNET,

  // --- Claude Opus 4.5 ---
  'claude-opus-4-5-20251101': TIER_OPUS,
  'claude-opus-4-5': TIER_OPUS,

  // --- Claude Opus 4.1 ---
  'claude-opus-4-1-20250805': TIER_OPUS_PREMIUM,
  'claude-opus-4-1': TIER_OPUS_PREMIUM,

  // --- Claude Sonnet 4.0 ---
  'claude-sonnet-4-20250514': TIER_SONNET,
  'claude-sonnet-4-0': TIER_SONNET,

  // --- Claude Opus 4.0 ---
  'claude-opus-4-20250514': TIER_OPUS_PREMIUM,
  'claude-opus-4-0': TIER_OPUS_PREMIUM,

  // --- Deprecated models (kept for backward compatibility with older JSONL files) ---
  'claude-sonnet-3-7-20250219': TIER_SONNET,
  'claude-3-5-haiku-20241022': TIER_HAIKU_35,
  'claude-3-haiku-20240307': TIER_HAIKU_3,
  'claude-3-opus-20240229': TIER_OPUS_PREMIUM,
  'claude-3-sonnet-20240229': TIER_SONNET_3,
} satisfies Record<string, ModelPricing>;

/** Union of all model IDs in the pricing table. */
export type KnownModel = keyof typeof MODEL_PRICING;
