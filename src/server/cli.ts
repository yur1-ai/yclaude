#!/usr/bin/env node
import { createRequire } from 'node:module';
import { serve } from '@hono/node-server';
import { Command } from 'commander';
import open from 'open';
import { loadProviders } from '../providers/registry.js';
import type { ProviderInfo } from '../providers/types.js';
import { createApp } from './server.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../../package.json') as { version: string };

const program = new Command();

program
  .name('yclaude')
  .version(version, '-v, --version')
  .option('-d, --dir <path>', 'custom data directory')
  .option('-p, --port <number>', 'port number', '3000')
  .option('--no-open', 'do not open browser automatically')
  .option('--debug', 'enable debug logging')
  .option('--hide-messages', 'disable conversation text viewing in Chats tab')
  .option('--exclude <providers>', 'exclude providers (comma-separated)')
  .option(
    '--github-token <token>',
    'GitHub token for Gist sharing (alternative to GITHUB_TOKEN env)',
  )
  .parse();

const opts = program.opts<{
  dir: string | undefined;
  port: string;
  open: boolean;
  hideMessages: boolean | undefined;
  debug: boolean | undefined;
  exclude: string | undefined;
  githubToken: string | undefined;
}>();

const port = Number.parseInt(opts.port, 10);
const url = `http://127.0.0.1:${port}`;

// Parse --exclude flag
const exclude = opts.exclude ? opts.exclude.split(',').map((s: string) => s.trim()) : [];

const showMessages = !(opts.hideMessages ?? false);

// Load data from all detected providers via the registry
const { events, providers } = await loadProviders({
  ...(opts.dir !== undefined ? { dir: opts.dir } : {}),
  preserveContent: showMessages,
  ...(opts.debug ? { debug: true } : {}),
  ...(exclude.length > 0 ? { exclude } : {}),
});

// Resolve GitHub token: CLI flag > env var
const githubToken = opts.githubToken ?? process.env.GITHUB_TOKEN;

// Create Hono app with pre-loaded state
const app = createApp({
  events,
  providers,
  version,
  showMessages,
  ...(githubToken ? { githubToken } : {}),
});

/**
 * Renders a compact status icon for a provider based on its status.
 */
function providerStatusLine(p: ProviderInfo): string {
  const icon =
    p.status === 'loaded'
      ? '\x1b[32m✓\x1b[0m' // green checkmark
      : p.status === 'not-found'
        ? '\x1b[90m-\x1b[0m' // gray dash
        : '\x1b[33m!\x1b[0m'; // yellow warning
  const detail =
    p.status === 'loaded'
      ? `${p.eventCount} events`
      : p.status === 'error'
        ? (p.error ?? 'unknown error')
        : 'not installed';
  return `  ${icon} ${p.name}: ${detail}`;
}

// Start server — bind exclusively to 127.0.0.1 (loopback only, never 0.0.0.0)
serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => {
  console.log(`yclaude v${version}`);
  console.log('');
  // Provider status banner
  for (const p of providers) {
    console.log(providerStatusLine(p));
  }
  console.log('');
  console.log(`Local: \x1b[1m${url}\x1b[0m`);
  if (opts.open) {
    console.log('\x1b[32m✓\x1b[0m Opening browser...');
    open(url).catch(() => console.log(`→ Open ${url} in your browser`));
  } else {
    console.log(`→ Open ${url} in your browser`);
  }
  console.log('Press Ctrl+C to stop');
});
