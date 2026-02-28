import { createReadStream } from 'node:fs';
import { glob } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import os from 'node:os';
import path from 'node:path';
import { debugLog } from '../shared/debug.js';

export async function discoverJSONLFiles(overrideDir?: string): Promise<string[]> {
  const home = os.homedir();
  const claudeConfigDir = process.env['CLAUDE_CONFIG_DIR'];

  // Determine base directories — exclusivity hierarchy: overrideDir > CLAUDE_CONFIG_DIR > defaults
  let baseDirs: string[];
  let useProjectsSubdir: boolean;

  if (overrideDir) {
    baseDirs = [path.resolve(overrideDir)];
    useProjectsSubdir = false;
    debugLog(`File discovery: using --dir override: ${path.resolve(overrideDir)}`);
  } else if (claudeConfigDir) {
    // CLAUDE_CONFIG_DIR is exclusive override, not appended to defaults
    baseDirs = [path.resolve(claudeConfigDir)];
    useProjectsSubdir = true;
    debugLog(`File discovery: using CLAUDE_CONFIG_DIR override: ${path.resolve(claudeConfigDir)}`);
  } else {
    baseDirs = [
      path.join(home, '.claude'),
      path.join(home, '.config', 'claude'),
    ];
    useProjectsSubdir = true;
    debugLog(`File discovery: using default paths (${baseDirs.join(', ')})`);
  }

  const files: string[] = [];
  for (const base of baseDirs) {
    // For default paths and CLAUDE_CONFIG_DIR: look in <base>/projects/**/*.jsonl
    // For overrideDir: search the full tree directly
    const pattern = useProjectsSubdir
      ? path.join(base, 'projects', '**', '*.jsonl')
      : path.join(base, '**', '*.jsonl');

    try {
      for await (const file of glob(pattern)) {
        files.push(file);
      }
    } catch {
      // Directory doesn't exist — silently skip
      debugLog(`Directory not found or inaccessible, skipping: ${base}`);
    }
  }

  debugLog(`Discovered ${files.length} JSONL files`);
  return files;
}

export async function* streamJSONLFile(filePath: string): AsyncGenerator<unknown> {
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,  // Handle Windows-style \r\n
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    const trimmed = line.trim();
    if (!trimmed) continue;  // Skip blank lines silently
    try {
      yield JSON.parse(trimmed);
    } catch (err) {
      // Per user decision: never crash on a bad line — skip with debug log
      debugLog(`Skipping malformed line ${lineNum} in ${filePath}: ${err}`);
    }
  }
}
