import { describe, it, expect } from 'vitest';
import { MODEL_PRICING } from '../pricing.js';

describe('MODEL_PRICING constants', () => {
  it('has an entry for claude-opus-4-6 with correct pricing', () => {
    const p = MODEL_PRICING['claude-opus-4-6'];
    expect(p).toBeDefined();
    expect(p!.inputPerMTok).toBe(5.00);
    expect(p!.outputPerMTok).toBe(25.00);
  });

  it('has an entry for claude-sonnet-4-6 with correct pricing', () => {
    const p = MODEL_PRICING['claude-sonnet-4-6'];
    expect(p).toBeDefined();
    expect(p!.inputPerMTok).toBe(3.00);
    expect(p!.outputPerMTok).toBe(15.00);
  });

  it('has an entry for claude-3-5-haiku-20241022 with correct pricing', () => {
    const p = MODEL_PRICING['claude-3-5-haiku-20241022'];
    expect(p).toBeDefined();
    expect(p!.inputPerMTok).toBe(0.80);
  });

  it('has an entry for claude-haiku-4-5-20251001 with correct pricing', () => {
    const p = MODEL_PRICING['claude-haiku-4-5-20251001'];
    expect(p).toBeDefined();
    expect(p!.inputPerMTok).toBe(1.00);
  });

  it('cache multipliers: 5m write = 1.25x input, 1h write = 2.0x input, read = 0.1x input (verified on claude-sonnet-4-6)', () => {
    const p = MODEL_PRICING['claude-sonnet-4-6']!;
    // 5m = 1.25x input: 3.00 * 1.25 = 3.75
    expect(p.cacheWrite5mPerMTok).toBeCloseTo(3.75, 5);
    // 1h = 2.0x input: 3.00 * 2.00 = 6.00
    expect(p.cacheWrite1hPerMTok).toBeCloseTo(6.00, 5);
    // read = 0.1x input: 3.00 * 0.10 = 0.30
    expect(p.cacheReadPerMTok).toBeCloseTo(0.30, 5);
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
      expect((MODEL_PRICING as Record<string, unknown>)[model], `Missing model: ${model}`).toBeDefined();
    }
  });
});
