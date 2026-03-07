import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadProviders } from '../../registry.js';
import { disableDebug } from '../../../shared/debug.js';

let tmpDir: string;
/** Projects subdirectory where Claude stores JSONL files */
let projectsDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'yclaude-index-test-'));
  projectsDir = join(tmpDir, 'projects', 'test-project', 'session-1');
  await mkdir(projectsDir, { recursive: true });
  // Set CLAUDE_CONFIG_DIR so detect() finds files in tmpDir/projects/**/*.jsonl
  process.env.CLAUDE_CONFIG_DIR = tmpDir;
  disableDebug();
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  process.env.CLAUDE_CONFIG_DIR = undefined;
  disableDebug();
});

describe('loadProviders() integration', () => {
  it('returns UnifiedEvent[] from a directory with JSONL files', async () => {
    await writeFile(
      join(projectsDir, 'events.jsonl'),
      [
        '{"uuid":"event-1","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1","message":{"model":"claude-sonnet-4-6","usage":{"input_tokens":100,"output_tokens":50}}}',
        '{"uuid":"event-2","type":"user","timestamp":"2024-01-01T00:00:01Z","sessionId":"s1"}',
      ].join('\n'),
    );

    const { events, providers } = await loadProviders({ dir: tmpDir });
    expect(events.length).toBe(2);
    expect(events[0]?.id).toBe('event-1');
    expect(events[0]?.provider).toBe('claude');
    expect(events[0]?.costSource).toBe('estimated');
    expect(typeof events[0]?.costUsd).toBe('number');
    // Providers array should include claude as loaded
    const claudeProvider = providers.find((p) => p.id === 'claude');
    expect(claudeProvider?.status).toBe('loaded');
    expect(claudeProvider?.eventCount).toBe(2);
  });

  it('skips events without uuid', async () => {
    await writeFile(
      join(projectsDir, 'events.jsonl'),
      [
        '{"type":"file-history-snapshot","timestamp":"2024-01-01T00:00:00Z"}',
        '{"uuid":"event-1","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1"}',
      ].join('\n'),
    );

    const { events } = await loadProviders({ dir: tmpDir });
    expect(events.length).toBe(1);
    expect(events[0]?.id).toBe('event-1');
  });

  it('deduplicates events with same uuid across files', async () => {
    const subDir = join(projectsDir, 'nested');
    await mkdir(subDir, { recursive: true });

    const line =
      '{"uuid":"dup-uuid","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1"}';
    await writeFile(join(projectsDir, 'file1.jsonl'), line);
    await writeFile(join(subDir, 'file2.jsonl'), line);

    const { events } = await loadProviders({ dir: tmpDir });
    expect(events.filter((e) => e.id === 'dup-uuid').length).toBe(1);
  });

  it('returns empty events array from empty directory', async () => {
    // tmpDir has the projects structure but no JSONL files in it yet (projectsDir created but no files)
    // Remove the projectsDir we created in beforeEach to make it truly empty
    await rm(join(tmpDir, 'projects'), { recursive: true, force: true });

    const { events } = await loadProviders({ dir: tmpDir });
    expect(events).toEqual([]);
  });

  it('enables debug when options.debug is true', async () => {
    await writeFile(
      join(projectsDir, 'events.jsonl'),
      '{"uuid":"dbg-1","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1"}',
    );

    const { isDebugEnabled } = await import('../../../shared/debug.js');
    await loadProviders({ dir: tmpDir, debug: true });
    expect(isDebugEnabled()).toBe(true);
  });

  it('skips malformed lines and continues parsing', async () => {
    await writeFile(
      join(projectsDir, 'mixed.jsonl'),
      [
        'this is not json',
        '{"uuid":"event-1","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1"}',
        '{broken',
      ].join('\n'),
    );

    const { events } = await loadProviders({ dir: tmpDir });
    expect(events.find((e) => e.id === 'event-1')).toBeDefined();
  });

  it('parses subagent files in nested directories', async () => {
    const subagentDir = join(projectsDir, 'subagents');
    await mkdir(subagentDir, { recursive: true });
    await writeFile(
      join(subagentDir, 'agent-abc.jsonl'),
      [
        '{"uuid":"sub-uuid-1","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1","isSidechain":true,"agentId":"agent-abc"}',
      ].join('\n'),
    );

    const { events } = await loadProviders({ dir: tmpDir });
    const found = events.find((e) => e.id === 'sub-uuid-1');
    expect(found).toBeDefined();
    expect(found?.isSidechain).toBe(true);
    expect(found?.agentId).toBe('agent-abc');
  });

  it('returns providers info for all known providers', async () => {
    const { providers } = await loadProviders({ dir: tmpDir });
    // Should have entries for all 3 known providers
    expect(providers.length).toBe(3);
    const ids = providers.map((p) => p.id);
    expect(ids).toContain('claude');
    expect(ids).toContain('cursor');
    expect(ids).toContain('opencode');
  });
});
