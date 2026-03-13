import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CursorAdapter } from '../adapter.js';
import type { RawBubble } from '../types.js';
import {
  cleanupTestDir,
  createTestDir,
  createTestGlobalDb,
  createTestWorkspaceDb,
  sampleBubble,
  sampleComposerFullData,
  sampleComposerHead,
} from './fixtures.js';

let testDirs: string[] = [];

async function makeTestDir(): Promise<string> {
  const dir = await createTestDir();
  testDirs.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of testDirs) {
    await cleanupTestDir(dir);
  }
  testDirs = [];
});

/**
 * Creates a full Cursor directory structure in a temp dir:
 *   <dataDir>/User/globalStorage/state.vscdb  (global DB)
 *   <dataDir>/User/workspaceStorage/<wsId>/state.vscdb  (workspace DB)
 *   <dataDir>/User/workspaceStorage/<wsId>/workspace.json  (workspace metadata)
 */
async function createCursorStructure(opts: {
  composerHeads: object[];
  globalEntries: Array<{ key: string; value: object }>;
  workspacePath?: string;
  wsId?: string;
}): Promise<{ dataDir: string; globalDbPath: string; wsDbPath: string }> {
  const dataDir = await makeTestDir();

  // Create global storage directory and DB
  const globalDir = join(dataDir, 'User', 'globalStorage');
  await mkdir(globalDir, { recursive: true });
  const globalDbPath = createTestGlobalDb(globalDir, opts.globalEntries);

  // Create workspace storage directory and DB
  const wsId = opts.wsId ?? 'ws-test-001';
  const wsDir = join(dataDir, 'User', 'workspaceStorage', wsId);
  await mkdir(wsDir, { recursive: true });

  // Create workspace state.vscdb
  const wsDbPath = createTestWorkspaceDb(wsDir, opts.composerHeads);

  // Create workspace.json if workspacePath provided
  if (opts.workspacePath) {
    await writeFile(join(wsDir, 'workspace.json'), JSON.stringify({ folder: opts.workspacePath }));
  }

  return { dataDir, globalDbPath, wsDbPath };
}

