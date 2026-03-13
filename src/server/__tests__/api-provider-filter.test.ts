import { describe, expect, it } from 'vitest';
import type { UnifiedEvent } from '../../providers/types.js';
import { createApp } from '../server.js';
import type { AppState } from '../server.js';

// biome-ignore lint/suspicious/noExplicitAny: Test helper type for JSON responses
type JsonBody = Record<string, any>;

/**
 * Test helper: creates a UnifiedEvent with sensible defaults.
 * Overrides allow provider, sessionId, sessionType, etc. to be customized.
 */
function makeEvent(costUsd: number, overrides?: Partial<UnifiedEvent>): UnifiedEvent {
  return {
    id: `test-${Math.random().toString(36).slice(2, 10)}`,
    provider: 'claude',
    sessionId: 'session-1',
    timestamp: '2024-01-15T12:00:00Z',
    type: 'assistant',
    costUsd,
    costSource: 'estimated',
    tokens: {
      input: overrides?.tokens?.input ?? 100,
      output: overrides?.tokens?.output ?? 50,
      cacheCreation: overrides?.tokens?.cacheCreation ?? 0,
      cacheRead: overrides?.tokens?.cacheRead ?? 0,
      cacheCreation5m: overrides?.tokens?.cacheCreation5m ?? 0,
      cacheCreation1h: overrides?.tokens?.cacheCreation1h ?? 0,
    },
    ...overrides,
  };
}

// Shared multi-provider event set used across tests
function makeMultiProviderEvents(): UnifiedEvent[] {
  return [
    // Claude events - 2 sessions
    makeEvent(0.01, {
      provider: 'claude',
      sessionId: 'claude-s1',
      timestamp: '2024-01-15T10:00:00Z',
      model: 'claude-sonnet-4-20250514',
      cwd: '/projects/a',
    }),
    makeEvent(0.02, {
      provider: 'claude',
      sessionId: 'claude-s1',
      timestamp: '2024-01-15T10:05:00Z',
      model: 'claude-sonnet-4-20250514',
      cwd: '/projects/a',
    }),
    makeEvent(0.05, {
      provider: 'claude',
      sessionId: 'claude-s2',
      timestamp: '2024-01-15T11:00:00Z',
      model: 'claude-opus-4-20250514',
      cwd: '/projects/b',
    }),

    // Cursor events - 2 sessions, with sessionType
    makeEvent(0.03, {
      provider: 'cursor',
      sessionId: 'cursor-s1',
      timestamp: '2024-01-15T10:30:00Z',
      model: 'gpt-4o',
      cwd: '/projects/a',
      sessionType: 'composer',
    }),
    makeEvent(0.04, {
      provider: 'cursor',
      sessionId: 'cursor-s1',
      timestamp: '2024-01-15T10:35:00Z',
      model: 'gpt-4o',
      cwd: '/projects/a',
      sessionType: 'composer',
    }),
    makeEvent(0.02, {
      provider: 'cursor',
      sessionId: 'cursor-s2',
      timestamp: '2024-01-15T12:00:00Z',
      model: 'gpt-4o-mini',
      cwd: '/projects/c',
      sessionType: 'edit',
    }),
  ];
}

function makeState(events: UnifiedEvent[], opts?: Partial<AppState>): AppState {
  return {
    events,
    providers: [
      { id: 'claude', name: 'Claude Code', status: 'loaded', eventCount: 3 },
      { id: 'cursor', name: 'Cursor', status: 'loaded', eventCount: 3 },
    ],
    ...opts,
  };
}

// --- /api/v1/summary ---

describe('/api/v1/summary - provider filtering', () => {
  it('returns all-provider totals when no ?provider= param (backward compatible)', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/summary');
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    // All 6 events
    expect(body.eventCount).toBe(6);
    // Total cost = 0.01 + 0.02 + 0.05 + 0.03 + 0.04 + 0.02 = 0.17
    expect(body.totalCost).toBeCloseTo(0.17, 6);
  });

  it('returns only claude events when ?provider=claude', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/summary?provider=claude');
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    expect(body.eventCount).toBe(3);
    expect(body.totalCost).toBeCloseTo(0.08, 6);
  });

  it('returns only cursor events when ?provider=cursor', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/summary?provider=cursor');
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    expect(body.eventCount).toBe(3);
    expect(body.totalCost).toBeCloseTo(0.09, 6);
  });

  it('includes providerBreakdown when no ?provider= filter', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/summary');
    const body = (await res.json()) as JsonBody;
    expect(body.providerBreakdown).toBeDefined();
    expect(body.providerBreakdown.claude).toBeDefined();
    expect(body.providerBreakdown.cursor).toBeDefined();
    expect(body.providerBreakdown.claude.cost).toBeCloseTo(0.08, 6);
    expect(body.providerBreakdown.claude.sessions).toBe(2);
    expect(body.providerBreakdown.cursor.cost).toBeCloseTo(0.09, 6);
    expect(body.providerBreakdown.cursor.sessions).toBe(2);
  });

  it('does NOT include providerBreakdown when ?provider=claude', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/summary?provider=claude');
    const body = (await res.json()) as JsonBody;
    expect(body.providerBreakdown).toBeUndefined();
  });
});

