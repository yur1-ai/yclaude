/**
 * Platform path resolution for Cursor data directories.
 *
 * All functions are pure (no I/O) -- they only construct paths based on
 * the current platform and home directory. Path existence checks happen
 * at the adapter/detect level.
 */

import { homedir, platform } from 'node:os';
import { join } from 'node:path';

/**
 * Returns array of Cursor data directories to check.
 *
 * Includes both stable and Insiders directories on supported platforms
 * (macOS and Linux). Returns empty array for unsupported platforms.
 */
export function getCursorDataDirs(): string[] {
  const home = homedir();
  const plat = platform();
  const dirs: string[] = [];

  if (plat === 'darwin') {
    dirs.push(join(home, 'Library', 'Application Support', 'Cursor'));
    dirs.push(join(home, 'Library', 'Application Support', 'Cursor - Insiders'));
  } else if (plat === 'linux') {
    dirs.push(join(home, '.config', 'Cursor'));
    dirs.push(join(home, '.config', 'Cursor - Insiders'));
  }
  // Windows deferred

  return dirs;
}

/**
 * Returns path to the global state.vscdb file.
 * Contains bubble data, full composer data, and other global state.
 */
export function getGlobalDbPath(dataDir: string): string {
  return join(dataDir, 'User', 'globalStorage', 'state.vscdb');
}

/**
 * Returns path to the workspace storage directory.
 * Contains per-workspace state.vscdb files with composer heads.
 */
export function getWorkspaceStoragePath(dataDir: string): string {
  return join(dataDir, 'User', 'workspaceStorage');
}
