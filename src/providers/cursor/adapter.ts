/**
 * Cursor provider adapter.
 *
 * Connects the Cursor extraction pipeline (paths, db, parser) into a
 * working provider that the registry can detect and load. Discovers
 * Cursor installations, reads workspace databases, and produces
 * UnifiedEvent[] through the parser.
 */

import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { debugLog, enableDebug } from '../../shared/debug.js';
import type { LoadOptions, ProviderAdapter, UnifiedEvent } from '../types.js';
import { closeCursorDb, detectSchemaVersion, openCursorDb } from './db.js';
import { parseCursorData } from './parser.js';
import { getCursorDataDirs, getGlobalDbPath, getWorkspaceStoragePath } from './paths.js';

export class CursorAdapter implements ProviderAdapter {
  readonly id = 'cursor' as const;
  readonly name = 'Cursor';

  constructor(private testDataDirs?: string[]) {}

  /**
   * Returns true when at least one Cursor data directory exists
   * with a global state.vscdb file.
   */
  async detect(): Promise<boolean> {
    try {
      const dataDirs = this.testDataDirs ?? getCursorDataDirs();

      for (const dir of dataDirs) {
        const globalDbPath = getGlobalDbPath(dir);
        try {
          await access(globalDbPath);
          debugLog(`Cursor detected: ${globalDbPath}`);
          return true;
        } catch {
          // This dir doesn't have a global DB -- continue checking
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Discovers all workspaces, reads global DB, parses all data into
   * UnifiedEvent[]. Logs schema version to stderr for startup banner.
   */
  async load(opts: LoadOptions): Promise<UnifiedEvent[]> {
    if (opts.debug) {
      enableDebug();
    }

    const dataDirs = this.testDataDirs ?? getCursorDataDirs();

    // Filter to data dirs that actually have a global DB
    const validDataDirs: string[] = [];
    for (const dir of dataDirs) {
      const globalDbPath = getGlobalDbPath(dir);
      try {
        await access(globalDbPath);
        validDataDirs.push(dir);
      } catch {
        debugLog(`Skipping Cursor data dir (no global DB): ${dir}`);
      }
    }

    if (validDataDirs.length === 0) {
      debugLog('No valid Cursor data directories found');
      return [];
    }

    const allEvents: UnifiedEvent[] = [];

    for (const dataDir of validDataDirs) {
      try {
        const events = await this.loadDataDir(dataDir, opts);
        for (const e of events) allEvents.push(e);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(
          `[yclaude] Warning: Failed to load Cursor data from ${dataDir}: ${message}\n`,
        );
      }
    }

    return allEvents;
  }

  /**
   * Loads events from a single Cursor data directory.
   */
  private async loadDataDir(dataDir: string, opts: LoadOptions): Promise<UnifiedEvent[]> {
    const globalDbPath = getGlobalDbPath(dataDir);
    const workspaceStoragePath = getWorkspaceStoragePath(dataDir);

    // Discover workspaces
    const workspaces: Array<{ dbPath: string; workspacePath?: string }> = [];

    try {
      const wsEntries = await readdir(workspaceStoragePath, { withFileTypes: true });

      for (const entry of wsEntries) {
        if (!entry.isDirectory()) continue;

        const wsDir = join(workspaceStoragePath, entry.name);
        const wsDbPath = join(wsDir, 'state.vscdb');

        // Check if workspace state.vscdb exists
        try {
          await access(wsDbPath);
        } catch {
          debugLog(`No state.vscdb in workspace: ${wsDir}`);
          continue;
        }

        // Try to read workspace.json for workspace path
        let workspacePath: string | undefined;
        try {
          const wsJsonPath = join(wsDir, 'workspace.json');
          const wsJsonContent = await readFile(wsJsonPath, 'utf-8');
          const wsJson = JSON.parse(wsJsonContent) as { folder?: string; workspace?: string };
          if (wsJson.folder) {
            workspacePath = tryDecodeLocalUri(wsJson.folder);
          } else if (wsJson.workspace) {
            // Multi-root workspace — try to resolve from .code-workspace file
            workspacePath = await resolveWorkspaceFolder(wsJson.workspace);
          }
        } catch {
          debugLog(`No workspace.json in workspace: ${wsDir}`);
        }

        workspaces.push({
          dbPath: wsDbPath,
          ...(workspacePath !== undefined ? { workspacePath } : {}),
        });
      }
    } catch (err) {
      debugLog(`Cannot read workspace storage: ${workspaceStoragePath}: ${String(err)}`);
    }

    debugLog(`Found ${workspaces.length} workspaces in ${dataDir}`);

    // Detect and log schema version
    let db: DatabaseSync | undefined;
    try {
      db = openCursorDb(globalDbPath);
      const schemaVersion = detectSchemaVersion(db);
      process.stderr.write(
        `[yclaude] Cursor: schema v${schemaVersion.version} (${schemaVersion.count} bubbles sampled)\n`,
      );
    } catch (err) {
      debugLog(`Schema detection failed: ${String(err)}`);
    } finally {
      if (db) closeCursorDb(db);
    }

    // Parse all data through the extraction pipeline
    return parseCursorData({
      globalDbPath,
      workspaces,
      ...(opts.preserveContent !== undefined ? { preserveContent: opts.preserveContent } : {}),
      ...(opts.debug !== undefined ? { debug: opts.debug } : {}),
    });
  }
}

/**
 * Decodes a file:// URI to a filesystem path.
 * Returns undefined for non-file URIs (vscode-remote://, ssh://, etc.)
 * since those can't be resolved to local paths.
 */
function tryDecodeLocalUri(uri: string): string | undefined {
  if (uri.startsWith('file:///')) {
    return decodeURIComponent(uri.slice('file://'.length));
  }
  if (uri.startsWith('file://')) {
    return decodeURIComponent(uri.slice('file://'.length));
  }
  // Non-file URIs (vscode-remote://, etc.) — can't resolve locally
  if (uri.includes('://')) {
    debugLog(`Skipping non-local URI: ${uri.substring(0, 60)}`);
    return undefined;
  }
  return uri;
}

/**
 * Resolves the first folder from a .code-workspace file URI.
 * Returns undefined if the file can't be read or has no local folders.
 */
async function resolveWorkspaceFolder(workspaceUri: string): Promise<string | undefined> {
  const wsFilePath = tryDecodeLocalUri(workspaceUri);
  if (!wsFilePath) return undefined;

  try {
    const content = await readFile(wsFilePath, 'utf-8');
    const wsFile = JSON.parse(content) as { folders?: Array<{ path: string }> };
    const firstFolder = wsFile.folders?.[0]?.path;
    if (!firstFolder) return undefined;

    // Resolve relative paths against the workspace file's directory
    if (firstFolder.startsWith('/')) return firstFolder;
    const { dirname } = await import('node:path');
    return join(dirname(wsFilePath), firstFolder);
  } catch {
    debugLog(`Cannot read workspace file: ${wsFilePath}`);
    return undefined;
  }
}
