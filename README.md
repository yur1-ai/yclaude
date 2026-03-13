# yclaude

**Find out why Claude keeps spending your tokens on that one recursive function.**

Local-first analytics dashboard for AI coding assistants. See your spend, session history, model mix, and activity patterns — zero telemetry, runs entirely on your machine.

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

## Supported Providers

yclaude auto-detects and loads data from multiple AI coding assistants:

| Provider | Data Source | Features |
|----------|-----------|----------|
| **Claude Code** | `~/.claude/projects/**/*.jsonl` | Full analytics, projects, subagent tracking, cache metrics |
| **Cursor** | Local SQLite databases | Sessions, models, composer/edit session types |
| **OpenCode** | Local usage logs | Sessions, models |

When multiple providers are detected, a tab bar appears in the sidebar. Switch between providers or use the **All** view to see aggregated data across all of them.

Use `--exclude` to skip providers you don't need:

```bash
yclaude --exclude cursor,opencode
```

---

## Features

### Overview Dashboard

Spend at a glance. Total cost, period cost with trend indicator (% change vs prior period), and a GitHub-style activity heatmap showing when you were in the trenches.

- **Stat cards** — all-time cost, period cost, subagent cost share
- **Cost chart** — stacked area chart (All view) or bar chart (single provider) with hourly/daily/weekly/monthly buckets
- **Cache efficiency** — Claude-specific cache hit ratio metrics
- **Activity heatmap** — year-selectable calendar; per-provider breakdown in All view
- **Date range picker** — presets (24h, 48h, 7d, 30d, 90d, All time) or custom calendar range

### Model Breakdown

Interactive donut chart + sortable table showing cost, token usage, and event count by model. Click a model in the chart to filter. Warns if unrecognized models are present (which affects cost accuracy).

### Projects

Sortable table of cost and token usage by project. Shows which codebases are burning through your budget. Available for Claude Code and in All view.

### Session Explorer

Paginated, sortable list of all coding sessions with cost, token counts, duration, and git branch. Filter by project, branch, or date range. Cursor sessions can also be filtered by type (Composer vs Edit). Subagent sessions are labeled — so you know when Claude called Claude.

### Session Detail

Drill into any session for:
- **Cumulative cost chart** — line chart showing cost progression per turn
- **Per-turn table** — model, tokens (input/output/cache), and cost for every API call
- **Subagent breakdown** — separate main thread vs subagent costs when applicable

### Conversation Viewer

Read full conversation threads with syntax-highlighted markdown rendering. Requires the `--show-messages` flag (data stays local).

- **Chat list** — browse conversations filtered by project, date, or full-text search with highlighted matches
- **Chat detail** — threaded view with user/assistant bubbles, tool call blocks (expandable), and skill invocation separators
- **Clean / Raw toggle** — clean mode strips system metadata and collapses skill prompts; raw mode shows everything verbatim

### Share & Export

Share any conversation as clean, readable markdown:

| Action | How it works |
|--------|-------------|
| **Copy as Markdown** | One click — formatted markdown on your clipboard |
| **Download as Markdown** | Downloads a `.md` file locally |
| **Share as Gist** | Creates a secret GitHub Gist and opens it in a new tab |

Gist sharing tries `gh` CLI first, then falls back to the GitHub API (via `--github-token` or `GITHUB_TOKEN` env var), then falls back to clipboard + opening gist.github.com for manual paste.

The exported markdown includes a metadata table, message threading, tool calls in collapsible `<details>` blocks, and preformatted output (test results, ASCII tables) properly fenced.

### Dark Mode

System-aware dark mode that follows your OS preference and persists across reloads. Manual toggle available — because sometimes you just want to stare into the void.

---

## Options

```
yclaude [options]

Options:
  -d, --dir <path>             Custom data directory (default: ~/.claude)
  -p, --port <number>          Port number (default: 3000)
  --no-open                    Do not open browser automatically
  --debug                      Enable debug logging
  --show-messages              Enable conversation viewing in Chats tab
  --exclude <providers>        Exclude providers (comma-separated)
  --github-token <token>       GitHub token for Gist sharing (alternative to GITHUB_TOKEN env)
  -v, --version                Output the version number
  -h, --help                   Display help
```

---

## How It Works

- Reads local usage data from each provider's data directory (JSONL logs, SQLite databases)
- All processing happens locally — no data leaves your machine
- Runs a server bound to `127.0.0.1` only — not accessible from the network
- No accounts, no API keys, no cloud sync
- Conversation content (`--show-messages`) is never persisted by yclaude — it reads on-the-fly from provider logs

---

## Requirements

- Node.js >= 24

---

## License

MIT