// --- /api/v1/config ---

describe('/api/v1/config - providers list', () => {
  it('returns providers array with loaded provider info', async () => {
    const state = makeState(makeMultiProviderEvents());
    const app = createApp(state);
    const res = await app.request('/api/v1/config');
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    expect(body.providers).toBeDefined();
    expect(Array.isArray(body.providers)).toBe(true);
    expect(body.providers).toHaveLength(2);
    expect(body.providers[0]).toEqual({ id: 'claude', name: 'Claude Code', eventCount: 3 });
    expect(body.providers[1]).toEqual({ id: 'cursor', name: 'Cursor', eventCount: 3 });
  });

  it('excludes providers with non-loaded status', async () => {
    const state: AppState = {
      events: [],
      providers: [
        { id: 'claude', name: 'Claude Code', status: 'loaded', eventCount: 3 },
        { id: 'cursor', name: 'Cursor', status: 'not-found', eventCount: 0 },
        { id: 'opencode', name: 'OpenCode', status: 'error', eventCount: 0, error: 'DB locked' },
      ],
    };
    const app = createApp(state);
    const res = await app.request('/api/v1/config');
    const body = (await res.json()) as JsonBody;
    expect(body.providers).toHaveLength(1);
    expect(body.providers[0].id).toBe('claude');
  });
});

// --- /api/v1/sessions ---

describe('/api/v1/sessions - provider filtering', () => {
  it('returns only cursor sessions when ?provider=cursor', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/sessions?provider=cursor');
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    // Only cursor sessions
    for (const s of body.sessions) {
      expect(s.provider).toBe('cursor');
    }
    expect(body.total).toBe(2);
  });

  it('returns provider field on each session row', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/sessions');
    const body = (await res.json()) as JsonBody;
    for (const s of body.sessions) {
      expect(s.provider).toBeDefined();
      expect(['claude', 'cursor']).toContain(s.provider);
    }
  });

  it('returns costSource field on each session row', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/sessions');
    const body = (await res.json()) as JsonBody;
    for (const s of body.sessions) {
      expect(s.costSource).toBeDefined();
      expect(['estimated', 'reported', 'pre-calculated']).toContain(s.costSource);
    }
  });
});

describe('/api/v1/sessions - sessionType filtering', () => {
  it('returns only composer sessions (+ Claude sessions without sessionType) when ?sessionType=composer', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/sessions?sessionType=composer');
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    // Claude sessions have no sessionType, so they pass through
    // cursor-s1 has sessionType=composer, passes through
    // cursor-s2 has sessionType=edit, filtered OUT
    const sessionIds = body.sessions.map((s: JsonBody) => s.sessionId);
    expect(sessionIds).toContain('claude-s1');
    expect(sessionIds).toContain('claude-s2');
    expect(sessionIds).toContain('cursor-s1');
    expect(sessionIds).not.toContain('cursor-s2');
  });
});

// --- /api/v1/chats ---

