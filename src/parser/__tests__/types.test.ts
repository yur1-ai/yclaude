import { describe, it, expect } from 'vitest';
import { NormalizedEventSchema } from '../types.js';
import { RawEventSchema, RawAssistantUsageSchema } from '../schema.js';

describe('NormalizedEventSchema', () => {
  it('requires uuid, type, timestamp, and sessionId fields', () => {
    const result = NormalizedEventSchema.safeParse({
      uuid: 'test-uuid',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
    });
    expect(result.success).toBe(true);
  });

  it('fails when required fields are missing', () => {
    const result = NormalizedEventSchema.safeParse({
      uuid: 'test-uuid',
      // missing type, timestamp, sessionId
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional tokens object with all six token fields', () => {
    const result = NormalizedEventSchema.safeParse({
      uuid: 'test-uuid',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
      tokens: {
        input: 100,
        output: 50,
        cacheCreation: 200,
        cacheRead: 30,
        cacheCreation5m: 150,
        cacheCreation1h: 50,
      },
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.tokens) {
      expect(result.data.tokens.input).toBe(100);
      expect(result.data.tokens.output).toBe(50);
      expect(result.data.tokens.cacheCreation).toBe(200);
      expect(result.data.tokens.cacheRead).toBe(30);
      expect(result.data.tokens.cacheCreation5m).toBe(150);
      expect(result.data.tokens.cacheCreation1h).toBe(50);
    }
  });

  it('allows tokens to be absent (optional)', () => {
    const result = NormalizedEventSchema.safeParse({
      uuid: 'test-uuid',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tokens).toBeUndefined();
    }
  });

  it('accepts optional fields: model, requestId, isSidechain, agentId, gitBranch, cwd', () => {
    const result = NormalizedEventSchema.safeParse({
      uuid: 'test-uuid',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
      model: 'claude-opus-4',
      requestId: 'req-456',
      isSidechain: true,
      agentId: 'agent-789',
      gitBranch: 'main',
      cwd: '/home/user/project',
    });
    expect(result.success).toBe(true);
  });

  it('preserves unknown fields via passthrough', () => {
    const result = NormalizedEventSchema.safeParse({
      uuid: 'test-uuid',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
      unknownFutureField: 'preserved',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).unknownFutureField).toBe('preserved');
    }
  });
});

describe('RawAssistantUsageSchema', () => {
  it('accepts empty object (all fields have defaults or are optional)', () => {
    const result = RawAssistantUsageSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.input_tokens).toBe(0);
      expect(result.data.output_tokens).toBe(0);
      expect(result.data.cache_creation_input_tokens).toBe(0);
      expect(result.data.cache_read_input_tokens).toBe(0);
    }
  });

  it('accepts full usage object', () => {
    const result = RawAssistantUsageSchema.safeParse({
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 200,
      cache_read_input_tokens: 30,
    });
    expect(result.success).toBe(true);
  });

  it('preserves unknown fields via passthrough', () => {
    const result = RawAssistantUsageSchema.safeParse({
      input_tokens: 10,
      future_field: 'value',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).future_field).toBe('value');
    }
  });
});

describe('RawEventSchema', () => {
  it('requires only type field', () => {
    const result = RawEventSchema.safeParse({ type: 'assistant' });
    expect(result.success).toBe(true);
  });

  it('fails when type is missing', () => {
    const result = RawEventSchema.safeParse({ uuid: 'some-uuid' });
    expect(result.success).toBe(false);
  });

  it('accepts full event with nested message and usage', () => {
    const result = RawEventSchema.safeParse({
      uuid: 'test-uuid',
      type: 'assistant',
      timestamp: '2024-01-01T00:00:00Z',
      sessionId: 'session-123',
      message: {
        model: 'claude-opus-4',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('preserves unknown fields via passthrough', () => {
    const result = RawEventSchema.safeParse({
      type: 'assistant',
      unknownTopLevel: 'value',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).unknownTopLevel).toBe('value');
    }
  });
});
