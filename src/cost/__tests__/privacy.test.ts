import { describe, it, expect } from 'vitest';
import { applyPrivacyFilter } from '../privacy.js';
import type { NormalizedEvent } from '../../parser/types.js';

// Minimal safe NormalizedEvent — no content fields
const safeEvent: NormalizedEvent = {
  uuid: 'test-uuid-1',
  type: 'assistant',
  timestamp: '2024-01-01T00:00:00Z',
  sessionId: 'session-1',
  model: 'claude-opus-4-5',
  tokens: {
    input: 100,
    output: 50,
    cacheCreation: 0,
    cacheRead: 0,
    cacheCreation5m: 0,
    cacheCreation1h: 0,
  },
};

describe('applyPrivacyFilter', () => {
  it('returns [] for empty input', () => {
    expect(applyPrivacyFilter([])).toEqual([]);
  });

  it('preserves all safe fields when no content fields are present', () => {
    const result = applyPrivacyFilter([safeEvent]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(safeEvent);
  });

  it('strips message field and preserves all other fields', () => {
    const eventWithMessage = {
      ...safeEvent,
      message: { role: 'user', content: 'Hello assistant' },
    } as NormalizedEvent;

    const result = applyPrivacyFilter([eventWithMessage]);
    expect(result).toHaveLength(1);
    const filtered = result[0]!;
    expect('message' in filtered).toBe(false);
    // All safe fields still present
    expect(filtered.uuid).toBe(safeEvent.uuid);
    expect(filtered.type).toBe(safeEvent.type);
    expect(filtered.timestamp).toBe(safeEvent.timestamp);
    expect(filtered.sessionId).toBe(safeEvent.sessionId);
    expect(filtered.model).toBe(safeEvent.model);
    expect(filtered.tokens).toEqual(safeEvent.tokens);
  });

  it('strips content field and preserves all other fields', () => {
    const eventWithContent = {
      ...safeEvent,
      content: [{ type: 'text', text: 'some content' }],
    } as NormalizedEvent;

    const result = applyPrivacyFilter([eventWithContent]);
    expect(result).toHaveLength(1);
    const filtered = result[0]!;
    expect('content' in filtered).toBe(false);
    expect(filtered.uuid).toBe(safeEvent.uuid);
    expect(filtered.model).toBe(safeEvent.model);
  });

  it('strips text field and preserves all other fields', () => {
    const eventWithText = {
      ...safeEvent,
      text: 'raw text content',
    } as NormalizedEvent;

    const result = applyPrivacyFilter([eventWithText]);
    expect(result).toHaveLength(1);
    const filtered = result[0]!;
    expect('text' in filtered).toBe(false);
    expect(filtered.uuid).toBe(safeEvent.uuid);
    expect(filtered.model).toBe(safeEvent.model);
  });

  it('strips both message and content fields while preserving safe fields', () => {
    const eventWithBoth = {
      ...safeEvent,
      message: { role: 'assistant', content: 'response' },
      content: 'plain content',
    } as NormalizedEvent;

    const result = applyPrivacyFilter([eventWithBoth]);
    expect(result).toHaveLength(1);
    const filtered = result[0]!;
    expect('message' in filtered).toBe(false);
    expect('content' in filtered).toBe(false);
    expect(filtered.uuid).toBe(safeEvent.uuid);
    expect(filtered.tokens).toEqual(safeEvent.tokens);
  });

  it('does NOT strip the tokens object (contains counts, not conversation text)', () => {
    const result = applyPrivacyFilter([safeEvent]);
    const filtered = result[0]!;
    expect(filtered.tokens).toEqual(safeEvent.tokens);
    expect(filtered.tokens?.input).toBe(100);
    expect(filtered.tokens?.output).toBe(50);
  });

  it('does not mutate the original event objects', () => {
    const eventWithMessage = {
      ...safeEvent,
      message: { role: 'user', content: 'Do not mutate me' },
    } as NormalizedEvent;

    // Keep a reference to the original
    const originalMessage = (eventWithMessage as Record<string, unknown>).message;

    applyPrivacyFilter([eventWithMessage]);

    // Original should still have the message field
    expect((eventWithMessage as Record<string, unknown>).message).toBe(originalMessage);
    expect('message' in eventWithMessage).toBe(true);
  });

  it('returns NormalizedEvent[] (same type as input)', () => {
    const result: NormalizedEvent[] = applyPrivacyFilter([safeEvent]);
    expect(result).toHaveLength(1);
  });

  it('processes multiple events correctly', () => {
    const event1 = { ...safeEvent, uuid: 'uuid-1', message: 'msg1' } as NormalizedEvent;
    const event2 = { ...safeEvent, uuid: 'uuid-2', content: 'content2' } as NormalizedEvent;
    const event3 = { ...safeEvent, uuid: 'uuid-3' };

    const result = applyPrivacyFilter([event1, event2, event3]);
    expect(result).toHaveLength(3);
    const [r1, r2, r3] = result as [NormalizedEvent, NormalizedEvent, NormalizedEvent];
    expect('message' in r1).toBe(false);
    expect(r1.uuid).toBe('uuid-1');
    expect('content' in r2).toBe(false);
    expect(r2.uuid).toBe('uuid-2');
    expect(r3.uuid).toBe('uuid-3');
  });
});