describe('/api/v1/chats - provider filtering', () => {
  function makeChatEvents(): UnifiedEvent[] {
    return [
      makeEvent(0.01, {
        provider: 'claude',
        sessionId: 'chat-claude-1',
        timestamp: '2024-01-15T10:00:00Z',
        type: 'user',
        message: { role: 'user', content: 'Hello Claude' },
      }),
      makeEvent(0.02, {
        provider: 'claude',
        sessionId: 'chat-claude-1',
        timestamp: '2024-01-15T10:01:00Z',
        type: 'assistant',
        model: 'claude-sonnet-4-20250514',
        message: { role: 'assistant', content: 'Hello!' },
      }),
      makeEvent(0.03, {
        provider: 'cursor',
        sessionId: 'chat-cursor-1',
        timestamp: '2024-01-15T11:00:00Z',
        type: 'user',
        message: { role: 'user', content: 'Hello Cursor' },
      }),
      makeEvent(0.04, {
        provider: 'cursor',
        sessionId: 'chat-cursor-1',
        timestamp: '2024-01-15T11:01:00Z',
        type: 'assistant',
        model: 'gpt-4o',
        message: { role: 'assistant', content: 'Hi there!' },
      }),
    ];
  }

  it('returns provider field on each chat row', async () => {
    const events = makeChatEvents();
    const app = createApp(makeState(events, { showMessages: true }));
    const res = await app.request('/api/v1/chats');
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    expect(body.chats.length).toBe(2);
    const providers = body.chats.map((c: JsonBody) => c.provider);
    expect(providers).toContain('claude');
    expect(providers).toContain('cursor');
  });

  it('returns costSource field on each chat row', async () => {
    const events = makeChatEvents();
    const app = createApp(makeState(events, { showMessages: true }));
    const res = await app.request('/api/v1/chats');
    const body = (await res.json()) as JsonBody;
    for (const chat of body.chats) {
      expect(chat.costSource).toBeDefined();
    }
  });
});

// --- /api/v1/cost-over-time ---

describe('/api/v1/cost-over-time - provider filtering', () => {
  it('returns per-provider breakdown columns when no ?provider= filter', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/cost-over-time');
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    // All events are on 2024-01-15, so there should be one day entry
    expect(body.data.length).toBe(1);
    const day = body.data[0];
    expect(day.date).toBe('2024-01-15');
    // Total cost for the day
    expect(day.cost).toBeCloseTo(0.17, 6);
    // Per-provider columns present
    expect(day.claude).toBeCloseTo(0.08, 6);
    expect(day.cursor).toBeCloseTo(0.09, 6);
  });

  it('returns standard { date, cost } shape only when ?provider=claude', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/cost-over-time?provider=claude');
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    expect(body.data.length).toBe(1);
    const day = body.data[0];
    expect(day.cost).toBeCloseTo(0.08, 6);
    // No per-provider columns when provider is specified
    expect(day.claude).toBeUndefined();
    expect(day.cursor).toBeUndefined();
  });
});

// --- /api/v1/activity ---

describe('/api/v1/activity - provider filtering', () => {
  it('returns per-provider session counts when no ?provider= filter', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/activity?year=2024');
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    // Find January 15 entry
    const jan15 = body.data.find((d: JsonBody) => d.date === '2024-01-15');
    expect(jan15).toBeDefined();
    expect(jan15.providers).toBeDefined();
    expect(jan15.providers.claude).toBe(2); // 2 claude sessions
    expect(jan15.providers.cursor).toBe(2); // 2 cursor sessions
  });

  it('omits providers field when ?provider= is passed', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/activity?year=2024&provider=claude');
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    const jan15 = body.data.find((d: JsonBody) => d.date === '2024-01-15');
    expect(jan15).toBeDefined();
    expect(jan15.providers).toBeUndefined();
    // Only claude sessions counted
    expect(jan15.count).toBe(2);
  });
});

// --- /api/v1/models ---

describe('/api/v1/models - provider filtering', () => {
  it('returns provider field on each model row', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/models');
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    for (const row of body.rows) {
      expect(row.provider).toBeDefined();
    }
    // claude-sonnet-4 has 2 events, all from claude
    const sonnet = body.rows.find((r: JsonBody) => r.model === 'claude-sonnet-4-20250514');
    expect(sonnet?.provider).toBe('claude');
    // gpt-4o has 2 events, all from cursor
    const gpt4o = body.rows.find((r: JsonBody) => r.model === 'gpt-4o');
    expect(gpt4o?.provider).toBe('cursor');
  });

  it('returns only claude model rows when ?provider=claude', async () => {
    const events = makeMultiProviderEvents();
    const app = createApp(makeState(events));
    const res = await app.request('/api/v1/models?provider=claude');
    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    for (const row of body.rows) {
      expect(row.provider).toBe('claude');
    }
    // Should only have claude models
    const modelNames = body.rows.map((r: JsonBody) => r.model);
    expect(modelNames).toContain('claude-sonnet-4-20250514');
    expect(modelNames).toContain('claude-opus-4-20250514');
    expect(modelNames).not.toContain('gpt-4o');
    expect(modelNames).not.toContain('gpt-4o-mini');
  });
});
