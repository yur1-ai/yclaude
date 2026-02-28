import { describe, it, expect } from 'vitest';
import { normalizeEvent } from '../parser/normalizer.js';

// Minimal valid assistant event from real Claude Code v2.1.63 JSONL
const RAW_ASSISTANT_EVENT = {
  uuid: 'test-uuid-001',
  type: 'assistant',
  timestamp: '2026-01-15T10:30:00.000Z',
  sessionId: 'session-abc',
  requestId: 'req-xyz',
  isSidechain: false,
  gitBranch: 'main',
  cwd: '/Users/test/projects/myapp',
  slug: '-Users-test-projects-myapp',  // slug is present but NOT used for project path
  version: '2.1.63',
  message: {
    model: 'claude-sonnet-4-6',
    usage: {
      input_tokens: 1500,
      output_tokens: 450,
      cache_creation_input_tokens: 800,
      cache_read_input_tokens: 200,
      cache_creation: {
        ephemeral_5m_input_tokens: 300,
        ephemeral_1h_input_tokens: 500,
      },
      service_tier: 'standard',
      speed: 'fast',
    },
  },
};

describe('normalizeEvent()', () => {
  it('returns null for events without uuid', () => {
    expect(normalizeEvent({ type: 'progress', sessionId: 'abc' })).toBeNull();
  });

  it('returns null for events with empty uuid', () => {
    expect(normalizeEvent({ uuid: '', type: 'user', sessionId: 'abc' })).toBeNull();
  });

  it('extracts required fields from assistant event', () => {
    const result = normalizeEvent(RAW_ASSISTANT_EVENT);
    expect(result).not.toBeNull();
    expect(result?.uuid).toBe('test-uuid-001');
    expect(result?.type).toBe('assistant');
    expect(result?.timestamp).toBe('2026-01-15T10:30:00.000Z');
    expect(result?.sessionId).toBe('session-abc');
  });

  it('extracts all six token fields correctly', () => {
    const result = normalizeEvent(RAW_ASSISTANT_EVENT);
    expect(result?.tokens).toEqual({
      input: 1500,
      output: 450,
      cacheCreation: 800,
      cacheRead: 200,
      cacheCreation5m: 300,
      cacheCreation1h: 500,
    });
  });

  it('uses cwd for project path — not slug', () => {
    const result = normalizeEvent(RAW_ASSISTANT_EVENT);
    expect(result?.cwd).toBe('/Users/test/projects/myapp');
    // slug is passed through as unknown field, not decoded
    expect((result as Record<string, unknown>)['slug']).toBe('-Users-test-projects-myapp');
  });

  it('extracts model from message.model', () => {
    const result = normalizeEvent(RAW_ASSISTANT_EVENT);
    expect(result?.model).toBe('claude-sonnet-4-6');
  });

  it('extracts isSidechain and gitBranch', () => {
    const result = normalizeEvent(RAW_ASSISTANT_EVENT);
    expect(result?.isSidechain).toBe(false);
    expect(result?.gitBranch).toBe('main');
  });

  it('passes through unknown top-level fields', () => {
    const raw = { uuid: 'u1', type: 'assistant', sessionId: 's1', customField: 'keep-me' };
    const result = normalizeEvent(raw) as Record<string, unknown>;
    expect(result?.['customField']).toBe('keep-me');
  });

  it('handles assistant event without usage data (tokens undefined)', () => {
    const raw = { uuid: 'u2', type: 'assistant', sessionId: 's1', message: { model: 'claude-3' } };
    const result = normalizeEvent(raw);
    expect(result?.tokens).toBeUndefined();
    expect(result?.model).toBe('claude-3');
  });

  it('handles cache_creation sub-object missing (defaults to 0)', () => {
    const raw = {
      uuid: 'u3', type: 'assistant', sessionId: 's1',
      message: { usage: { input_tokens: 100, output_tokens: 50,
        cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } },
    };
    const result = normalizeEvent(raw);
    expect(result?.tokens?.cacheCreation5m).toBe(0);
    expect(result?.tokens?.cacheCreation1h).toBe(0);
  });

  it('handles non-assistant event with uuid (e.g., user message)', () => {
    const raw = { uuid: 'u4', type: 'user', sessionId: 's1', timestamp: '2026-01-01T00:00:00Z' };
    const result = normalizeEvent(raw);
    expect(result).not.toBeNull();
    expect(result?.uuid).toBe('u4');
    expect(result?.tokens).toBeUndefined();
  });

  it('handles persisted-output tags inside JSON string values without special processing', () => {
    // <persisted-output> appears only inside string values — not at the line level
    // This test confirms the normalizer handles events containing these strings in their content
    const raw = {
      uuid: 'u5',
      type: 'user',
      sessionId: 's1',
      timestamp: '2026-01-01T00:00:00Z',
      message: {
        content: [{ type: 'tool_result', content: '<persisted-output>\nsome content\n</persisted-output>' }]
      },
    };
    const result = normalizeEvent(raw);
    // Should normalize successfully — no special tag handling needed
    expect(result).not.toBeNull();
    expect(result?.uuid).toBe('u5');
  });
});
