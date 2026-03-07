import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClaudeAdapter } from '../adapter.js';
import { disableDebug } from '../../../shared/debug.js';

let tmpDir: string;
let adapter: ClaudeAdapter;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'yclaude-adapter-test-'));
  adapter = new ClaudeAdapter();
  disableDebug();
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  process.env.CLAUDE_CONFIG_DIR = undefined;
  disableDebug();
});

describe('ClaudeAdapter', () => {
  it('id is "claude"', () => {
    expect(adapter.id).toBe('claude');
  });

  it('name is "Claude Code"', () => {
    expect(adapter.name).toBe('Claude Code');
  });

  it('detect() returns false when no JSONL files exist', async () => {
    process.env.CLAUDE_CONFIG_DIR = tmpDir;
    const found = await adapter.detect();
    expect(found).toBe(false);
  });

  it('load() returns UnifiedEvent[] with correct fields', async () => {
    await writeFile(
      join(tmpDir, 'events.jsonl'),
      [
        '{"uuid":"test-uuid-1","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1","message":{"model":"claude-sonnet-4-6","usage":{"input_tokens":100,"output_tokens":50}}}',
      ].join('\n'),
    );

    const events = await adapter.load({ dir: tmpDir });
    expect(events.length).toBeGreaterThanOrEqual(1);
    const event = events[0];
    expect(event).toBeDefined();
    expect(event?.id).toBe('test-uuid-1');
    expect(event?.provider).toBe('claude');
    expect(typeof event?.costUsd).toBe('number');
    expect(event?.costSource).toBe('estimated');
    expect(event?.sessionId).toBe('s1');
    expect(event?.timestamp).toBe('2024-01-01T00:00:00Z');
    expect(event?.type).toBe('assistant');
  });

  it('load() respects preserveContent option', async () => {
    await writeFile(
      join(tmpDir, 'events.jsonl'),
      '{"uuid":"test-uuid-2","type":"user","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1","message":{"role":"user","content":"Hello world"}}',
    );

    // Without preserveContent: message should be absent
    const withoutContent = await adapter.load({ dir: tmpDir });
    const e1 = withoutContent.find((e) => e.id === 'test-uuid-2');
    expect(e1).toBeDefined();
    expect(e1?.message).toBeUndefined();

    // With preserveContent: message should be present
    const withContent = await adapter.load({ dir: tmpDir, preserveContent: true });
    const e2 = withContent.find((e) => e.id === 'test-uuid-2');
    expect(e2).toBeDefined();
    expect(e2?.message).toBeDefined();
    expect(e2?.message?.content).toBe('Hello world');
  });

  it('load() maps uuid to id', async () => {
    await writeFile(
      join(tmpDir, 'events.jsonl'),
      '{"uuid":"my-unique-id","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1"}',
    );

    const events = await adapter.load({ dir: tmpDir });
    const event = events.find((e) => e.id === 'my-unique-id');
    expect(event).toBeDefined();
    // The original uuid is mapped to the UnifiedEvent 'id' field
    expect(event?.id).toBe('my-unique-id');
  });

  it('load() returns empty array for directory with no JSONL files', async () => {
    const events = await adapter.load({ dir: tmpDir });
    expect(events).toEqual([]);
  });

  it('load() handles events with full token data', async () => {
    await writeFile(
      join(tmpDir, 'events.jsonl'),
      '{"uuid":"token-event","type":"assistant","timestamp":"2024-01-01T00:00:00Z","sessionId":"s1","message":{"model":"claude-sonnet-4-6","usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":200,"cache_read_input_tokens":30,"cache_creation":{"ephemeral_5m_input_tokens":150,"ephemeral_1h_input_tokens":50}}}}',
    );

    const events = await adapter.load({ dir: tmpDir });
    const event = events.find((e) => e.id === 'token-event');
    expect(event).toBeDefined();
    expect(event?.model).toBe('claude-sonnet-4-6');
    expect(event?.tokens).toBeDefined();
    expect(event?.tokens?.input).toBe(1000);
    expect(event?.tokens?.output).toBe(500);
    expect(event?.costUsd).toBeGreaterThan(0);
  });
});
