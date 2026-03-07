import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';

// Mock os module before importing paths
vi.mock('node:os', () => ({
  homedir: vi.fn(),
  platform: vi.fn(),
}));

import { getCursorDataDirs, getGlobalDbPath, getWorkspaceStoragePath } from '../paths.js';
import { homedir, platform } from 'node:os';

const mockHomedir = vi.mocked(homedir);
const mockPlatform = vi.mocked(platform);

describe('paths', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getCursorDataDirs', () => {
    it('returns correct paths for macOS', () => {
      mockPlatform.mockReturnValue('darwin');
      mockHomedir.mockReturnValue('/Users/testuser');

      const dirs = getCursorDataDirs();
      expect(dirs).toEqual([
        join('/Users/testuser', 'Library', 'Application Support', 'Cursor'),
        join('/Users/testuser', 'Library', 'Application Support', 'Cursor - Insiders'),
      ]);
    });

    it('returns correct paths for Linux', () => {
      mockPlatform.mockReturnValue('linux');
      mockHomedir.mockReturnValue('/home/testuser');

      const dirs = getCursorDataDirs();
      expect(dirs).toEqual([
        join('/home/testuser', '.config', 'Cursor'),
        join('/home/testuser', '.config', 'Cursor - Insiders'),
      ]);
    });

    it('returns empty array for Windows (unsupported)', () => {
      mockPlatform.mockReturnValue('win32');
      mockHomedir.mockReturnValue('C:\\Users\\testuser');

      const dirs = getCursorDataDirs();
      expect(dirs).toEqual([]);
    });

    it('returns empty array for other unsupported platforms', () => {
      mockPlatform.mockReturnValue('freebsd');
      mockHomedir.mockReturnValue('/home/testuser');

      const dirs = getCursorDataDirs();
      expect(dirs).toEqual([]);
    });

    it('includes both stable and Insiders directories', () => {
      mockPlatform.mockReturnValue('darwin');
      mockHomedir.mockReturnValue('/Users/testuser');

      const dirs = getCursorDataDirs();
      expect(dirs).toHaveLength(2);
      expect(dirs[0]).toContain('Cursor');
      expect(dirs[0]).not.toContain('Insiders');
      expect(dirs[1]).toContain('Cursor - Insiders');
    });
  });

  describe('getGlobalDbPath', () => {
    it('constructs correct path to global state.vscdb', () => {
      const result = getGlobalDbPath('/Users/testuser/Library/Application Support/Cursor');
      expect(result).toBe(
        join('/Users/testuser/Library/Application Support/Cursor', 'User', 'globalStorage', 'state.vscdb'),
      );
    });
  });

  describe('getWorkspaceStoragePath', () => {
    it('constructs correct path to workspace storage directory', () => {
      const result = getWorkspaceStoragePath('/Users/testuser/Library/Application Support/Cursor');
      expect(result).toBe(
        join('/Users/testuser/Library/Application Support/Cursor', 'User', 'workspaceStorage'),
      );
    });
  });
});
