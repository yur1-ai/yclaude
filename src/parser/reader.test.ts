import { describe, it, expect, afterEach } from 'vitest';
import { streamJSONLFile } from '../parser/reader.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Create temp files for tests
function createTempJsonl(lines: string[]): string {
  const dir = join(tmpdir(), `yclaude-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, 'test.jsonl');
  writeFileSync(filePath, lines.join('\n'));
  return filePath;
}

describe('streamJSONLFile()', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('yields parsed objects for valid JSON lines', async () => {
    const file = createTempJsonl([
      JSON.stringify({ uuid: 'u1', type: 'assistant' }),
      JSON.stringify({ uuid: 'u2', type: 'user' }),
    ]);
    tempDirs.push(file.split('/').slice(0, -1).join('/'));

    const results: unknown[] = [];
    for await (const obj of streamJSONLFile(file)) {
      results.push(obj);
    }
    expect(results).toHaveLength(2);
    expect((results[0] as Record<string, unknown>)['uuid']).toBe('u1');
  });

  it('skips blank lines without error', async () => {
    const file = createTempJsonl([
      JSON.stringify({ uuid: 'u1', type: 'assistant' }),
      '',
      '   ',
      JSON.stringify({ uuid: 'u2', type: 'user' }),
    ]);
    tempDirs.push(file.split('/').slice(0, -1).join('/'));

    const results: unknown[] = [];
    for await (const obj of streamJSONLFile(file)) {
      results.push(obj);
    }
    expect(results).toHaveLength(2);
  });

  it('skips malformed JSON lines without crashing', async () => {
    const file = createTempJsonl([
      JSON.stringify({ uuid: 'u1', type: 'good' }),
      'this is not json {{{',
      JSON.stringify({ uuid: 'u2', type: 'also-good' }),
    ]);
    tempDirs.push(file.split('/').slice(0, -1).join('/'));

    const results: unknown[] = [];
    for await (const obj of streamJSONLFile(file)) {
      results.push(obj);
    }
    // Both valid lines should be yielded; malformed line silently skipped
    expect(results).toHaveLength(2);
    expect((results[0] as Record<string, unknown>)['uuid']).toBe('u1');
    expect((results[1] as Record<string, unknown>)['uuid']).toBe('u2');
  });

  it('handles file with all malformed lines without crashing', async () => {
    const file = createTempJsonl(['bad json', 'also bad', '{unclosed']);
    tempDirs.push(file.split('/').slice(0, -1).join('/'));

    const results: unknown[] = [];
    for await (const obj of streamJSONLFile(file)) {
      results.push(obj);
    }
    expect(results).toHaveLength(0);
  });
});

describe('discoverJSONLFiles() path logic', () => {
  it('uses overrideDir exclusively when provided', async () => {
    // Import here to test with controlled env
    const { discoverJSONLFiles } = await import('../parser/reader.js');
    const dir = join(tmpdir(), `yclaude-discover-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    // No JSONL files in temp dir — should return empty array, not throw
    const files = await discoverJSONLFiles(dir);
    expect(Array.isArray(files)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});
