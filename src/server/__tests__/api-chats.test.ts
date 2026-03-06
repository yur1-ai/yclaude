import { describe, expect, it } from 'vitest';
import type { CostEvent } from '../../cost/types.js';
import { toEstimatedCost } from '../../cost/types.js';
import type { NormalizedEvent } from '../../parser/types.js';
import { createApp } from '../server.js';
import type { AppState } from '../server.js';

// -------------------------
// Test helpers
// -------------------------

let _eventIdx = 0;

function makeRawEvent(
  overrides: Partial<NormalizedEvent> & { message?: Record<string, unknown> } = {},
): NormalizedEvent {
  const { message, ...rest } = overrides;
  const event: NormalizedEvent = {
    uuid: `raw-uuid-${_eventIdx++}`,
    type: 'assistant',
    timestamp: '2024-01-01T00:00:00Z',
    sessionId: 'session-1',
    ...rest,
  };
  if (message !== undefined) {
    (event as Record<string, unknown>).message = message;
  }
  return event;
}

function makeRawCostEvent(
  overrides: Partial<NormalizedEvent> & {
    costUsd?: number;
    message?: Record<string, unknown>;
  } = {},
): CostEvent {
  const { costUsd = 0.001, ...rest } = overrides;
  const base = makeRawEvent({
    tokens: {
      input: 100,
      output: 50,
      cacheCreation: 0,
      cacheRead: 0,
      cacheCreation5m: 0,
      cacheCreation1h: 0,
    },
    ...rest,
  });
  return { ...base, costUsd: toEstimatedCost(costUsd) };
}

function makeApp(overrides: Partial<AppState> = {}): ReturnType<typeof createApp> {
  const state: AppState = {
    events: [],
    costs: overrides.costs ?? [],
    showMessages: overrides.showMessages ?? false,
    ...(overrides.rawEvents ? { rawEvents: overrides.rawEvents } : {}),
  };
  return createApp(state);
}

// -------------------------
// GET /api/v1/config
// -------------------------

describe('GET /api/v1/config', () => {
  it('returns { showMessages: false } when showMessages is false', async () => {
    const app = makeApp({ showMessages: false });
    const res = await app.request('/api/v1/config');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ showMessages: false });
  });

  it('returns { showMessages: true } when showMessages is true', async () => {
    const app = makeApp({ showMessages: true });
    const res = await app.request('/api/v1/config');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ showMessages: true });
  });
});

// -------------------------
// GET /api/v1/chats — 403 gating
// -------------------------

