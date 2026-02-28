import { describe, it, expect, afterEach } from 'vitest';
import { parseAll } from './index.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ASSISTANT_EVENT = {
  uuid: 'integration-uuid-001',
  type: 'assistant',
  timestamp: '2026-01-15T10:30:00.000Z',
  sessionId: 'sess-integration',
  cwd: '/Users/test/projects/myapp',
  gitBranch: 'main',
  message: {
    model: 'claude-sonnet-4-6',
    usage: {
      input_tokens: 1000,
      output_tokens: 500,
      cache_creation_input_tokens: 200,
      cache_read_input_tokens: 100,
      cache_creation: {
        ephemeral_5m_input_tokens: 100,
        ephemeral_1h_input_tokens: 100,
      },
    },
  },
};

function createTestDir(files: Record<string, string[]>): string {
  const base = join(tmpdir(), `yclaude-integration-${Date.now()}`);
  for (const [relPath, lines] of Object.entries(files)) {
    const filePath = join(base, relPath);
    mkdirSync(filePath.split('/').slice(0, -1).join('/'), { recursive: true });
    writeFileSync(filePath, lines.join('\n'));
  }
  return base;
}

describe('parseAll() integration', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('returns empty array when no JSONL files found', async () => {
    const dir = join(tmpdir(), `yclaude-empty-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    tempDirs.push(dir);
    const events = await parseAll({ dir });
    expect(events).toEqual([]);
  });

  it('parses a JSONL file and returns NormalizedEvent[]', async () => {
    const dir = createTestDir({
      'projects/my-project/session.jsonl': [
        JSON.stringify(ASSISTANT_EVENT),
        JSON.stringify({ uuid: 'user-uuid-001', type: 'user', sessionId: 'sess-integration', timestamp: '2026-01-15T10:29:00.000Z' }),
      ],
    });
    tempDirs.push(dir);

    const events = await parseAll({ dir });
    expect(events.length).toBeGreaterThanOrEqual(1);

    const assistantEvent = events.find(e => e.uuid === 'integration-uuid-001');
    expect(assistantEvent).toBeDefined();
    expect(assistantEvent?.tokens?.input).toBe(1000);
    expect(assistantEvent?.tokens?.output).toBe(500);
    expect(assistantEvent?.model).toBe('claude-sonnet-4-6');
    expect(assistantEvent?.cwd).toBe('/Users/test/projects/myapp');
  });

  it('deduplicates events with the same UUID across files', async () => {
    const dir = createTestDir({
      'projects/proj-a/session1.jsonl': [JSON.stringify(ASSISTANT_EVENT)],
      'projects/proj-b/session2.jsonl': [JSON.stringify(ASSISTANT_EVENT)],  // same UUID
    });
    tempDirs.push(dir);

    const events = await parseAll({ dir });
    const matches = events.filter(e => e.uuid === 'integration-uuid-001');
    // UUID should appear exactly once despite being in two files
    expect(matches).toHaveLength(1);
  });

  it('skips malformed lines and continues parsing', async () => {
    const dir = createTestDir({
      'projects/proj/session.jsonl': [
        'this is not json',
        JSON.stringify(ASSISTANT_EVENT),
        '{broken',
      ],
    });
    tempDirs.push(dir);

    // Should not throw; should return the one valid event
    const events = await parseAll({ dir });
    expect(events.find(e => e.uuid === 'integration-uuid-001')).toBeDefined();
  });

  it('parses subagent files in nested directories', async () => {
    const subagentEvent = { ...ASSISTANT_EVENT, uuid: 'subagent-uuid-001', isSidechain: true, agentId: 'agent-abc' };
    const dir = createTestDir({
      'projects/proj/sess-123/subagents/agent-abc.jsonl': [JSON.stringify(subagentEvent)],
    });
    tempDirs.push(dir);

    const events = await parseAll({ dir });
    const found = events.find(e => e.uuid === 'subagent-uuid-001');
    expect(found).toBeDefined();
    expect(found?.isSidechain).toBe(true);
    expect(found?.agentId).toBe('agent-abc');
  });
});
