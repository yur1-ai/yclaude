import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { enableDebug, disableDebug, isDebugEnabled, debugLog } from '../shared/debug.js';

describe('debug module', () => {
  beforeEach(() => disableDebug());
  afterEach(() => disableDebug());

  it('is disabled by default', () => {
    expect(isDebugEnabled()).toBe(false);
  });

  it('enables with enableDebug()', () => {
    enableDebug();
    expect(isDebugEnabled()).toBe(true);
  });

  it('debugLog writes to stderr when enabled', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    enableDebug();
    debugLog('test message');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('test message'));
    spy.mockRestore();
  });

  it('debugLog is silent when disabled', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    debugLog('should not appear');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
