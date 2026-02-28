import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { enableDebug, disableDebug, isDebugEnabled, debugLog } from '../../shared/debug.js';

// Reset debug state between tests
beforeEach(() => {
  disableDebug();
});

afterEach(() => {
  disableDebug();
});

describe('debug module', () => {
  describe('enableDebug / disableDebug / isDebugEnabled', () => {
    it('is disabled by default', () => {
      expect(isDebugEnabled()).toBe(false);
    });

    it('enableDebug() sets flag to true', () => {
      enableDebug();
      expect(isDebugEnabled()).toBe(true);
    });

    it('disableDebug() sets flag to false', () => {
      enableDebug();
      disableDebug();
      expect(isDebugEnabled()).toBe(false);
    });
  });

  describe('debugLog()', () => {
    it('writes to stderr when debug is enabled', () => {
      enableDebug();
      const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      debugLog('hello world');
      expect(spy).toHaveBeenCalled();
      const call = spy.mock.calls[0][0] as string;
      expect(call).toContain('[debug]');
      expect(call).toContain('hello world');
      spy.mockRestore();
    });

    it('is completely silent when debug is disabled', () => {
      disableDebug();
      const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      debugLog('should not appear');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('outputs extra args as JSON when provided', () => {
      enableDebug();
      const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      debugLog('message', { key: 'value' });
      // Should have been called at least twice (message + args)
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
      spy.mockRestore();
    });
  });
});
