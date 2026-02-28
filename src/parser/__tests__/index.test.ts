import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { disableDebug } from '../../shared/debug.js';
import { parseAll } from '../../../src/index.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'yclaude-index-test-'));
  disableDebug();
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  delete process.env['CLAUDE_CONFIG_DIR'];
  disableDebug();
});

describe('parseAll()', () => {
  it('returns NormalizedEvent[] from a directory', async () => {
    await writeFile(join(tmpDir, 'events.jsonl'), [
      '{"uuid":"event-1","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1"}',
      '{"uuid":"event-2","type":"user","timestamp":"2024-01-01T00:00:01Z","sessionId":"s1"}',
    ].join('\n'));

    const events = await parseAll({ dir: tmpDir });
    expect(events.length).toBe(2);
    expect(events[0]?.uuid).toBe('event-1');
    expect(events[1]?.uuid).toBe('event-2');
  });

  it('skips events without uuid', async () => {
    await writeFile(join(tmpDir, 'events.jsonl'), [
      '{"type":"file-history-snapshot","timestamp":"2024-01-01T00:00:00Z"}',
      '{"uuid":"event-1","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1"}',
    ].join('\n'));

    const events = await parseAll({ dir: tmpDir });
    expect(events.length).toBe(1);
    expect(events[0]?.uuid).toBe('event-1');
  });

  it('deduplicates events with same uuid across files', async () => {
    const subDir = join(tmpDir, 'sub');
    await mkdir(subDir, { recursive: true });

    const line = '{"uuid":"dup-uuid","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1"}';
    await writeFile(join(tmpDir, 'file1.jsonl'), line);
    await writeFile(join(subDir, 'file2.jsonl'), line);

    const events = await parseAll({ dir: tmpDir });
    expect(events.filter((e) => e.uuid === 'dup-uuid').length).toBe(1);
  });

  it('returns empty array from empty directory', async () => {
    const events = await parseAll({ dir: tmpDir });
    expect(events).toEqual([]);
  });

  it('enables debug when options.debug is true', async () => {
    const { isDebugEnabled } = await import('../../shared/debug.js');
    await parseAll({ dir: tmpDir, debug: true });
    expect(isDebugEnabled()).toBe(true);
  });

  it('skips malformed lines and continues parsing', async () => {
    await writeFile(join(tmpDir, 'mixed.jsonl'), [
      'this is not json',
      '{"uuid":"event-1","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1"}',
      '{broken',
    ].join('\n'));

    const events = await parseAll({ dir: tmpDir });
    expect(events.find((e) => e.uuid === 'event-1')).toBeDefined();
  });

  it('parses subagent files in nested directories', async () => {
    const subagentDir = join(tmpDir, 'session-123', 'subagents');
    await mkdir(subagentDir, { recursive: true });
    await writeFile(join(subagentDir, 'agent-abc.jsonl'), [
      '{"uuid":"sub-uuid-1","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1","isSidechain":true,"agentId":"agent-abc"}',
    ].join('\n'));

    const events = await parseAll({ dir: tmpDir });
    const found = events.find((e) => e.uuid === 'sub-uuid-1');
    expect(found).toBeDefined();
    expect(found?.isSidechain).toBe(true);
    expect(found?.agentId).toBe('agent-abc');
  });
});
