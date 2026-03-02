# yclaude

**Find out why Claude keeps spending your tokens on that one recursive function.**

Local-first analytics dashboard for Claude Code usage. See your spend, session history, model mix, and activity patterns — zero telemetry, runs entirely on your machine.

[![npm version](https://img.shields.io/npm/v/yclaude.svg)](https://www.npmjs.com/package/yclaude)
[![CI](https://github.com/yur1-ai/yclaude/actions/workflows/ci.yml/badge.svg)](https://github.com/yur1-ai/yclaude/actions/workflows/ci.yml)
[![Node >=24](https://img.shields.io/node/v/yclaude.svg)](https://www.npmjs.com/package/yclaude)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Install

```bash
npx yclaude
```

Works without installing anything — just run it. Add `-g` for a permanent install if you prefer:

```bash
npm install -g yclaude
yclaude
```

---

## Features

### Overview

Spend at a glance. Total cost, cache efficiency, and a GitHub-style activity heatmap showing when you were in the trenches. Supports day / week / month / custom date ranges.

### Cost Over Time

Bar chart of API spend across your chosen time range. Switch between 24h (hourly), day, week, and month views to spot runaway sessions or quiet periods.

### Model Breakdown

Donut chart + sortable table showing cost and token usage by model. Instantly see which model is responsible for the majority of your spend.

### Session Explorer

Paginated list of all coding sessions with cost, token counts, and duration. Filter by project or branch. Subagent sessions are labeled — so you know when Claude called Claude.

### Session Detail

Drill into any session for a per-turn token breakdown and cost timeline. See exactly which turn in a conversation ballooned the bill.

### Activity Heatmap

GitHub-style contribution graph of your Claude sessions by day. Daily intensity is color-coded; 90th-percentile days are annotated so you can find your most active streaks.

### Dark Mode

System-aware dark mode that follows your OS preference and persists across reloads. Manual toggle available — because sometimes you just want to stare into the void.

---

## Options

```
yclaude [options]

Options:
  -d, --dir <path>     Custom data directory (default: ~/.claude)
  -p, --port <number>  Port number (default: 3000)
  --no-open            Do not open browser automatically
  --debug              Enable debug logging
  -v, --version        Output the version number
  -h, --help           Display help
```

---

## How It Works

- Reads JSONL usage logs from `~/.claude/projects/**/*.jsonl` (Claude Code writes these automatically)
- All processing happens locally — no data leaves your machine
- Runs a server bound to `127.0.0.1` only — not accessible from the network
- No accounts, no API keys, no cloud sync

---

## Requirements

- Node.js >= 24

---

## License

MIT
