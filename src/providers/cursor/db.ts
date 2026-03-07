/**
 * SQLite database access layer for Cursor state.vscdb files.
 *
 * Provides read-only access with SQLITE_BUSY fallback to temp copy.
 * Uses node:sqlite (DatabaseSync) available on Node.js 24+.
 */

import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { debugLog } from '../../shared/debug.js';
import type { SchemaVersion } from './types.js';

/** Allowed table names -- prevents SQL injection via table parameter. */
const ALLOWED_TABLES = new Set(['ItemTable', 'cursorDiskKV']);

function validateTable(table: string): void {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Invalid table name: "${table}". Allowed: ${[...ALLOWED_TABLES].join(', ')}`);
  }
}

function isBusyError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message.includes('SQLITE_BUSY') || err.message.includes('database is locked');
  }
  return false;
}

/**
 * Opens a Cursor state.vscdb database in read-only mode.
 *
 * On SQLITE_BUSY (database locked by Cursor), falls back to copying
 * the .vscdb file to a temp directory and opening from there.
 * Caller is responsible for closing the returned database.
 */
export function openCursorDb(dbPath: string): DatabaseSync {
  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    // Quick validation probe -- verify the DB is accessible
    db.exec('SELECT 1');
    debugLog(`Opened Cursor DB: ${dbPath}`);
    return db;
  } catch (err) {
    if (isBusyError(err)) {
      debugLog(`DB busy, falling back to temp copy: ${dbPath}`);
      return openFromTempCopy(dbPath);
    }
    throw err;
  }
}

function openFromTempCopy(dbPath: string): DatabaseSync {
  const tempDir = mkdtempSync(join(tmpdir(), 'yclaude-cursor-db-'));
  const tempPath = join(tempDir, basename(dbPath));

  // Copy just the main file (not WAL/SHM -- 1.3GB DB, avoid unnecessary copies)
  copyFileSync(dbPath, tempPath);
  debugLog(`Temp copy created: ${tempPath}`);

  const db = new DatabaseSync(tempPath, { readOnly: true });
  return db;
}

/**
 * Reads a single key-value entry from the specified table.
 *
 * Returns the value as a UTF-8 string, or null if the key is not found.
 * The value column is stored as BLOB in state.vscdb.
 */
export function readKvEntry(
  db: DatabaseSync,
  table: string,
  key: string,
): string | null {
  validateTable(table);

  const stmt = db.prepare(`SELECT value FROM ${table} WHERE key = ?`);
  const row = stmt.get(key) as { value: Uint8Array } | undefined;

  if (!row) {
    debugLog(`Key not found in ${table}: ${key}`);
    return null;
  }

  return Buffer.from(row.value).toString('utf-8');
}

/**
 * Reads all entries with keys matching the given prefix.
 *
 * Uses LIKE with prefix% pattern for efficient prefix scanning.
 * Returns array of {key, value} with values decoded to UTF-8 strings.
 */
export function readKvEntries(
  db: DatabaseSync,
  table: string,
  keyPrefix: string,
): Array<{ key: string; value: string }> {
  validateTable(table);

  const stmt = db.prepare(`SELECT key, value FROM ${table} WHERE key LIKE ? || '%'`);
  const rows = stmt.all(keyPrefix) as Array<{ key: string; value: Uint8Array }>;

  debugLog(`Read ${rows.length} entries from ${table} with prefix "${keyPrefix}"`);

  return rows.map((row) => ({
    key: row.key,
    value: Buffer.from(row.value).toString('utf-8'),
  }));
}

/**
 * Detects the dominant bubble schema version in the database.
 *
 * Samples up to 10 bubble entries from cursorDiskKV and counts _v values.
 * Returns the most common version and its count.
 */
export function detectSchemaVersion(db: DatabaseSync): SchemaVersion {
  let rows: Array<{ value: Uint8Array }>;
  try {
    const stmt = db.prepare(
      "SELECT value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%' LIMIT 10",
    );
    rows = stmt.all() as Array<{ value: Uint8Array }>;
  } catch {
    // Table might not exist
    debugLog('cursorDiskKV table not found or inaccessible');
    return { version: 0, count: 0 };
  }

  if (rows.length === 0) {
    debugLog('No bubble entries found for schema detection');
    return { version: 0, count: 0 };
  }

  const versionCounts = new Map<number, number>();

  for (const row of rows) {
    try {
      const json = JSON.parse(Buffer.from(row.value).toString('utf-8')) as Record<string, unknown>;
      const v = typeof json._v === 'number' ? json._v : 0;
      versionCounts.set(v, (versionCounts.get(v) ?? 0) + 1);
    } catch {
      // Skip unparseable entries
    }
  }

  if (versionCounts.size === 0) {
    return { version: 0, count: 0 };
  }

  // Find the version with the highest count
  let maxVersion = 0;
  let maxCount = 0;
  for (const [version, count] of versionCounts) {
    if (count > maxCount) {
      maxVersion = version;
      maxCount = count;
    }
  }

  debugLog(`Detected schema version: v${maxVersion} (${maxCount} of ${rows.length} samples)`);
  return { version: maxVersion, count: maxCount };
}

/**
 * Closes a Cursor database, ignoring close errors.
 */
export function closeCursorDb(db: DatabaseSync): void {
  try {
    db.close();
  } catch {
    // Ignore close errors
  }
}
