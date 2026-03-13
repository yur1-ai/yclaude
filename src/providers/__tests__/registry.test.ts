import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderAdapter, UnifiedEvent } from '../types.js';

// State holders for mock adapter instances (set per test before importing registry)
let mockClaudeInstance: ProviderAdapter;
let mockCursorInstance: ProviderAdapter;
let mockOpenCodeInstance: ProviderAdapter;

// Mock the adapter modules with class constructors that return the current mock instances
vi.mock('../claude/adapter.js', () => ({
  ClaudeAdapter: class {
    id = mockClaudeInstance.id;
    name = mockClaudeInstance.name;
    detect = mockClaudeInstance.detect;
    load = mockClaudeInstance.load;
  },
}));
vi.mock('../cursor/adapter.js', () => ({
  CursorAdapter: class {
    id = mockCursorInstance.id;
    name = mockCursorInstance.name;
    detect = mockCursorInstance.detect;
    load = mockCursorInstance.load;
  },
}));
vi.mock('../opencode/adapter.js', () => ({
  OpenCodeAdapter: class {
    id = mockOpenCodeInstance.id;
    name = mockOpenCodeInstance.name;
    detect = mockOpenCodeInstance.detect;
    load = mockOpenCodeInstance.load;
  },
}));

// Helper to create a mock adapter
function createMockAdapter(
  id: string,
  name: string,
  detectResult: boolean | Error = false,
  loadResult: UnifiedEvent[] | Error = [],
): ProviderAdapter {
  return {
    id: id as 'claude' | 'cursor' | 'opencode',
    name,
    detect: vi.fn(async () => {
      if (detectResult instanceof Error) throw detectResult;
      return detectResult;
    }),
    load: vi.fn(async () => {
      if (loadResult instanceof Error) throw loadResult;
      return loadResult;
    }),
  };
}

function makeEvent(id: string, provider: 'claude' | 'cursor' | 'opencode'): UnifiedEvent {
  return {
    id,
    provider,
    sessionId: 'session-1',
    timestamp: '2024-01-01T00:00:00Z',
    type: 'assistant',
    costUsd: 0.01,
    costSource: 'estimated',
  };
}

describe('loadProviders()', () => {
  beforeEach(() => {
    vi.resetModules();
    // Default: all adapters report not-found
    mockClaudeInstance = createMockAdapter('claude', 'Claude Code', false);
    mockCursorInstance = createMockAdapter('cursor', 'Cursor', false);
    mockOpenCodeInstance = createMockAdapter('opencode', 'OpenCode', false);
  });

  it('returns all providers with correct status when none detected', async () => {
    const { loadProviders } = await import('../registry.js');
    const { events, providers } = await loadProviders({});

    expect(events).toEqual([]);
    expect(providers).toHaveLength(3);
    for (const p of providers) {
      expect(p.status).toBe('not-found');
      expect(p.eventCount).toBe(0);
    }
  });

  it('filters out excluded providers but still reports them', async () => {
    mockClaudeInstance = createMockAdapter('claude', 'Claude Code', true, [
      makeEvent('e1', 'claude'),
    ]);
    mockCursorInstance = createMockAdapter('cursor', 'Cursor', true, [makeEvent('e2', 'cursor')]);

    const { loadProviders } = await import('../registry.js');
    const { events, providers } = await loadProviders({ exclude: ['cursor'] });

    // Cursor should be excluded (not detected, not loaded)
    expect(mockCursorInstance.detect).not.toHaveBeenCalled();
    expect(mockCursorInstance.load).not.toHaveBeenCalled();

    // Events should only include claude's events
    expect(events).toHaveLength(1);
    expect(events[0]?.provider).toBe('claude');

    // Providers should still include cursor in results (as not-found/excluded)
    const cursorInfo = providers.find((p) => p.id === 'cursor');
    expect(cursorInfo).toBeDefined();
    expect(cursorInfo?.status).toBe('not-found');
  });

  it('handles detection failure gracefully', async () => {
    mockClaudeInstance = createMockAdapter('claude', 'Claude Code', new Error('Permission denied'));

    // Suppress stderr output from the registry
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { loadProviders } = await import('../registry.js');
    const { events, providers } = await loadProviders({});

    stderrSpy.mockRestore();

    expect(events).toEqual([]);
    const claudeInfo = providers.find((p) => p.id === 'claude');
    expect(claudeInfo?.status).toBe('error');
    expect(claudeInfo?.error).toBe('Permission denied');
  });

  it('handles load failure gracefully', async () => {
    mockClaudeInstance = createMockAdapter(
      'claude',
      'Claude Code',
      true,
      new Error('Corrupt file'),
    );

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { loadProviders } = await import('../registry.js');
    const { events, providers } = await loadProviders({});

    stderrSpy.mockRestore();

    expect(events).toEqual([]);
    const claudeInfo = providers.find((p) => p.id === 'claude');
    expect(claudeInfo?.status).toBe('error');
    expect(claudeInfo?.error).toBe('Corrupt file');
  });

  it('runs detection in parallel for all adapters', async () => {
    const detectOrder: string[] = [];

    const makeDelayedDetect = (id: string) =>
      vi.fn(async () => {
        detectOrder.push(`${id}-start`);
        await new Promise((r) => setTimeout(r, 10));
        detectOrder.push(`${id}-end`);
        return false;
      });

    mockClaudeInstance = {
      ...createMockAdapter('claude', 'Claude Code', false),
      detect: makeDelayedDetect('claude'),
    };
    mockCursorInstance = {
      ...createMockAdapter('cursor', 'Cursor', false),
      detect: makeDelayedDetect('cursor'),
    };
    mockOpenCodeInstance = {
      ...createMockAdapter('opencode', 'OpenCode', false),
      detect: makeDelayedDetect('opencode'),
    };

    const { loadProviders } = await import('../registry.js');
    await loadProviders({});

    // All start calls should come before all end calls (parallel execution)
    const startIndices = detectOrder
      .map((v, i) => (v.endsWith('-start') ? i : -1))
      .filter((i) => i >= 0);
    const endIndices = detectOrder
      .map((v, i) => (v.endsWith('-end') ? i : -1))
      .filter((i) => i >= 0);

    // At least 2 starts should happen before the first end (proves parallelism)
    expect(startIndices.length).toBe(3);
    expect(endIndices.length).toBe(3);
    // biome-ignore lint/style/noNonNullAssertion: test-only
    expect(startIndices.filter((s) => s < endIndices[0]!).length).toBeGreaterThanOrEqual(2);
  });

  it('only loads detected providers', async () => {
    mockClaudeInstance = createMockAdapter('claude', 'Claude Code', true, [
      makeEvent('e1', 'claude'),
    ]);

    const { loadProviders } = await import('../registry.js');
    const { events } = await loadProviders({});

    // Only claude's load should be called (it's the only one detected)
    expect(mockClaudeInstance.load).toHaveBeenCalled();
    expect(mockCursorInstance.load).not.toHaveBeenCalled();
    expect(mockOpenCodeInstance.load).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);
  });
});
