/**
 * Synthetic SQLite fixture factory for Cursor provider tests.
 *
 * Creates deterministic test databases using node:sqlite that mirror
 * the real Cursor state.vscdb schema. Shared across all test files.
 */

import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ComposerFullData, ComposerHead, RawBubble } from '../types.js';

/**
 * Creates a temporary directory for test databases.
 */
export async function createTestDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'yclaude-cursor-test-'));
}

/**
 * Creates a workspace-level state.vscdb with composer heads in ItemTable.
 *
 * @param dir - Directory to create the DB in
 * @param composers - Array of composer head objects
 * @param workspacePath - Optional workspace path for workspace.json
 * @returns Path to the created state.vscdb
 */
export function createTestWorkspaceDb(
  dir: string,
  composers: object[],
  workspacePath?: string,
): string {
  const dbPath = join(dir, 'state.vscdb');
  const db = new DatabaseSync(dbPath);

  try {
    db.exec('CREATE TABLE IF NOT EXISTS ItemTable (key TEXT UNIQUE, value BLOB)');

    const composerData = { allComposers: composers };
    const stmt = db.prepare('INSERT INTO ItemTable (key, value) VALUES (?, ?)');
    stmt.run('composer.composerData', Buffer.from(JSON.stringify(composerData)));

    if (workspacePath !== undefined) {
      // Create workspace.json in the same directory
      const fs = require('node:fs');
      const wsJsonPath = join(dir, 'workspace.json');
      fs.writeFileSync(wsJsonPath, JSON.stringify({ folder: workspacePath }));
    }
  } finally {
    db.close();
  }

  return dbPath;
}

/**
 * Creates a global state.vscdb with both ItemTable and cursorDiskKV tables.
 *
 * @param dir - Directory to create the DB in
 * @param entries - Array of key-value entries for cursorDiskKV
 * @returns Path to the created state.vscdb
 */
export function createTestGlobalDb(
  dir: string,
  entries: Array<{ key: string; value: object }>,
): string {
  const dbPath = join(dir, 'state.vscdb');
  const db = new DatabaseSync(dbPath);

  try {
    db.exec('CREATE TABLE IF NOT EXISTS ItemTable (key TEXT UNIQUE, value BLOB)');
    db.exec('CREATE TABLE IF NOT EXISTS cursorDiskKV (key TEXT UNIQUE, value BLOB)');

    const stmt = db.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)');
    for (const entry of entries) {
      stmt.run(entry.key, Buffer.from(JSON.stringify(entry.value)));
    }
  } finally {
    db.close();
  }

  return dbPath;
}

/**
 * Returns a valid ComposerHead with sensible defaults.
 */
export function sampleComposerHead(overrides?: Partial<ComposerHead>): ComposerHead {
  const now = Date.now();
  return {
    composerId: randomUUID(),
    createdAt: now - 3600_000, // 1 hour ago
    lastUpdatedAt: now,
    unifiedMode: 'agent',
    name: 'Test Composer',
    subtitle: 'Edited test files',
    totalLinesAdded: 42,
    totalLinesRemoved: 10,
    filesChangedCount: 3,
    isArchived: false,
    isDraft: false,
    ...overrides,
  };
}

/**
 * Returns a valid v3 RawBubble with sensible defaults.
 */
export function sampleBubble(overrides?: Partial<RawBubble>): RawBubble {
  return {
    _v: 3,
    type: 2, // AI response
    bubbleId: randomUUID(),
    isAgentic: true,
    tokenCount: { inputTokens: 100, outputTokens: 50 },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Returns valid full composer data with sensible defaults.
 */
export function sampleComposerFullData(overrides?: Partial<ComposerFullData>): ComposerFullData {
  return {
    composerId: randomUUID(),
    _v: 3,
    unifiedMode: 'agent',
    forceMode: 'chat',
    isAgentic: true,
    usageData: {},
    modelConfig: { modelName: 'default', maxMode: false },
    fullConversationHeadersOnly: [],
    createdAt: Date.now() - 3600_000,
    lastUpdatedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Cleans up a temporary test directory.
 */
export async function cleanupTestDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