describe('CursorAdapter', () => {
  describe('identity', () => {
    it('has id "cursor"', () => {
      const adapter = new CursorAdapter();
      expect(adapter.id).toBe('cursor');
    });

    it('has name "Cursor"', () => {
      const adapter = new CursorAdapter();
      expect(adapter.name).toBe('Cursor');
    });
  });

  describe('detect()', () => {
    it('returns false when no Cursor directories exist', async () => {
      const emptyDir = await makeTestDir();
      const adapter = new CursorAdapter([emptyDir]);
      expect(await adapter.detect()).toBe(false);
    });

    it('returns false when directory exists but no state.vscdb', async () => {
      const dataDir = await makeTestDir();
      // Create User/globalStorage but no state.vscdb
      await mkdir(join(dataDir, 'User', 'globalStorage'), { recursive: true });
      const adapter = new CursorAdapter([dataDir]);
      expect(await adapter.detect()).toBe(false);
    });

    it('returns true when valid Cursor structure exists', async () => {
      const composerId = 'detect-comp';
      const head = sampleComposerHead({ composerId });
      const { dataDir } = await createCursorStructure({
        composerHeads: [head],
        globalEntries: [
          {
            key: `composerData:${composerId}`,
            value: sampleComposerFullData({ composerId }),
          },
          {
            key: `bubbleId:${composerId}:b1`,
            value: sampleBubble({ bubbleId: 'b1', type: 2 }),
          },
        ],
      });

      const adapter = new CursorAdapter([dataDir]);
      expect(await adapter.detect()).toBe(true);
    });

    it('checks multiple directories (stable and Insiders)', async () => {
      const emptyDir1 = await makeTestDir();
      const composerId = 'detect-multi';
      const head = sampleComposerHead({ composerId });
      const { dataDir: validDir } = await createCursorStructure({
        composerHeads: [head],
        globalEntries: [
          {
            key: `composerData:${composerId}`,
            value: sampleComposerFullData({ composerId }),
          },
          {
            key: `bubbleId:${composerId}:b1`,
            value: sampleBubble({ bubbleId: 'b1', type: 2 }),
          },
        ],
      });

      // First dir empty, second dir valid -- should return true
      const adapter = new CursorAdapter([emptyDir1, validDir]);
      expect(await adapter.detect()).toBe(true);
    });
  });

  describe('load()', () => {
    it('returns UnifiedEvent[] from synthetic data', async () => {
      const composerId = 'load-comp';
      const head = sampleComposerHead({ composerId, unifiedMode: 'agent' });
      const composerData = sampleComposerFullData({
        composerId,
        unifiedMode: 'agent',
        usageData: { 'claude-3.5-sonnet': { costInCents: 10, amount: 2 } },
      });

      const { dataDir } = await createCursorStructure({
        composerHeads: [head],
        globalEntries: [
          { key: `composerData:${composerId}`, value: composerData },
          {
            key: `bubbleId:${composerId}:b1`,
            value: sampleBubble({
              bubbleId: 'b1',
              type: 2,
              _v: 3,
              tokenCount: { inputTokens: 200, outputTokens: 100 },
            }),
          },
        ],
        workspacePath: 'file:///Users/dev/myproject',
      });

      const adapter = new CursorAdapter([dataDir]);
      const events = await adapter.load({});

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]?.provider).toBe('cursor');
      expect(events[0]?.sessionId).toBe(composerId);
      expect(events[0]?.timestamp).toBeDefined();
      expect(events[0]?.tokens).toBeDefined();
      expect(events[0]?.costUsd).toBeGreaterThan(0);
    });

    it('passes preserveContent option through to parser', async () => {
      const composerId = 'load-content';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      const { dataDir } = await createCursorStructure({
        composerHeads: [head],
        globalEntries: [
          { key: `composerData:${composerId}`, value: composerData },
          {
            key: `bubbleId:${composerId}:b1`,
            value: sampleBubble({
              bubbleId: 'b1',
              type: 2,
              _v: 3,
              text: 'Hello from Cursor',
            }),
          },
        ],
      });

      const adapter = new CursorAdapter([dataDir]);

      // With preserveContent=true, message should be present
      const withContent = await adapter.load({ preserveContent: true });
      expect(withContent.length).toBeGreaterThan(0);
      expect(withContent[0]?.message).toBeDefined();
      expect((withContent[0]?.message as Record<string, unknown>).text).toBe('Hello from Cursor');

      // With preserveContent=false, message should be absent
      const withoutContent = await adapter.load({ preserveContent: false });
      expect(withoutContent.length).toBeGreaterThan(0);
      expect(withoutContent[0]?.message).toBeUndefined();
    });

    it('handles missing workspace.json gracefully (cwd absent)', async () => {
      const composerId = 'load-no-wsjson';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      // Create structure WITHOUT workspacePath (no workspace.json)
      const { dataDir } = await createCursorStructure({
        composerHeads: [head],
        globalEntries: [
          { key: `composerData:${composerId}`, value: composerData },
          {
            key: `bubbleId:${composerId}:b1`,
            value: sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 }),
          },
        ],
        // No workspacePath -- no workspace.json created
      });

      const adapter = new CursorAdapter([dataDir]);
      const events = await adapter.load({});

      expect(events.length).toBeGreaterThan(0);
      // cwd should be absent since no workspace.json
      expect(events[0]?.cwd).toBeUndefined();
    });

    it('handles inaccessible workspace DB gracefully (skip with warning)', async () => {
      const comp1 = 'load-good-ws';
      const comp2 = 'load-bad-ws';
      const head1 = sampleComposerHead({ composerId: comp1 });
      const head2 = sampleComposerHead({ composerId: comp2 });
      const cd1 = sampleComposerFullData({ composerId: comp1 });

      // Create structure with one valid workspace
      const { dataDir } = await createCursorStructure({
        composerHeads: [head1],
        globalEntries: [
          { key: `composerData:${comp1}`, value: cd1 },
          {
            key: `bubbleId:${comp1}:b1`,
            value: sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 }),
          },
        ],
        wsId: 'ws-good',
      });

      // Create a second workspace directory with an invalid/corrupt DB
      const badWsDir = join(dataDir, 'User', 'workspaceStorage', 'ws-bad');
      await mkdir(badWsDir, { recursive: true });
      // Write invalid data as state.vscdb (not a valid SQLite file)
      await writeFile(join(badWsDir, 'state.vscdb'), 'not a valid sqlite file');

      const adapter = new CursorAdapter([dataDir]);
      // Should NOT throw -- should skip the bad workspace and load the good one
      const events = await adapter.load({});

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]?.sessionId).toBe(comp1);
    });

    it('logs schema version to stderr', async () => {
      const composerId = 'load-schema-log';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      const { dataDir } = await createCursorStructure({
        composerHeads: [head],
        globalEntries: [
          { key: `composerData:${composerId}`, value: composerData },
          {
            key: `bubbleId:${composerId}:b1`,
            value: sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 }),
          },
        ],
      });

      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const adapter = new CursorAdapter([dataDir]);
      await adapter.load({});

      // Check that schema version was logged to stderr
      const stderrOutput = stderrSpy.mock.calls.map((call) => String(call[0])).join('');
      expect(stderrOutput).toMatch(/Cursor.*schema.*v\d/i);

      stderrSpy.mockRestore();
    });

    it('full round-trip: 2 workspaces, 3 composers, mixed modes and costs', async () => {
      const comp1 = 'rt-agent-comp';
      const comp2 = 'rt-chat-comp';
      const comp3 = 'rt-edit-comp';

      const head1 = sampleComposerHead({
        composerId: comp1,
        unifiedMode: 'agent',
        createdOnBranch: 'main',
      });
      const head2 = sampleComposerHead({ composerId: comp2, unifiedMode: 'chat' });
      const head3 = sampleComposerHead({ composerId: comp3, unifiedMode: 'edit' });

      const cd1 = sampleComposerFullData({
        composerId: comp1,
        unifiedMode: 'agent',
        usageData: { 'claude-3.5-sonnet': { costInCents: 24, amount: 3 } },
      });
      const cd2 = sampleComposerFullData({
        composerId: comp2,
        unifiedMode: 'chat',
        usageData: { 'gpt-4': { costInCents: 12, amount: 2 } },
        modelConfig: { modelName: 'gpt-4' },
      });
      const cd3 = sampleComposerFullData({
        composerId: comp3,
        unifiedMode: 'edit',
        usageData: {},
        modelConfig: { modelName: 'cursor-small' },
      });

      const dataDir = await makeTestDir();

      // Create global storage with all composers' data
      const globalDir = join(dataDir, 'User', 'globalStorage');
      await mkdir(globalDir, { recursive: true });

      const now = Date.now();
      const t1 = new Date(now - 60_000).toISOString();
      const t2 = new Date(now - 30_000).toISOString();
      const t3 = new Date(now).toISOString();

      createTestGlobalDb(globalDir, [
        { key: `composerData:${comp1}`, value: cd1 },
        { key: `composerData:${comp2}`, value: cd2 },
        { key: `composerData:${comp3}`, value: cd3 },
        {
          key: `bubbleId:${comp1}:b1`,
          value: sampleBubble({ bubbleId: 'b1', type: 2, _v: 3, createdAt: t1 }),
        },
        {
          key: `bubbleId:${comp1}:b2`,
          value: sampleBubble({ bubbleId: 'b2', type: 2, _v: 3, createdAt: t2 }),
        },
        {
          key: `bubbleId:${comp2}:b3`,
          value: sampleBubble({
            bubbleId: 'b3',
            type: 2,
            _v: 2,
            timingInfo: { clientRpcSendTime: now - 10_000 },
          }),
        },
        {
          key: `bubbleId:${comp3}:b4`,
          value: sampleBubble({ bubbleId: 'b4', type: 2, _v: 3, createdAt: t3 }),
        },
      ]);

      // Create workspace 1 (agent + chat composers)
      const ws1Dir = join(dataDir, 'User', 'workspaceStorage', 'ws-1');
      await mkdir(ws1Dir, { recursive: true });
      createTestWorkspaceDb(ws1Dir, [head1, head2]);
      await writeFile(
        join(ws1Dir, 'workspace.json'),
        JSON.stringify({ folder: 'file:///Users/dev/project-a' }),
      );

      // Create workspace 2 (edit composer)
      const ws2Dir = join(dataDir, 'User', 'workspaceStorage', 'ws-2');
      await mkdir(ws2Dir, { recursive: true });
      createTestWorkspaceDb(ws2Dir, [head3]);
      await writeFile(
        join(ws2Dir, 'workspace.json'),
        JSON.stringify({ folder: 'file:///Users/dev/project%20b' }),
      );

      const adapter = new CursorAdapter([dataDir]);
      const events = await adapter.load({});

      // comp1: 2 AI bubbles -> 2 events
      // comp2: 1 AI bubble  -> 1 event
      // comp3: 1 AI bubble  -> 1 event
      // Total: 4 events
      expect(events).toHaveLength(4);

      // All events should be from cursor provider
      for (const event of events) {
        expect(event.provider).toBe('cursor');
      }

      // Check agent mode
      const agentEvents = events.filter((e) => e.sessionId === comp1);
      expect(agentEvents).toHaveLength(2);
      expect(agentEvents[0]?.isAgentic).toBe(true);
      expect(agentEvents[0]?.model).toBe('claude-3.5-sonnet');
      expect(agentEvents[0]?.costUsd).toBeCloseTo(0.12, 4); // 24 cents / 2 bubbles = 12 cents each

      // Check chat mode
      const chatEvents = events.filter((e) => e.sessionId === comp2);
      expect(chatEvents).toHaveLength(1);
      expect(chatEvents[0]?.isAgentic).toBe(false);
      expect(chatEvents[0]?.model).toBe('gpt-4');

      // Check edit mode
      const editEvents = events.filter((e) => e.sessionId === comp3);
      expect(editEvents).toHaveLength(1);
      expect(editEvents[0]?.isAgentic).toBe(false);
      expect(editEvents[0]?.model).toBe('cursor-small');

      // Check workspace path decoding (project%20b -> "project b")
      expect(editEvents[0]?.cwd).toBe('/Users/dev/project b');

      // Check timestamps are valid ISO strings
      for (const event of events) {
        expect(() => new Date(event.timestamp)).not.toThrow();
        expect(new Date(event.timestamp).getTime()).not.toBeNaN();
      }
    });
  });
});
