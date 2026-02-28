import { describe, it, expect } from 'vitest';
import { Command } from 'commander';

/**
 * Parse CLI args using a standalone Commander instance that mirrors cli.ts options.
 * This avoids importing cli.ts directly (which has side effects via program.parse()).
 */
function parseCLIArgs(argv: string[]): { open: boolean; port: string; dir: string | undefined } {
  const program = new Command();
  program
    .name('yclaude')
    .version('0.1.0', '-v, --version')
    .option('-d, --dir <path>', 'custom data directory')
    .option('-p, --port <number>', 'port number', '3000')
    .option('--no-open', 'do not open browser automatically');

  // Parse with process name and script name prepended (Commander convention)
  program.parse(['node', 'yclaude', ...argv]);
  return program.opts();
}

describe('CLI option parsing', () => {
  it('opts.open defaults to true when --no-open is not passed', () => {
    const opts = parseCLIArgs([]);
    expect(opts.open).toBe(true);
  });

  it('opts.open is false when --no-open is passed', () => {
    const opts = parseCLIArgs(['--no-open']);
    expect(opts.open).toBe(false);
  });

  it('opts.port defaults to "3000"', () => {
    const opts = parseCLIArgs([]);
    expect(opts.port).toBe('3000');
  });

  it('opts.port reflects the given value when --port is passed', () => {
    const opts = parseCLIArgs(['--port', '4000']);
    expect(opts.port).toBe('4000');
  });

  it('opts.dir is undefined when --dir is not passed', () => {
    const opts = parseCLIArgs([]);
    expect(opts.dir).toBeUndefined();
  });

  it('opts.dir is the given path when --dir is passed', () => {
    const opts = parseCLIArgs(['--dir', '/custom/path']);
    expect(opts.dir).toBe('/custom/path');
  });
});
