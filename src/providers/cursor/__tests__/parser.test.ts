import { describe, it, expect, afterEach } from 'vitest';
import {
  createTestDir,
  createTestGlobalDb,
  createTestWorkspaceDb,
  sampleComposerHead,
  sampleBubble,
  sampleComposerFullData,
  cleanupTestDir,
} from './fixtures.js';
import { parseCursorData } from '../parser.js';
import type { UnifiedEvent } from '../../types.js';
import type { RawBubble } from '../types.js';
import { join } from 'node:path';

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

// Helper: create a global DB with composer data and bubbles for one composer
async function setupSingleComposer(opts: {
  composerId: string;
  composerData?: object;
  bubbles?: RawBubble[];
}) {
  const globalDir = await makeTestDir();
  const entries: Array<{ key: string; value: object }> = [];

  if (opts.composerData) {
    entries.push({
      key: `composerData:${opts.composerId}`,
      value: opts.composerData,
    });
  }

  for (const bubble of opts.bubbles ?? []) {
    entries.push({
      key: `bubbleId:${opts.composerId}:${bubble.bubbleId}`,
      value: bubble,
    });
  }

  const globalDbPath = createTestGlobalDb(globalDir, entries);
  return { globalDir, globalDbPath };
}

// Helper: create workspace DB with heads
async function setupWorkspace(opts: {
  composerHeads: object[];
  workspacePath?: string;
}) {
  const wsDir = await makeTestDir();
  const wsDbPath = createTestWorkspaceDb(
    wsDir,
    opts.composerHeads,
    opts.workspacePath,
  );
  return { wsDir, wsDbPath };
}