describe('GET /api/v1/chats — 403 gating', () => {
  it('returns 403 when showMessages is false', async () => {
    const app = makeApp({ showMessages: false });
    const res = await app.request('/api/v1/chats');
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('disabled');
  });

  it('returns 403 when showMessages is undefined (default)', async () => {
    const state: AppState = { events: [], costs: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/chats');
    expect(res.status).toBe(403);
  });
});

// -------------------------
// GET /api/v1/chats — chat list
// -------------------------

describe('GET /api/v1/chats — chat list', () => {
  it('returns paginated chat list with correct shape when showMessages=true', async () => {
    const rawEvents: NormalizedEvent[] = [
      makeRawEvent({
        sessionId: 'sess-1',
        type: 'user',
        timestamp: '2024-01-01T00:00:00Z',
        cwd: '/home/user/project-a',
        message: { role: 'user', content: 'Hello, can you help me with this code?' },
      }),
      makeRawEvent({
        sessionId: 'sess-1',
        type: 'assistant',
        timestamp: '2024-01-01T00:01:00Z',
        cwd: '/home/user/project-a',
        model: 'claude-opus-4',
        tokens: {
          input: 100,
          output: 200,
          cacheCreation: 0,
          cacheRead: 0,
          cacheCreation5m: 0,
          cacheCreation1h: 0,
        },
        message: {
          model: 'claude-opus-4',
          content: [{ type: 'text', text: 'Sure, I can help!' }],
        },
      }),
    ];
    const costs: CostEvent[] = [
      makeRawCostEvent({
        sessionId: 'sess-1',
        timestamp: '2024-01-01T00:01:00Z',
        cwd: '/home/user/project-a',
        model: 'claude-opus-4',
        costUsd: 0.01,
      }),
    ];
    const app = makeApp({ showMessages: true, rawEvents, costs });
    const res = await app.request('/api/v1/chats');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      chats: Array<Record<string, unknown>>;
      total: number;
      page: number;
      pageSize: number;
    };
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(50);
    expect(body.chats).toHaveLength(1);

    // biome-ignore lint/style/noNonNullAssertion: test assertions
    const chat = body.chats[0]!;
    expect(chat.sessionId).toBe('sess-1');
    expect(chat).toHaveProperty('displayName');
    expect(chat).toHaveProperty('cwd');
    expect(chat).toHaveProperty('model');
    expect(chat).toHaveProperty('costUsd');
    expect(chat).toHaveProperty('timestamp');
    expect(chat).toHaveProperty('firstMessage');
    expect(chat).toHaveProperty('firstMessageFull');
    expect(chat).toHaveProperty('turnCount');
    expect(typeof chat.firstMessage).toBe('string');
    expect(typeof chat.firstMessageFull).toBe('string');
  });

  it('firstMessage is truncated at ~80 chars, firstMessageFull is untruncated', async () => {
    const longMessage =
      'This is a very long message that should be truncated at approximately eighty characters because it exceeds the limit for the preview.';
    const rawEvents: NormalizedEvent[] = [
      makeRawEvent({
        sessionId: 'sess-long',
        type: 'user',
        timestamp: '2024-01-01T00:00:00Z',
        message: { role: 'user', content: longMessage },
      }),
      makeRawEvent({
        sessionId: 'sess-long',
        type: 'assistant',
        timestamp: '2024-01-01T00:01:00Z',
        message: { content: [{ type: 'text', text: 'response' }] },
      }),
    ];
    const app = makeApp({ showMessages: true, rawEvents });
    const res = await app.request('/api/v1/chats');
    const body = (await res.json()) as { chats: Array<Record<string, unknown>> };
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    const chat = body.chats[0]!;
    // firstMessage should be truncated to ~80 chars + '...'
    expect((chat.firstMessage as string).length).toBeLessThanOrEqual(84);
    expect((chat.firstMessage as string).endsWith('...')).toBe(true);
    // firstMessageFull is the full text
    expect(chat.firstMessageFull).toBe(longMessage);
  });

  it('pagination returns 50 per page', async () => {
    // Create 55 sessions
    const rawEvents: NormalizedEvent[] = [];
    for (let i = 0; i < 55; i++) {
      rawEvents.push(
        makeRawEvent({
          sessionId: `sess-${String(i).padStart(3, '0')}`,
          type: 'user',
          timestamp: `2024-01-${String((i % 28) + 1).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z`,
          message: { role: 'user', content: `Message ${i}` },
        }),
        makeRawEvent({
          sessionId: `sess-${String(i).padStart(3, '0')}`,
          type: 'assistant',
          timestamp: `2024-01-${String((i % 28) + 1).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:01:00Z`,
          message: { content: [{ type: 'text', text: `Response ${i}` }] },
        }),
      );
    }
    const app = makeApp({ showMessages: true, rawEvents });
    const res1 = await app.request('/api/v1/chats?page=1');
    const body1 = (await res1.json()) as { chats: unknown[]; total: number; page: number };
    expect(body1.chats).toHaveLength(50);
    expect(body1.total).toBe(55);
    expect(body1.page).toBe(1);

    const res2 = await app.request('/api/v1/chats?page=2');
    const body2 = (await res2.json()) as { chats: unknown[]; total: number; page: number };
    expect(body2.chats).toHaveLength(5);
    expect(body2.total).toBe(55);
    expect(body2.page).toBe(2);
  });

  it('?search= filter matches text in user/assistant messages (case-insensitive)', async () => {
    const rawEvents: NormalizedEvent[] = [
      makeRawEvent({
        sessionId: 'sess-match',
        type: 'user',
        timestamp: '2024-01-01T00:00:00Z',
        message: { role: 'user', content: 'Help me with TypeScript generics' },
      }),
      makeRawEvent({
        sessionId: 'sess-match',
        type: 'assistant',
        timestamp: '2024-01-01T00:01:00Z',
        message: { content: [{ type: 'text', text: 'Sure, generics in TypeScript...' }] },
      }),
      makeRawEvent({
        sessionId: 'sess-nomatch',
        type: 'user',
        timestamp: '2024-01-02T00:00:00Z',
        message: { role: 'user', content: 'Help me with Python decorators' },
      }),
      makeRawEvent({
        sessionId: 'sess-nomatch',
        type: 'assistant',
        timestamp: '2024-01-02T00:01:00Z',
        message: { content: [{ type: 'text', text: 'Sure, decorators in Python...' }] },
      }),
    ];
    const app = makeApp({ showMessages: true, rawEvents });
    const res = await app.request('/api/v1/chats?search=typescript');
    const body = (await res.json()) as { chats: Array<Record<string, unknown>>; total: number };
    expect(body.total).toBe(1);
    expect(body.chats[0]?.sessionId).toBe('sess-match');
  });

  it('?search= returns empty results for non-matching query', async () => {
    const rawEvents: NormalizedEvent[] = [
      makeRawEvent({
        sessionId: 'sess-1',
        type: 'user',
        timestamp: '2024-01-01T00:00:00Z',
        message: { role: 'user', content: 'Hello world' },
      }),
      makeRawEvent({
        sessionId: 'sess-1',
        type: 'assistant',
        timestamp: '2024-01-01T00:01:00Z',
        message: { content: [{ type: 'text', text: 'Hi there!' }] },
      }),
    ];
    const app = makeApp({ showMessages: true, rawEvents });
    const res = await app.request('/api/v1/chats?search=xyznonexistent');
    const body = (await res.json()) as { chats: unknown[]; total: number };
    expect(body.total).toBe(0);
    expect(body.chats).toHaveLength(0);
  });
});

