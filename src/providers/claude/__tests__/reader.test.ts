import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { discoverJSONLFiles, streamJSONLFile } from '../parser/reader.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'yclaude-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  process.env.CLAUDE_CONFIG_DIR = undefined;
});

describe('discoverJSONLFiles()', () => {
  it('finds .jsonl files using overrideDir exclusively', async () => {
    const projectsDir = join(tmpDir, 'projects', 'my-project', 'session-1');
    await mkdir(projectsDir, { recursive: true });
    await writeFile(join(projectsDir, 'events.jsonl'), '{"type":"assistant"}');

    const files = await discoverJSONLFiles(tmpDir);
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files.some((f) => f.endsWith('.jsonl'))).toBe(true);
  });

  it('uses CLAUDE_CONFIG_DIR exclusively when set', async () => {
    const projectsDir = join(tmpDir, 'projects', 'my-project', 'session-1');
    await mkdir(projectsDir, { recursive: true });
    await writeFile(join(projectsDir, 'events.jsonl'), '{"type":"assistant"}');

    process.env.CLAUDE_CONFIG_DIR = tmpDir;
    const files = await discoverJSONLFiles();
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files.some((f) => f.endsWith('.jsonl'))).toBe(true);
  });

  it('overrideDir takes precedence over CLAUDE_CONFIG_DIR', async () => {
    // Make CLAUDE_CONFIG_DIR point to an empty dir
    const emptyDir = join(tmpDir, 'empty');
    await mkdir(emptyDir, { recursive: true });
    process.env.CLAUDE_CONFIG_DIR = emptyDir;

    // Put a file in overrideDir
    const overrideDir = join(tmpDir, 'override');
    await mkdir(overrideDir, { recursive: true });
    await writeFile(join(overrideDir, 'events.jsonl'), '{"type":"assistant"}');

    const files = await discoverJSONLFiles(overrideDir);
    expect(files.some((f) => f.includes('override'))).toBe(true);
    expect(files.some((f) => f.includes('empty'))).toBe(false);
  });

  it('silently skips non-existent directories', async () => {
    const nonExistent = join(tmpDir, 'does-not-exist');
    // Should not throw
    const files = await discoverJSONLFiles(nonExistent);
    expect(Array.isArray(files)).toBe(true);
  });

  it('finds files at any depth (double-star glob)', async () => {
    const deepDir = join(tmpDir, 'projects', 'slug', 'session', 'subagents');
    await mkdir(deepDir, { recursive: true });
    await writeFile(join(deepDir, 'agent-1.jsonl'), '{"type":"assistant"}');

    const files = await discoverJSONLFiles(tmpDir);
    expect(files.some((f) => f.includes('subagents'))).toBe(true);
  });

  it('returns empty array when no .jsonl files found', async () => {
    // tmpDir exists but has no .jsonl files
    const files = await discoverJSONLFiles(tmpDir);
    expect(files).toEqual([]);
  });
});

describe('streamJSONLFile()', () => {
  it('yields parsed JSON objects for valid lines', async () => {
    const filePath = join(tmpDir, 'test.jsonl');
    await writeFile(
      filePath,
      ['{"type":"assistant","uuid":"abc-1"}', '{"type":"user","uuid":"abc-2"}'].join('\n'),
    );

    const results: unknown[] = [];
    for await (const obj of streamJSONLFile(filePath)) {
      results.push(obj);
    }
    expect(results.length).toBe(2);
    expect((results[0] as Record<string, unknown>).type).toBe('assistant');
    expect((results[1] as Record<string, unknown>).uuid).toBe('abc-2');
  });

  it('skips blank and whitespace-only lines silently', async () => {
    const filePath = join(tmpDir, 'blanks.jsonl');
    await writeFile(
      filePath,
      ['{"type":"assistant","uuid":"abc-1"}', '', '   ', '{"type":"user","uuid":"abc-2"}'].join(
        '\n',
      ),
    );

    const results: unknown[] = [];
    for await (const obj of streamJSONLFile(filePath)) {
      results.push(obj);
    }
    expect(results.length).toBe(2);
  });

  it('skips malformed JSON lines without throwing', async () => {
    const filePath = join(tmpDir, 'malformed.jsonl');
    await writeFile(
      filePath,
      [
        '{"type":"assistant","uuid":"abc-1"}',
        'NOT VALID JSON {{{',
        '{"type":"user","uuid":"abc-2"}',
      ].join('\n'),
    );

    const results: unknown[] = [];
    // Must not throw
    for await (const obj of streamJSONLFile(filePath)) {
      results.push(obj);
    }
    expect(results.length).toBe(2);
  });

  it('never throws — completes normally even on all-malformed file', async () => {
    const filePath = join(tmpDir, 'all-bad.jsonl');
    await writeFile(filePath, ['not json', 'also not json', '{{{}}}'].join('\n'));

    const results: unknown[] = [];
    for await (const obj of streamJSONLFile(filePath)) {
      results.push(obj);
    }
    expect(results.length).toBe(0);
  });
});