describe('parseCursorData', () => {
  // ---- Group 1: CURS-01 - Sessions ----
  describe('CURS-01 - Sessions', () => {
    it('parses single composer with v3 bubbles into UnifiedEvent[]', async () => {
      const composerId = 'comp-001';
      const now = new Date();
      const b1Time = new Date(now.getTime() - 60_000).toISOString();
      const b2Time = now.toISOString();

      const head = sampleComposerHead({ composerId, unifiedMode: 'agent' });
      const composerData = sampleComposerFullData({
        composerId,
        unifiedMode: 'agent',
      });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [
          sampleBubble({ bubbleId: 'b1', type: 2, createdAt: b1Time, _v: 3 }),
          sampleBubble({ bubbleId: 'b2', type: 2, createdAt: b2Time, _v: 3 }),
        ],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(2);
      expect(events[0]!.provider).toBe('cursor');
      expect(events[0]!.sessionId).toBe(composerId);
      expect(events[0]!.type).toBe('assistant');
      expect(events[1]!.provider).toBe('cursor');
      expect(events[1]!.sessionId).toBe(composerId);
    });

    it('parses v2 bubbles using timingInfo.clientRpcSendTime', async () => {
      const composerId = 'comp-v2';
      const epoch = Date.now() - 120_000;

      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      // Build a v2-style bubble manually without createdAt
      const v2Bubble: RawBubble = {
        bubbleId: 'b-v2',
        type: 2,
        _v: 2,
        isAgentic: true,
        tokenCount: { inputTokens: 100, outputTokens: 50 },
        timingInfo: { clientRpcSendTime: epoch },
      };

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [v2Bubble],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      const ts = new Date(events[0]!.timestamp).getTime();
      // Should be close to the epoch we set
      expect(Math.abs(ts - epoch)).toBeLessThan(1000);
    });

    it('calculates session duration from first to last bubble', async () => {
      const composerId = 'comp-dur';
      const now = Date.now();
      const t1 = new Date(now - 600_000).toISOString(); // 10 min ago
      const t2 = new Date(now - 300_000).toISOString(); // 5 min ago
      const t3 = new Date(now).toISOString();

      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [
          sampleBubble({ bubbleId: 'b1', type: 1, createdAt: t1, _v: 3 }), // user
          sampleBubble({ bubbleId: 'b2', type: 2, createdAt: t2, _v: 3 }), // AI
          sampleBubble({ bubbleId: 'b3', type: 2, createdAt: t3, _v: 3 }), // AI
        ],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      // 2 AI bubbles -> 2 events
      expect(events).toHaveLength(2);
      // Duration on first event only: from t1 to t3 = 600_000ms
      expect(events[0]!.durationMs).toBeGreaterThanOrEqual(599_000);
      expect(events[0]!.durationMs).toBeLessThanOrEqual(601_000);
      // Second event should NOT have durationMs
      expect(events[1]!.durationMs).toBeUndefined();
    });

    it('maps workspace path to cwd', async () => {
      const composerId = 'comp-cwd';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 })],
      });

      const { wsDbPath } = await setupWorkspace({
        composerHeads: [head],
        workspacePath: 'file:///Users/dev/myproject',
      });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath, workspacePath: '/Users/dev/myproject' }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.cwd).toBe('/Users/dev/myproject');
    });

    it('maps git branch to gitBranch', async () => {
      const composerId = 'comp-git';
      const head = sampleComposerHead({
        composerId,
        createdOnBranch: 'feature/my-branch',
      });
      const composerData = sampleComposerFullData({ composerId });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 })],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.gitBranch).toBe('feature/my-branch');
    });

    it('excludes empty composers (zero bubbles)', async () => {
      const composerId = 'comp-empty';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [], // No bubbles
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(0);
    });

    it('extracts model name from usageData keys', async () => {
      const composerId = 'comp-model';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({
        composerId,
        usageData: {
          'claude-3.5-sonnet': { costInCents: 10, amount: 2 },
        },
        modelConfig: { modelName: 'default' },
      });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 })],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.model).toBe('claude-3.5-sonnet');
    });

    it('falls back to modelConfig.modelName for model', async () => {
      const composerId = 'comp-model-fallback';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({
        composerId,
        usageData: {},
        modelConfig: { modelName: 'composer-1.5' },
      });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 })],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.model).toBe('composer-1.5');
    });

    it('handles multiple workspaces', async () => {
      const comp1 = 'comp-ws1';
      const comp2 = 'comp-ws2';

      const head1 = sampleComposerHead({ composerId: comp1 });
      const head2 = sampleComposerHead({ composerId: comp2 });
      const cd1 = sampleComposerFullData({ composerId: comp1 });
      const cd2 = sampleComposerFullData({ composerId: comp2 });

      // Global DB with both composers' data
      const globalDir = await makeTestDir();
      const globalDbPath = createTestGlobalDb(globalDir, [
        { key: `composerData:${comp1}`, value: cd1 },
        { key: `composerData:${comp2}`, value: cd2 },
        { key: `bubbleId:${comp1}:b1`, value: sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 }) },
        { key: `bubbleId:${comp2}:b2`, value: sampleBubble({ bubbleId: 'b2', type: 2, _v: 3 }) },
      ]);

      const { wsDbPath: ws1 } = await setupWorkspace({ composerHeads: [head1] });
      const { wsDbPath: ws2 } = await setupWorkspace({ composerHeads: [head2] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: ws1 }, { dbPath: ws2 }],
      });

      expect(events).toHaveLength(2);
      const sessionIds = events.map((e) => e.sessionId);
      expect(sessionIds).toContain(comp1);
      expect(sessionIds).toContain(comp2);
    });
  });

  // ---- Group 2: CURS-02 - Cost ----
  describe('CURS-02 - Cost', () => {
    it('extracts costInCents from usageData', async () => {
      const composerId = 'comp-cost';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({
        composerId,
        usageData: { default: { costInCents: 20, amount: 5 } },
      });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 })],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.costUsd).toBeCloseTo(0.2, 4);
      expect(events[0]!.costSource).toBe('reported');
    });

    it('sums cost across multiple model entries in usageData', async () => {
      const composerId = 'comp-multi-cost';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({
        composerId,
        usageData: {
          default: { costInCents: 20, amount: 5 },
          'claude-3.5-sonnet': { costInCents: 4, amount: 1 },
        },
      });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 })],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.costUsd).toBeCloseTo(0.24, 4);
    });

    it('handles empty usageData gracefully', async () => {
      const composerId = 'comp-no-cost';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({
        composerId,
        usageData: {},
      });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 })],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.costUsd).toBe(0);
      expect(events[0]!.costSource).toBe('reported');
    });

    it('preserves raw costInCents on event', async () => {
      const composerId = 'comp-raw-cost';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({
        composerId,
        usageData: { default: { costInCents: 24, amount: 3 } },
      });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 })],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.costInCents).toBe(24);
    });

    it('distributes cost evenly across AI bubbles', async () => {
      const composerId = 'comp-dist-cost';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({
        composerId,
        usageData: { default: { costInCents: 24, amount: 3 } },
      });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [
          sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 }),
          sampleBubble({ bubbleId: 'b2', type: 2, _v: 3 }),
        ],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(2);
      // 0.24 USD / 2 bubbles = 0.12 each
      expect(events[0]!.costUsd).toBeCloseTo(0.12, 4);
      expect(events[1]!.costUsd).toBeCloseTo(0.12, 4);
    });
  });

  // ---- Group 3: CURS-03 - Agent Mode ----
  describe('CURS-03 - Agent Mode', () => {
    it('sets isAgentic=true for agent mode composers', async () => {
      const composerId = 'comp-agent';
      const head = sampleComposerHead({ composerId, unifiedMode: 'agent' });
      const composerData = sampleComposerFullData({
        composerId,
        unifiedMode: 'agent',
      });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 })],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.isAgentic).toBe(true);
    });

    it('sets isAgentic=false for chat mode', async () => {
      const composerId = 'comp-chat';
      const head = sampleComposerHead({ composerId, unifiedMode: 'chat' });
      const composerData = sampleComposerFullData({
        composerId,
        unifiedMode: 'chat',
      });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 })],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.isAgentic).toBe(false);
    });

    it('sets isAgentic=false for edit mode (inline edits)', async () => {
      const composerId = 'comp-edit';
      const head = sampleComposerHead({ composerId, unifiedMode: 'edit' });
      const composerData = sampleComposerFullData({
        composerId,
        unifiedMode: 'edit',
      });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 })],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.isAgentic).toBe(false);
    });

    it('includes edit-mode composers in results', async () => {
      const composerId = 'comp-edit-included';
      const head = sampleComposerHead({ composerId, unifiedMode: 'edit' });
      const composerData = sampleComposerFullData({
        composerId,
        unifiedMode: 'edit',
      });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 })],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.sessionId).toBe(composerId);
    });
  });

  // ---- Group 4: Resilience ----
  describe('Resilience', () => {
    it('skips corrupt bubbles with debug log', async () => {
      const composerId = 'comp-corrupt-bubble';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      // Create global DB with one valid and one corrupt bubble
      const globalDir = await makeTestDir();
      const { DatabaseSync } = await import('node:sqlite');
      const dbPath = join(globalDir, 'state.vscdb');
      const db = new DatabaseSync(dbPath);
      db.exec('CREATE TABLE IF NOT EXISTS ItemTable (key TEXT UNIQUE, value BLOB)');
      db.exec('CREATE TABLE IF NOT EXISTS cursorDiskKV (key TEXT UNIQUE, value BLOB)');

      // Valid composer data
      db.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)').run(
        `composerData:${composerId}`,
        Buffer.from(JSON.stringify(composerData)),
      );
      // Valid bubble
      db.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)').run(
        `bubbleId:${composerId}:b-valid`,
        Buffer.from(JSON.stringify(sampleBubble({ bubbleId: 'b-valid', type: 2, _v: 3 }))),
      );
      // Corrupt bubble (invalid JSON)
      db.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)').run(
        `bubbleId:${composerId}:b-corrupt`,
        Buffer.from('{invalid json!!!'),
      );
      db.close();

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath: dbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      // Should still have 1 event from valid bubble
      expect(events).toHaveLength(1);
      expect(events[0]!.sessionId).toBe(composerId);
    });

    it('handles corrupt composer data gracefully', async () => {
      const composerId = 'comp-corrupt-data';
      const head = sampleComposerHead({ composerId });

      // Create global DB with corrupt composer data but valid bubbles
      const globalDir = await makeTestDir();
      const { DatabaseSync } = await import('node:sqlite');
      const dbPath = join(globalDir, 'state.vscdb');
      const db = new DatabaseSync(dbPath);
      db.exec('CREATE TABLE IF NOT EXISTS ItemTable (key TEXT UNIQUE, value BLOB)');
      db.exec('CREATE TABLE IF NOT EXISTS cursorDiskKV (key TEXT UNIQUE, value BLOB)');

      // Corrupt composer data
      db.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)').run(
        `composerData:${composerId}`,
        Buffer.from('{totally broken json'),
      );
      // Valid bubble
      db.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)').run(
        `bubbleId:${composerId}:b1`,
        Buffer.from(JSON.stringify(sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 }))),
      );
      db.close();

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      // Should not throw -- graceful degradation
      const events = parseCursorData({
        globalDbPath: dbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      // Events may still be produced from head data alone, or may be empty
      // The key assertion: no crash
      expect(Array.isArray(events)).toBe(true);
    });

    it('handles unknown schema version gracefully', async () => {
      const composerId = 'comp-unknown-v';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [
          sampleBubble({ bubbleId: 'b1', type: 2, _v: 99, createdAt: new Date().toISOString() }),
        ],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      // Should still parse -- unknown version is not a fatal error
      expect(events).toHaveLength(1);
    });

    it('treats zero-zero tokenCount as no data (v3 schema)', async () => {
      const composerId = 'comp-zero-tokens';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [
          sampleBubble({
            bubbleId: 'b1',
            type: 2,
            _v: 3,
            tokenCount: { inputTokens: 0, outputTokens: 0 },
          }),
        ],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.tokens).toBeUndefined();
    });

    it('handles missing tokenCount', async () => {
      const composerId = 'comp-no-tokens';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      const bubble = sampleBubble({ bubbleId: 'b1', type: 2, _v: 3 });
      delete (bubble as unknown as Record<string, unknown>).tokenCount;

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [bubble],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.tokens).toBeUndefined();
    });

    it('handles missing timingInfo and createdAt', async () => {
      const composerId = 'comp-no-ts';
      const head = sampleComposerHead({ composerId, createdAt: Date.now() - 5000 });
      const composerData = sampleComposerFullData({ composerId });

      const bubble = sampleBubble({ bubbleId: 'b1', type: 2, _v: 2 });
      delete (bubble as unknown as Record<string, unknown>).createdAt;
      delete (bubble as unknown as Record<string, unknown>).timingInfo;

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [bubble],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
      });

      expect(events).toHaveLength(1);
      // Should have some timestamp (fallback)
      expect(events[0]!.timestamp).toBeDefined();
      expect(() => new Date(events[0]!.timestamp)).not.toThrow();
    });
  });

  // ---- Group 5: Conversation content ----
  describe('Conversation content', () => {
    it('includes message content when preserveContent=true', async () => {
      const composerId = 'comp-content';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [
          sampleBubble({
            bubbleId: 'b1',
            type: 2,
            _v: 3,
            text: 'Hello, I can help you with that.',
          }),
        ],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
        preserveContent: true,
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.message).toBeDefined();
      expect((events[0]!.message as Record<string, unknown>).text).toBe(
        'Hello, I can help you with that.',
      );
    });

    it('excludes message content when preserveContent=false', async () => {
      const composerId = 'comp-no-content';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [
          sampleBubble({
            bubbleId: 'b1',
            type: 2,
            _v: 3,
            text: 'This should not appear.',
          }),
        ],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
        preserveContent: false,
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.message).toBeUndefined();
    });

    it('includes thinking content in message when available', async () => {
      const composerId = 'comp-thinking';
      const head = sampleComposerHead({ composerId });
      const composerData = sampleComposerFullData({ composerId });

      const { globalDbPath } = await setupSingleComposer({
        composerId,
        composerData,
        bubbles: [
          sampleBubble({
            bubbleId: 'b1',
            type: 2,
            _v: 3,
            text: 'Here is my answer.',
            thinking: 'Let me think about this carefully...',
          }),
        ],
      });

      const { wsDbPath } = await setupWorkspace({ composerHeads: [head] });

      const events = parseCursorData({
        globalDbPath,
        workspaces: [{ dbPath: wsDbPath }],
        preserveContent: true,
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.message).toBeDefined();
      expect((events[0]!.message as Record<string, unknown>).thinking).toBe(
        'Let me think about this carefully...',
      );
    });
  });
});
