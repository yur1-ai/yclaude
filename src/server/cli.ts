#!/usr/bin/env node
import { createRequire } from 'node:module';
import { serve } from '@hono/node-server';
import { Command } from 'commander';
import open from 'open';
import { applyPrivacyFilter, computeCosts, parseAll } from '../index.js';
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
  .option('--show-messages', 'enable conversation text viewing in Chats tab')
  .parse();

const opts = program.opts<{
  dir: string | undefined;
  port: string;
  open: boolean;
  showMessages: boolean | undefined;
}>();

const port = Number.parseInt(opts.port, 10);
const url = `http://127.0.0.1:${port}`;

// Load and process data pipeline
// exactOptionalPropertyTypes: pass dir only when defined (undefined !== omitted under strict TS)
const parseOpts = opts.dir !== undefined ? { dir: opts.dir } : {};
const showMessages = opts.showMessages ?? false;

// When showMessages is enabled, parse with preserveContent to retain message fields
const events = await parseAll(showMessages ? { ...parseOpts, preserveContent: true } : parseOpts);

// Always privacy-filter for existing endpoints (sessions, summary, etc.)
const filtered = applyPrivacyFilter(events);
const costs = computeCosts(filtered);

// Create Hono app with pre-loaded state
// exactOptionalPropertyTypes: only include rawEvents when showMessages is true (undefined !== omitted)
const app = createApp(
  showMessages
    ? { events: filtered, costs, rawEvents: events, showMessages }
    : { events: filtered, costs, showMessages: false },
);

// Start server — bind exclusively to 127.0.0.1 (loopback only, never 0.0.0.0)
serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => {
  console.log(`yclaude v${version}`);
  console.log(`Local: \x1b[1m${url}\x1b[0m`);
  if (opts.open) {
    console.log('\x1b[32m✓\x1b[0m Opening browser...');
    open(url).catch(() => console.log(`→ Open ${url} in your browser`));
  } else {
    console.log(`→ Open ${url} in your browser`);
  }
  console.log('Press Ctrl+C to stop');
});
