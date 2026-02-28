import { describe, it, expect } from 'vitest';
import { normalizeEvent } from '../normalizer.js';

describe('normalizeEvent()', () => {
  it('returns null for events without uuid', () => {
    const result = normalizeEvent({ type: 'user', timestamp: '2024-01-01T00:00:00Z' });
    expect(result).toBeNull();
  });

  it('returns null for events with empty uuid', () => {
    const result = normalizeEvent({ uuid: '', type: 'user' });
    expect(result).toBeNull();
  });

  it('returns null when type is missing or not a string', () => {
    const result = normalizeEvent({ uuid: 'abc-1' });
    expect(result).toBeNull();
  });

  it('returns NormalizedEvent for valid event with uuid and type', () => {
    const result = normalizeEvent({
      uuid: 'abc-1',
      type: 'user',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
    });
    expect(result).not.toBeNull();
    expect(result?.uuid).toBe('abc-1');
    expect(result?.type).toBe('user');
    expect(result?.timestamp).toBe('2024-01-01T00:00:00Z');
    expect(result?.sessionId).toBe('session-123');
  });

  it('extracts all six token fields from assistant events', () => {
    const result = normalizeEvent({
      uuid: 'abc-1',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
      message: {
        model: 'claude-opus-4',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 200,
          cache_read_input_tokens: 30,
          cache_creation: {
            ephemeral_5m_input_tokens: 150,
            ephemeral_1h_input_tokens: 50,
          },
        },
      },
    });

    expect(result).not.toBeNull();
    expect(result?.tokens).toBeDefined();
    expect(result?.tokens?.input).toBe(100);
    expect(result?.tokens?.output).toBe(50);
    expect(result?.tokens?.cacheCreation).toBe(200);
    expect(result?.tokens?.cacheRead).toBe(30);
    expect(result?.tokens?.cacheCreation5m).toBe(150);
    expect(result?.tokens?.cacheCreation1h).toBe(50);
    expect(result?.model).toBe('claude-opus-4');
  });

  it('uses cwd field (not slug) for project path', () => {
    const result = normalizeEvent({
      uuid: 'abc-1',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
      cwd: '/home/user/my-project',
      slug: '-home-user-my-project',
    });

    expect(result?.cwd).toBe('/home/user/my-project');
  });

  it('extracts durationMs from turn_duration events', () => {
    const result = normalizeEvent({
      uuid: 'abc-1',
      type: 'system',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
      durationMs: 1234,
    });

    expect(result?.durationMs).toBe(1234);
  });

  it('preserves unknown top-level fields via passthrough', () => {
    const result = normalizeEvent({
      uuid: 'abc-1',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
      futureField: 'preserved',
    });

    expect((result as Record<string, unknown>)?.futureField).toBe('preserved');
  });

  it('sets token fields to 0 when usage is present but values are missing', () => {
    const result = normalizeEvent({
      uuid: 'abc-1',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
      message: {
        usage: {},
      },
    });

    expect(result?.tokens?.input).toBe(0);
    expect(result?.tokens?.output).toBe(0);
    expect(result?.tokens?.cacheCreation5m).toBe(0);
    expect(result?.tokens?.cacheCreation1h).toBe(0);
  });

  it('does not set tokens for non-assistant events', () => {
    const result = normalizeEvent({
      uuid: 'abc-1',
      type: 'user',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
    });

    expect(result?.tokens).toBeUndefined();
  });

  it('extracts isSidechain and agentId fields', () => {
    const result = normalizeEvent({
      uuid: 'abc-1',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
      isSidechain: true,
      agentId: 'agent-42',
    });

    expect(result?.isSidechain).toBe(true);
    expect(result?.agentId).toBe('agent-42');
  });

  it('passes through gitBranch field', () => {
    const result = normalizeEvent({
      uuid: 'abc-1',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
      gitBranch: 'main',
    });

    expect(result?.gitBranch).toBe('main');
  });

  it('handles persisted-output tags inside string values without special processing', () => {
    const result = normalizeEvent({
      uuid: 'abc-1',
      type: 'user',
      sessionId: 'session-123',
      timestamp: '2024-01-01T00:00:00Z',
      message: {
        content: [{ type: 'tool_result', content: '<persisted-output>\nsome content\n</persisted-output>' }],
      },
    });

    expect(result).not.toBeNull();
    expect(result?.uuid).toBe('abc-1');
  });
});
