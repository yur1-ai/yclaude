import { afterEach, describe, expect, it } from 'vitest';
import {
  closeCursorDb,
  detectSchemaVersion,
  openCursorDb,
  readKvEntries,
  readKvEntry,
} from '../db.js';
import { cleanupTestDir, createTestDir, createTestGlobalDb } from './fixtures.js';

let testDir: string;

afterEach(async () => {
  if (testDir) {
    await cleanupTestDir(testDir);
  }
});

describe('db', () => {
  describe('openCursorDb', () => {
    it('opens a valid test database successfully', async () => {
      testDir = await createTestDir();
      const dbPath = createTestGlobalDb(testDir, [{ key: 'test:key', value: { hello: 'world' } }]);

      const db = openCursorDb(dbPath);
      expect(db).toBeDefined();
      closeCursorDb(db);
    });
  });

  describe('readKvEntry', () => {
    it('reads a single key from ItemTable', async () => {
      testDir = await createTestDir();
      const dbPath = createTestGlobalDb(testDir, []);

      // The global DB also has ItemTable -- insert directly
      const { DatabaseSync } = await import('node:sqlite');
      const writeDb = new DatabaseSync(dbPath);
      writeDb
        .prepare('INSERT INTO ItemTable (key, value) VALUES (?, ?)')
        .run('mykey', Buffer.from(JSON.stringify({ data: 42 })));
      writeDb.close();

      const db = openCursorDb(dbPath);
      const result = readKvEntry(db, 'ItemTable', 'mykey');
      expect(result).toBe('{"data":42}');
      closeCursorDb(db);
    });

    it('returns null for missing key', async () => {
      testDir = await createTestDir();
      const dbPath = createTestGlobalDb(testDir, []);

      const db = openCursorDb(dbPath);
      const result = readKvEntry(db, 'cursorDiskKV', 'nonexistent:key');
      expect(result).toBeNull();
      closeCursorDb(db);
    });

    it('correctly decodes Uint8Array BLOB to UTF-8 string', async () => {
      testDir = await createTestDir();
      const unicodeValue = { text: 'Hello \u{1F600} Unicode \u00E9\u00F1' };
      const dbPath = createTestGlobalDb(testDir, [{ key: 'unicode:test', value: unicodeValue }]);

      const db = openCursorDb(dbPath);
      const result = readKvEntry(db, 'cursorDiskKV', 'unicode:test');
      expect(result).not.toBeNull();
      const parsed = JSON.parse(result as string);
      expect(parsed.text).toBe('Hello \u{1F600} Unicode \u00E9\u00F1');
      closeCursorDb(db);
    });
  });

  describe('readKvEntries', () => {
    it('reads entries by prefix from cursorDiskKV', async () => {
      testDir = await createTestDir();
      const composerId = 'abc-123';
      const dbPath = createTestGlobalDb(testDir, [
        { key: `bubbleId:${composerId}:b1`, value: { bubbleId: 'b1', type: 2 } },
        { key: `bubbleId:${composerId}:b2`, value: { bubbleId: 'b2', type: 1 } },
        { key: 'bubbleId:other-id:b3', value: { bubbleId: 'b3', type: 2 } },
      ]);

      const db = openCursorDb(dbPath);
      const results = readKvEntries(db, 'cursorDiskKV', `bubbleId:${composerId}:`);
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.key)).toEqual([
        `bubbleId:${composerId}:b1`,
        `bubbleId:${composerId}:b2`,
      ]);

      // Verify values are valid JSON strings
      const parsed = JSON.parse(results[0]?.value as string);
      expect(parsed.bubbleId).toBe('b1');
      closeCursorDb(db);
    });

    it('returns empty array when no matches', async () => {
      testDir = await createTestDir();
      const dbPath = createTestGlobalDb(testDir, [{ key: 'other:key', value: { data: 1 } }]);

      const db = openCursorDb(dbPath);
      const results = readKvEntries(db, 'cursorDiskKV', 'bubbleId:nonexistent:');
      expect(results).toEqual([]);
      closeCursorDb(db);
    });
  });

  describe('detectSchemaVersion', () => {
    it('identifies v3 as dominant version', async () => {
      testDir = await createTestDir();
      const dbPath = createTestGlobalDb(testDir, [
        { key: 'bubbleId:a:b1', value: { _v: 3, type: 2, bubbleId: 'b1' } },
        { key: 'bubbleId:a:b2', value: { _v: 3, type: 2, bubbleId: 'b2' } },
        { key: 'bubbleId:a:b3', value: { _v: 2, type: 2, bubbleId: 'b3' } },
      ]);

      const db = openCursorDb(dbPath);
      const result = detectSchemaVersion(db);
      expect(result.version).toBe(3);
      expect(result.count).toBe(2);
      closeCursorDb(db);
    });

    it('returns {version: 0, count: 0} for empty DB', async () => {
      testDir = await createTestDir();
      const dbPath = createTestGlobalDb(testDir, []);

      const db = openCursorDb(dbPath);
      const result = detectSchemaVersion(db);
      expect(result).toEqual({ version: 0, count: 0 });
      closeCursorDb(db);
    });
  });

  describe('table name validation', () => {
    it('throws on invalid table names', async () => {
      testDir = await createTestDir();
      const dbPath = createTestGlobalDb(testDir, []);

      const db = openCursorDb(dbPath);
      expect(() => readKvEntry(db, 'malicious; DROP TABLE--', 'key')).toThrow('Invalid table name');
      expect(() => readKvEntries(db, 'badTable', 'prefix')).toThrow('Invalid table name');
      closeCursorDb(db);
    });
  });
});
