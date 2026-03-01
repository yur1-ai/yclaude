// Source: https://platform.claude.com/docs/en/about-claude/pricing (fetched 2026-02-28)
// Model IDs from: https://platform.claude.com/docs/en/about-claude/models/overview (fetched 2026-02-28)
//
// Cache multipliers (relative to base input price):
//   5-minute cache write: 1.25x base input
//   1-hour cache write:   2.00x base input
//   Cache read:           0.10x base input

export interface ModelPricing {
  inputPerMTok: number; // USD per million input tokens (base)
  outputPerMTok: number; // USD per million output tokens
  cacheWrite5mPerMTok: number; // USD per million 5-min ephemeral cache write tokens (1.25x input)
  cacheWrite1hPerMTok: number; // USD per million 1-hour ephemeral cache write tokens (2.0x input)
  cacheReadPerMTok: number; // USD per million cache read tokens (0.1x input)
}

/** Indexed by exact API model ID strings. Lookup is case-sensitive — preserve event.model exactly. */
export const MODEL_PRICING = {
  // --- Latest models (current as of 2026-02-28) ---

  'claude-opus-4-6': {
    inputPerMTok: 5.0,
    outputPerMTok: 25.0,
    cacheWrite5mPerMTok: 6.25,
    cacheWrite1hPerMTok: 10.0,
    cacheReadPerMTok: 0.5,
  },
  'claude-sonnet-4-6': {
    inputPerMTok: 3.0,
    outputPerMTok: 15.0,
    cacheWrite5mPerMTok: 3.75,
    cacheWrite1hPerMTok: 6.0,
    cacheReadPerMTok: 0.3,
  },

  // --- Claude Haiku 4.5 ---
  'claude-haiku-4-5-20251001': {
    inputPerMTok: 1.0,
    outputPerMTok: 5.0,
    cacheWrite5mPerMTok: 1.25,
    cacheWrite1hPerMTok: 2.0,
    cacheReadPerMTok: 0.1,
  },
  'claude-haiku-4-5': {
    // alias
    inputPerMTok: 1.0,
    outputPerMTok: 5.0,
    cacheWrite5mPerMTok: 1.25,
    cacheWrite1hPerMTok: 2.0,
    cacheReadPerMTok: 0.1,
  },

  // --- Claude Sonnet 4.5 ---
  'claude-sonnet-4-5-20250929': {
    inputPerMTok: 3.0,
    outputPerMTok: 15.0,
    cacheWrite5mPerMTok: 3.75,
    cacheWrite1hPerMTok: 6.0,
    cacheReadPerMTok: 0.3,
  },
  'claude-sonnet-4-5': {
    // alias
    inputPerMTok: 3.0,
    outputPerMTok: 15.0,
    cacheWrite5mPerMTok: 3.75,
    cacheWrite1hPerMTok: 6.0,
    cacheReadPerMTok: 0.3,
  },

  // --- Claude Opus 4.5 ---
  'claude-opus-4-5-20251101': {
    inputPerMTok: 5.0,
    outputPerMTok: 25.0,
    cacheWrite5mPerMTok: 6.25,
    cacheWrite1hPerMTok: 10.0,
    cacheReadPerMTok: 0.5,
  },
  'claude-opus-4-5': {
    // alias
    inputPerMTok: 5.0,
    outputPerMTok: 25.0,
    cacheWrite5mPerMTok: 6.25,
    cacheWrite1hPerMTok: 10.0,
    cacheReadPerMTok: 0.5,
  },

  // --- Claude Opus 4.1 ---
  'claude-opus-4-1-20250805': {
    inputPerMTok: 15.0,
    outputPerMTok: 75.0,
    cacheWrite5mPerMTok: 18.75,
    cacheWrite1hPerMTok: 30.0,
    cacheReadPerMTok: 1.5,
  },
  'claude-opus-4-1': {
    // alias
    inputPerMTok: 15.0,
    outputPerMTok: 75.0,
    cacheWrite5mPerMTok: 18.75,
    cacheWrite1hPerMTok: 30.0,
    cacheReadPerMTok: 1.5,
  },

  // --- Claude Sonnet 4.0 ---
  'claude-sonnet-4-20250514': {
    inputPerMTok: 3.0,
    outputPerMTok: 15.0,
    cacheWrite5mPerMTok: 3.75,
    cacheWrite1hPerMTok: 6.0,
    cacheReadPerMTok: 0.3,
  },
  'claude-sonnet-4-0': {
    // alias
    inputPerMTok: 3.0,
    outputPerMTok: 15.0,
    cacheWrite5mPerMTok: 3.75,
    cacheWrite1hPerMTok: 6.0,
    cacheReadPerMTok: 0.3,
  },

  // --- Claude Opus 4.0 ---
  'claude-opus-4-20250514': {
    inputPerMTok: 15.0,
    outputPerMTok: 75.0,
    cacheWrite5mPerMTok: 18.75,
    cacheWrite1hPerMTok: 30.0,
    cacheReadPerMTok: 1.5,
  },
  'claude-opus-4-0': {
    // alias
    inputPerMTok: 15.0,
    outputPerMTok: 75.0,
    cacheWrite5mPerMTok: 18.75,
    cacheWrite1hPerMTok: 30.0,
    cacheReadPerMTok: 1.5,
  },

  // --- Deprecated models (kept for backward compatibility with older JSONL files) ---

  'claude-sonnet-3-7-20250219': {
    // deprecated
    inputPerMTok: 3.0,
    outputPerMTok: 15.0,
    cacheWrite5mPerMTok: 3.75,
    cacheWrite1hPerMTok: 6.0,
    cacheReadPerMTok: 0.3,
  },
  'claude-3-5-haiku-20241022': {
    inputPerMTok: 0.8,
    outputPerMTok: 4.0,
    cacheWrite5mPerMTok: 1.0,
    cacheWrite1hPerMTok: 1.6,
    cacheReadPerMTok: 0.08,
  },
  'claude-3-haiku-20240307': {
    // deprecated, retiring 2026-04-19
    inputPerMTok: 0.25,
    outputPerMTok: 1.25,
    cacheWrite5mPerMTok: 0.3,
    cacheWrite1hPerMTok: 0.5,
    cacheReadPerMTok: 0.03,
  },
  'claude-3-opus-20240229': {
    // deprecated
    inputPerMTok: 15.0,
    outputPerMTok: 75.0,
    cacheWrite5mPerMTok: 18.75,
    cacheWrite1hPerMTok: 30.0,
    cacheReadPerMTok: 1.5,
  },
  'claude-3-sonnet-20240229': {
    inputPerMTok: 3.0,
    outputPerMTok: 15.0,
    cacheWrite5mPerMTok: 3.75,
    cacheWrite1hPerMTok: 6.0,
    cacheReadPerMTok: 0.3,
  },
} satisfies Record<string, ModelPricing>;

/** Union of all model IDs in the pricing table. */
export type KnownModel = keyof typeof MODEL_PRICING;
