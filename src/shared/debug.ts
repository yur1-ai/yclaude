// Global debug flag — enabled by --debug CLI arg or YCLAUDE_DEBUG=1 env var.
// Phase 3 (CLI) calls enableDebug() when parsing the --debug flag.
// Module initializes from process.argv so tests can also pass --debug.
let debugEnabled: boolean = process.argv.includes('--debug') || process.env.YCLAUDE_DEBUG === '1';

export function enableDebug(): void {
  debugEnabled = true;
}

export function disableDebug(): void {
  debugEnabled = false;
}

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

export function debugLog(message: string, ...args: unknown[]): void {
  if (!debugEnabled) return;
  process.stderr.write(`[debug] ${message}\n`);
  if (args.length > 0) {
    process.stderr.write(`${JSON.stringify(args, null, 2)}\n`);
  }
}