// -------------------------
// GET /api/v1/chats/:id — 403 gating
// -------------------------

describe('GET /api/v1/chats/:id — 403 gating', () => {
  it('returns 403 when showMessages is false', async () => {
    const app = makeApp({ showMessages: false });
    const res = await app.request('/api/v1/chats/some-session');
    expect(res.status).toBe(403);
  });
});

// -------------------------
// GET /api/v1/chats/:id — conversation thread
// -------------------------

describe('GET /api/v1/chats/:id — conversation thread', () => {
  it('returns 404 for unknown session', async () => {
    const rawEvents: NormalizedEvent[] = [
      makeRawEvent({
        sessionId: 'sess-exists',
        type: 'user',
        message: { role: 'user', content: 'hi' },
      }),
    ];
    const app = makeApp({ showMessages: true, rawEvents });
    const res = await app.request('/api/v1/chats/nonexistent-id');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('not found');
  });

  it('returns conversation thread with content blocks', async () => {
    const rawEvents: NormalizedEvent[] = [
      makeRawEvent({
        sessionId: 'sess-thread',
        type: 'user',
        timestamp: '2024-01-01T00:00:00Z',
        cwd: '/home/user/myproject',
        message: { role: 'user', content: 'Write a function' },
      }),
      makeRawEvent({
        sessionId: 'sess-thread',
        type: 'assistant',
        timestamp: '2024-01-01T00:01:00Z',
        cwd: '/home/user/myproject',
        model: 'claude-opus-4',
        tokens: {
          input: 100,
          output: 200,
          cacheCreation: 0,
          cacheRead: 0,
          cacheCreation5m: 0,
          cacheCreation1h: 0,
        },
        message: {
          model: 'claude-opus-4',
          content: [
            { type: 'text', text: 'Here is a function:' },
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'Write',
              input: { file: 'src/app.ts', content: 'export function foo() {}' },
            },
          ],
        },
      }),
    ];
    const app = makeApp({ showMessages: true, rawEvents });
    const res = await app.request('/api/v1/chats/sess-thread');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      summary: Record<string, unknown>;
      messages: Array<{
        role: string;
        content: Array<Record<string, unknown>>;
        timestamp: string;
        model?: string;
        tokens?: Record<string, unknown>;
      }>;
    };

    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('messages');
    expect(body.summary.sessionId).toBe('sess-thread');
    expect(body.messages).toHaveLength(2);

    // User message
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    const userMsg = body.messages[0]!;
    expect(userMsg.role).toBe('user');
    expect(userMsg.content).toHaveLength(1);
    expect(userMsg.content[0]?.type).toBe('text');

    // Assistant message
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    const assistantMsg = body.messages[1]!;
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.content).toHaveLength(2);
    expect(assistantMsg.content[0]?.type).toBe('text');
    expect(assistantMsg.content[1]?.type).toBe('tool_use');
  });

  it('excludes thinking blocks from output', async () => {
    const rawEvents: NormalizedEvent[] = [
      makeRawEvent({
        sessionId: 'sess-think',
        type: 'assistant',
        timestamp: '2024-01-01T00:00:00Z',
        message: {
          content: [
            { type: 'thinking', thinking: 'let me think about this...' },
            { type: 'text', text: 'Here is my answer' },
          ],
        },
      }),
    ];
    const app = makeApp({ showMessages: true, rawEvents });
    const res = await app.request('/api/v1/chats/sess-think');
    const body = (await res.json()) as {
      messages: Array<{ content: Array<Record<string, unknown>> }>;
    };
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    const msg = body.messages[0]!;
    // Only the text block should remain, thinking block excluded
    expect(msg.content).toHaveLength(1);
    expect(msg.content[0]?.type).toBe('text');
  });

  it('truncates tool_result content at 10000 chars', async () => {
    const longResult = 'x'.repeat(15000);
    const rawEvents: NormalizedEvent[] = [
      makeRawEvent({
        sessionId: 'sess-trunc',
        type: 'user',
        timestamp: '2024-01-01T00:00:00Z',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-1',
              content: longResult,
            },
          ],
        },
      }),
    ];
    const app = makeApp({ showMessages: true, rawEvents });
    const res = await app.request('/api/v1/chats/sess-trunc');
    const body = (await res.json()) as {
      messages: Array<{ content: Array<Record<string, unknown>> }>;
    };
    // biome-ignore lint/style/noNonNullAssertion: test assertions
    const block = body.messages[0]!.content[0]!;
    expect(block.type).toBe('tool_result');
    expect((block.resultContent as string).length).toBeLessThanOrEqual(10000);
  });

  it('existing /api/v1/sessions/:id remains metadata-only even when showMessages=true', async () => {
    const rawEvents: NormalizedEvent[] = [
      makeRawEvent({
        sessionId: 'sess-privacy',
        type: 'user',
        timestamp: '2024-01-01T00:00:00Z',
        message: { role: 'user', content: 'secret message' },
      }),
      makeRawEvent({
        sessionId: 'sess-privacy',
        type: 'assistant',
        timestamp: '2024-01-01T00:01:00Z',
        model: 'claude-opus',
        tokens: {
          input: 100,
          output: 50,
          cacheCreation: 0,
          cacheRead: 0,
          cacheCreation5m: 0,
          cacheCreation1h: 0,
        },
        message: {
          model: 'claude-opus',
          content: [{ type: 'text', text: 'secret response' }],
        },
      }),
    ];
    const costs: CostEvent[] = [
      makeRawCostEvent({
        sessionId: 'sess-privacy',
        timestamp: '2024-01-01T00:01:00Z',
        model: 'claude-opus',
        costUsd: 0.01,
      }),
    ];
    const app = makeApp({ showMessages: true, rawEvents, costs });
    const res = await app.request('/api/v1/sessions/sess-privacy');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      summary: Record<string, unknown>;
      turns: Array<Record<string, unknown>>;
    };
    // Session detail should NOT contain message content
    expect(body.summary).not.toHaveProperty('message');
    expect(body.summary).not.toHaveProperty('content');
    for (const turn of body.turns) {
      expect(turn).not.toHaveProperty('message');
      expect(turn).not.toHaveProperty('content');
    }
  });
});
