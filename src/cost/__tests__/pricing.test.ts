import { describe, expect, it } from 'vitest';
import { MODEL_PRICING, PRICING_LAST_UPDATED, PRICING_SOURCE } from '../pricing.js';

describe('MODEL_PRICING constants', () => {
  it('has an entry for claude-opus-4-6 with correct pricing', () => {
    const p = MODEL_PRICING['claude-opus-4-6'];
    expect(p).toBeDefined();
    expect(p?.inputPerMTok).toBe(5.0);
    expect(p?.outputPerMTok).toBe(25.0);
  });

  it('has an entry for claude-sonnet-4-6 with correct pricing', () => {
    const p = MODEL_PRICING['claude-sonnet-4-6'];
    expect(p).toBeDefined();
    expect(p?.inputPerMTok).toBe(3.0);
    expect(p?.outputPerMTok).toBe(15.0);
  });

  it('has an entry for claude-3-5-haiku-20241022 with correct pricing', () => {
    const p = MODEL_PRICING['claude-3-5-haiku-20241022'];
    expect(p).toBeDefined();
    expect(p?.inputPerMTok).toBe(0.8);
  });

  it('has an entry for claude-haiku-4-5-20251001 with correct pricing', () => {
    const p = MODEL_PRICING['claude-haiku-4-5-20251001'];
    expect(p).toBeDefined();
    expect(p?.inputPerMTok).toBe(1.0);
  });

  it('cache multipliers: 5m write = 1.25x input, 1h write = 2.0x input, read = 0.1x input (verified on claude-sonnet-4-6)', () => {
    // biome-ignore lint/style/noNonNullAssertion: test-only assertion; entry is verified above
    const p = MODEL_PRICING['claude-sonnet-4-6']!;
    // 5m = 1.25x input: 3.00 * 1.25 = 3.75
    expect(p.cacheWrite5mPerMTok).toBeCloseTo(3.75, 5);
    // 1h = 2.0x input: 3.00 * 2.00 = 6.00
    expect(p.cacheWrite1hPerMTok).toBeCloseTo(6.0, 5);
    // read = 0.1x input: 3.00 * 0.10 = 0.30
    expect(p.cacheReadPerMTok).toBeCloseTo(0.3, 5);
  });

  it('includes all required model entries', () => {
    const requiredModels = [
      'claude-opus-4-6',
      'claude-sonnet-4-6',
      'claude-haiku-4-5-20251001',
      'claude-haiku-4-5',
      'claude-sonnet-4-5-20250929',
      'claude-sonnet-4-5',
      'claude-opus-4-5-20251101',
      'claude-opus-4-5',
      'claude-opus-4-1-20250805',
      'claude-opus-4-1',
      'claude-sonnet-4-20250514',
      'claude-sonnet-4-0',
      'claude-opus-4-20250514',
      'claude-opus-4-0',
      'claude-sonnet-3-7-20250219',
      'claude-3-5-haiku-20241022',
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
    ];

    for (const model of requiredModels) {
      expect(
        (MODEL_PRICING as Record<string, unknown>)[model],
        `Missing model: ${model}`,
      ).toBeDefined();
    }
  });
});

describe('Pricing metadata', () => {
  it('exports PRICING_LAST_UPDATED as 2026-02-28', () => {
    expect(PRICING_LAST_UPDATED).toBe('2026-02-28');
  });

  it('PRICING_LAST_UPDATED matches YYYY-MM-DD format', () => {
    expect(PRICING_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('exports PRICING_SOURCE as a non-empty URL string', () => {
    expect(typeof PRICING_SOURCE).toBe('string');
    expect(PRICING_SOURCE.length).toBeGreaterThan(0);
    expect(PRICING_SOURCE).toMatch(/^https:\/\//);
  });
});

describe('Tier reference deduplication', () => {
  it('claude-opus-4-6 and claude-opus-4-5 share the same tier object', () => {
    expect(MODEL_PRICING['claude-opus-4-6']).toBe(MODEL_PRICING['claude-opus-4-5']);
  });

  it('claude-opus-4-1 and claude-opus-4-0 share the same tier object', () => {
    expect(MODEL_PRICING['claude-opus-4-1']).toBe(MODEL_PRICING['claude-opus-4-0']);
  });

  it('dated aliases share identity with short aliases', () => {
    // Opus 4.5
    expect(MODEL_PRICING['claude-opus-4-5']).toBe(MODEL_PRICING['claude-opus-4-5-20251101']);
    // Haiku 4.5
    expect(MODEL_PRICING['claude-haiku-4-5']).toBe(MODEL_PRICING['claude-haiku-4-5-20251001']);
    // Sonnet 4.5
    expect(MODEL_PRICING['claude-sonnet-4-5']).toBe(MODEL_PRICING['claude-sonnet-4-5-20250929']);
    // Opus 4.1
    expect(MODEL_PRICING['claude-opus-4-1']).toBe(MODEL_PRICING['claude-opus-4-1-20250805']);
    // Sonnet 4.0
    expect(MODEL_PRICING['claude-sonnet-4-0']).toBe(MODEL_PRICING['claude-sonnet-4-20250514']);
    // Opus 4.0
    expect(MODEL_PRICING['claude-opus-4-0']).toBe(MODEL_PRICING['claude-opus-4-20250514']);
  });

  it('all 19 existing model IDs still present with correct numeric values', () => {
    // Opus tier ($5/$25)
    expect(MODEL_PRICING['claude-opus-4-6'].inputPerMTok).toBe(5.0);
    expect(MODEL_PRICING['claude-opus-4-6'].outputPerMTok).toBe(25.0);
    expect(MODEL_PRICING['claude-opus-4-5'].inputPerMTok).toBe(5.0);
    expect(MODEL_PRICING['claude-opus-4-5-20251101'].inputPerMTok).toBe(5.0);

    // Opus premium tier ($15/$75)
    expect(MODEL_PRICING['claude-opus-4-1'].inputPerMTok).toBe(15.0);
    expect(MODEL_PRICING['claude-opus-4-1-20250805'].inputPerMTok).toBe(15.0);
    expect(MODEL_PRICING['claude-opus-4-0'].inputPerMTok).toBe(15.0);
    expect(MODEL_PRICING['claude-opus-4-20250514'].inputPerMTok).toBe(15.0);
    expect(MODEL_PRICING['claude-3-opus-20240229'].inputPerMTok).toBe(15.0);

    // Sonnet tier ($3/$15)
    expect(MODEL_PRICING['claude-sonnet-4-6'].inputPerMTok).toBe(3.0);
    expect(MODEL_PRICING['claude-sonnet-4-5'].inputPerMTok).toBe(3.0);
    expect(MODEL_PRICING['claude-sonnet-4-5-20250929'].inputPerMTok).toBe(3.0);
    expect(MODEL_PRICING['claude-sonnet-4-0'].inputPerMTok).toBe(3.0);
    expect(MODEL_PRICING['claude-sonnet-4-20250514'].inputPerMTok).toBe(3.0);
    expect(MODEL_PRICING['claude-sonnet-3-7-20250219'].inputPerMTok).toBe(3.0);

    // Sonnet 3 tier ($3/$15)
    expect(MODEL_PRICING['claude-3-sonnet-20240229'].inputPerMTok).toBe(3.0);

    // Haiku tiers
    expect(MODEL_PRICING['claude-haiku-4-5'].inputPerMTok).toBe(1.0);
    expect(MODEL_PRICING['claude-haiku-4-5-20251001'].inputPerMTok).toBe(1.0);
    expect(MODEL_PRICING['claude-3-5-haiku-20241022'].inputPerMTok).toBe(0.8);
    expect(MODEL_PRICING['claude-3-haiku-20240307'].inputPerMTok).toBe(0.25);
  });
});

describe('Cache multiplier invariant (all tiers)', () => {
  it('every model entry satisfies 5m~1.25x, 1h~2.0x, read~0.1x of inputPerMTok', () => {
    // Precision 1 (1 decimal place) accommodates known rounding in published
    // Anthropic pricing for older models (e.g. claude-3-haiku: 0.25*1.25=0.3125
    // but published as 0.3). All current-gen tiers match exactly at precision 5.
    for (const [_model, pricing] of Object.entries(MODEL_PRICING)) {
      expect(pricing.cacheWrite5mPerMTok).toBeCloseTo(
        pricing.inputPerMTok * 1.25,
        1,
      );
      expect(pricing.cacheWrite1hPerMTok).toBeCloseTo(
        pricing.inputPerMTok * 2.0,
        1,
      );
      expect(pricing.cacheReadPerMTok).toBeCloseTo(
        pricing.inputPerMTok * 0.1,
        1,
      );
    }
  });
});
