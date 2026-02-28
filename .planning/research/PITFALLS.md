# Pitfalls Research

**Domain:** npm-distributed AI coding analytics dashboard (Claude Code usage tracker)
**Researched:** 2026-02-28
**Confidence:** HIGH (verified against ccusage issues, Anthropic official docs, and real-world ecosystem data)

---

## Critical Pitfalls

Mistakes that cause rewrites, lost trust, or product-killing bugs.

### Pitfall 1: Claude Code JSONL Format Is Unstable and Undocumented

**What goes wrong:**
Anthropic treats `~/.claude/projects/**/*.jsonl` as an internal implementation detail, not a public API. The schema has already changed in breaking ways: the data directory moved from `~/.claude` to `~/.config/claude` in v1.0.30 without documentation, new fields like `agentId`, `isSidechain`, and `thinkingMetadata` have been added over time, and the `<persisted-output>` tag wrapping for large tool results caused JSONL files to balloon to 12MB+ and hang on resume (anthropics/claude-code#23948). There is no versioned schema, no migration guide, and no stability guarantee.

**Why it happens:**
Anthropic is iterating rapidly on Claude Code (v2.1.51+ as of Feb 2026). Session JSONL files are an internal persistence format, not a developer-facing API. They optimize for their own use cases, not third-party parsers.

**How to avoid:**
- Parse defensively: every field access should be optional-chained or defaulted. Never assume a field exists.
- Use a schema versioning layer: detect the `version` field in JSONL records (which maps to the Claude Code version that wrote them, e.g., "2.0.75") and route to version-specific parsers.
- Maintain a "known fields" registry. Log unknown fields as telemetry (local-only) to detect format changes proactively.
- Support both `~/.claude/projects/` and `~/.config/claude/projects/` (and any future XDG-compliant path). Check `CLAUDE_CONFIG_DIR` environment variable as override.
- Build integration tests against a corpus of real JSONL files from multiple Claude Code versions. Ship this corpus as test fixtures.
- Consider using ccusage's parser as a reference implementation -- they have already solved many edge cases across 17+ major versions.

**Warning signs:**
- Parsing errors spiking after a Claude Code update
- New fields appearing in JSONL that the parser silently drops
- Token counts that don't match user expectations
- Anthropic releasing a new Claude Code major version

**Phase to address:**
Phase 1 (Local MVP) -- resilient parser must be foundational. This is the single most critical technical risk.

---

### Pitfall 2: Token Usage Data in JSONL Is Unreliable

**What goes wrong:**
The `message.usage` object in assistant-type JSONL records (containing `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`) has documented reliability problems. ccusage issue #866 reports "JSONL usage.input_tokens and usage.output_tokens are unreliable upstream -- ccusage undercounts significantly." Claude Code's own `/cost` command had a bug doubling usage counts (anthropics/claude-code#5904). Stream-JSON mode duplicated token stats 3-8x per message (anthropics/claude-code#6805). The same `cache_read_input_tokens: 11744` appeared 8 times for one message ID in real session files.

**Why it happens:**
Token usage is embedded in the API response from Anthropic and then serialized into JSONL by Claude Code. Bugs in Claude Code's serialization, streaming mode edge cases, and format changes mean the numbers in JSONL are not always the ground truth. There is no separate, authoritative billing ledger accessible to third-party tools.

**How to avoid:**
- Implement deduplication: track `uuid` per message and never count the same message twice. Multiple JSONL lines can reference the same API call.
- Cross-validate: if `usage.input_tokens` is suspiciously high (e.g., > 200K for a normal message), flag it. Use heuristics to detect known duplication patterns.
- Show "estimated" cost prominently in the UI. Never claim "exact" billing accuracy -- the data source does not support it.
- Document known inaccuracies in a user-facing FAQ. Transparency builds trust.
- Watch ccusage's issue tracker as an early-warning system for upstream data quality problems.

**Warning signs:**
- User reports of costs not matching their Anthropic dashboard
- Token counts that seem impossibly high for a session
- Same `uuid` appearing in multiple JSONL lines with different usage numbers

**Phase to address:**
Phase 1 (Local MVP) -- deduplication and estimation disclaimer must ship from day one.

---

### Pitfall 3: Token Pricing Table Goes Stale

**What goes wrong:**
yclaude must maintain a static mapping of model name to pricing (e.g., `claude-sonnet-4.5` -> $3/$15 per MTok). Anthropic has changed pricing multiple times: Opus went from $15/$75 (Opus 4) to $5/$25 (Opus 4.5) to $5/$25 (Opus 4.6), a 67% reduction. Claude 4.6 launched Feb 2026 with its own pricing. Cache token pricing has multipliers (5-min write = 1.25x, 1-hour write = 2x, cache read = 0.1x). Long-context pricing kicks in above 200K input tokens (2x input, 1.5x output for Sonnet). If the pricing table is stale, every cost calculation is wrong, and users lose trust immediately. ccusage had this exact issue: their bundled offline pricing data was missing `claude-opus-4-6` (ccusage#844, Feb 9 2026).

**Why it happens:**
Anthropic releases new models every few months and adjusts pricing with each release. There is no machine-readable pricing API -- the pricing page is HTML. Model names in JSONL records use API identifiers (e.g., `claude-sonnet-4-20250514`) which differ from marketing names. Cache pricing multipliers add another layer of complexity.

**How to avoid:**
- Ship a static pricing table as a JSON file in the package, versioned with the npm release.
- Implement an update mechanism: check a hosted JSON endpoint (e.g., `https://yclaude.dev/api/pricing.json`) for updated pricing. Fall back to bundled data when offline.
- Handle unknown models gracefully: if a model name is not in the pricing table, show token counts without cost (never show $0.00 for non-zero tokens -- that reads as a bug).
- Use model name fuzzy matching: `claude-sonnet-4-20250514` should match the `claude-sonnet-4` pricing entry. Parse the date suffix as a version qualifier.
- Track the full complexity: base input, 5-min cache write (1.25x), 1-hour cache write (2x), cache read (0.1x), output tokens, and long-context premium (2x/1.5x above 200K input).
- Build a pricing admin page (even if just a JSON file edit) so updating pricing is a 5-minute task, not a code change.

**Warning signs:**
- Users seeing "Unknown model" warnings
- Cost totals that seem too high or too low after an Anthropic pricing change
- GitHub issues from users reporting stale prices
- A new Claude model launch by Anthropic (check quarterly)

**Phase to address:**
Phase 1 (Local MVP) for static table, Phase 2 (Cloud & Distribution) for auto-update mechanism.

---

### Pitfall 4: npx Bundle Size and Cold Start Kill First Impressions

**What goes wrong:**
`npx yclaude` is the primary distribution channel. npx downloads the entire package on first run. If the package includes a heavy frontend framework, unminified assets, or too many dependencies, cold start takes 30+ seconds. ccusage proved `npx` works for this audience, but ccusage is a lightweight CLI -- a web dashboard with React/Vue adds significant weight. If first run takes more than 10 seconds including download + parse + serve, users will abandon before seeing value. ccusage users already reported timeout issues with large data directories (~750 files, 4GB) in ccusage#821.

**Why it happens:**
Dashboard tools naturally accumulate frontend dependencies (charting libraries, UI frameworks, date pickers). Developers add devDependencies that leak into the production bundle. The JSONL parser may try to load all files into memory at once.

**How to avoid:**
- Target < 5MB total package size (including all bundled frontend assets). Use esbuild to bundle everything into a single minified file.
- Pre-build frontend assets at publish time -- do not include source maps or dev tooling in the npm package.
- Use `"files"` or `.npmignore` aggressively to exclude tests, docs, source, and development artifacts.
- Stream JSONL parsing: never load all files into memory. Use Node.js readable streams with line-by-line processing.
- Show a loading indicator immediately: serve the web UI shell first, then populate data progressively.
- Benchmark cold start time in CI: `time npx yclaude@latest --help` should complete in under 5 seconds on a clean npm cache.
- Consider lazy-loading heavy chart libraries only when the dashboard tab is actually viewed.

**Warning signs:**
- Package size exceeding 5MB on bundlephobia
- Cold start taking > 10 seconds in CI benchmarks
- Users reporting "nothing happened" after running npx command
- Growing dependency count without auditing transitive deps

**Phase to address:**
Phase 1 (Local MVP) -- bundle discipline must be established from the start. Retrofitting is painful.

---

### Pitfall 5: Privacy Violations Destroy an Analytics Tool

**What goes wrong:**
`~/.claude` contains complete conversation transcripts -- the full text of every user prompt and every assistant response, including code, file contents, and potentially secrets (API keys, passwords, database URLs). If yclaude accidentally exposes this data (through telemetry, error reporting, cloud sync, or even the local web UI being accessible on `0.0.0.0` instead of `127.0.0.1`), it's a catastrophic trust violation. The npm ecosystem saw multiple supply chain attacks in 2025 (s1ngularity embedded data exfiltration in a file named `telemetry.js`; Shai-Hulud compromised 796 packages), so users are hyper-vigilant about tools that touch sensitive data.

**Why it happens:**
Developers add error reporting (Sentry), analytics (Mixpanel), or auto-update checks that inadvertently transmit data. A default Express server binding to `0.0.0.0` instead of `127.0.0.1` exposes the dashboard to the local network. Cloud sync features introduced later may not encrypt data properly.

**How to avoid:**
- Bind the local web server to `127.0.0.1` exclusively. Never `0.0.0.0`.
- Zero telemetry in v1. No error reporting services. No analytics. No network requests whatsoever.
- Add a prominent "Privacy" section to README: "All data stays on your machine. We make zero network requests."
- If/when adding cloud features (Phase 2+), make them explicitly opt-in with clear consent flows.
- Never log or display full conversation content in the dashboard. Show metadata (token counts, models, timestamps) not message text.
- Audit dependencies for network access: run `npm audit` and manually verify no dependency phones home.
- Consider publishing a security policy and inviting community audit.
- Ship with Content-Security-Policy headers that block all external requests from the dashboard frontend.

**Warning signs:**
- Any dependency with network access in the dependency tree
- Server listening on `0.0.0.0`
- User-facing features that display conversation content (even locally -- increases attack surface)
- Error reports mentioning "telemetry" or "analytics"

**Phase to address:**
Phase 1 (Local MVP) -- privacy posture must be iron-clad from launch. It's the core trust proposition.

---

### Pitfall 6: Open Source to Freemium Licensing Trap

**What goes wrong:**
Starting MIT-licensed (maximum adoption) and later wanting to gate cloud/team features behind a paid tier creates a licensing conflict. If the core is MIT, anyone can fork and build their own cloud version. Companies like Redis learned this painfully: moved to SSPL in 2024, faced massive backlash, returned to AGPLv3 in 2025. Choosing the wrong license at launch locks you into a business model -- or forces a controversial relicense.

**Why it happens:**
Founders optimize for adoption first ("just ship MIT, worry about monetization later"). By the time paid features are needed, the codebase is fully MIT and cannot be relicensed without contributor agreement. Competitors fork and compete with your own code.

**How to avoid:**
- Use AGPL-3.0 for the core (viral copyleft discourages cloud competitors from hosting it as a service without contributing back), or use MIT for the open-source CLI/parser but keep cloud features in a separate, proprietary repository from day one.
- The recommended approach for yclaude: **MIT for the open-source local tool** (maximizes adoption, which is the goal for Phase 1-2), with cloud/team features in a **separate closed-source codebase** from the start. This is the "open core" model used successfully by GitLab, Grafana, and others.
- Define the boundary clearly in the architecture: the parser, CLI, and local dashboard are open source. Cloud sync, team management, and benchmarking are proprietary.
- Document the licensing strategy in CONTRIBUTING.md from day one.
- Never accept external contributions to proprietary features -- keep contributor agreements simple.

**Warning signs:**
- Contributors asking about CLA (Contributor License Agreement) -- means you need one
- Competitors forking and adding cloud features
- Community pushback on feature gating decisions

**Phase to address:**
Phase 1 (Local MVP) -- license choice and repo structure must be decided before first public commit.

---

## Dashboard Feature Pitfalls

Pitfalls specific to adding charting, visualization, and session explorer features to the existing React + Tailwind v4 codebase.

### Pitfall 7: Charting Library Colors Break Dark Mode — Hardcoded Hex vs CSS Variables

**What goes wrong:**
Recharts (the recommended library for this stack) renders charts via SVG and accepts color values on individual component props like `<Line stroke="#8884d8" />` and `<Bar fill="#82ca9d" />`. These hardcoded hex values are immune to dark mode CSS class toggling. When the user switches to dark mode, the chart axes, grid lines, and tooltips remain light-themed while the rest of the UI goes dark, creating a jarring mismatch. The existing app uses `bg-white` and `border-slate-200` which flip cleanly with `dark:` utilities, but Recharts prop-based colors do not.

Additionally, Tailwind v4 removed `resolveConfig()` — there is no built-in way to read theme colors in JavaScript. The workaround requires either `getComputedStyle(document.documentElement).getPropertyValue('--color-slate-700')` at runtime or a separate `tailwind-resolver` build step. Neither is obvious, and neither is required in Tailwind v3 projects.

**Why it happens:**
Recharts documentation shows examples with hex strings. Developers copy-paste examples directly. The dark mode breakage is invisible in development if dark mode is not tested.

**How to avoid:**
- Never pass hex literals to Recharts color props. Always use `var(--color-*)` CSS variable references or derive colors from a centralized JS theme token object.
- Create a single `chartTheme.ts` module that reads CSS variables at runtime using `getComputedStyle` and exports a `getChartColors()` function that returns the current light/dark palette. Call it inside a `useMemo` that re-runs when the color scheme changes.
- Define all chart-specific colors in `index.css` under `@theme` so they are available as `--color-chart-primary`, `--color-chart-grid`, etc. This avoids reading Tailwind's generated variables and is portable.
- Test both themes in CI: render the chart component with a `.dark` class on the root element and assert the SVG stroke attributes.

**Warning signs:**
- Any `stroke="#` or `fill="#` in chart component JSX
- No `dark:` variant test for chart pages
- `getComputedStyle` call only in one place but multiple charts use hardcoded colors

**Phase to address:**
Dashboard milestone, Phase 4 (Cost Charts) — establish the chart color pattern before building the first chart, or every subsequent chart will be wrong in dark mode.

---

### Pitfall 8: Date Filter Causes Client-Side N+1 Re-aggregation

**What goes wrong:**
The naive approach to date filtering is: (1) server loads all CostEvents into memory at startup, (2) GET /api/v1/summary returns the raw events array, (3) React frontend applies date filter by calling `.filter(e => e.timestamp >= start && e.timestamp <= end)`, then re-aggregates cost totals, per-model breakdowns, and per-project breakdowns from the filtered array on every render. With 10,000+ events, this is an O(n) computation running synchronously on the UI thread for each filter change. Every chart on the page that subscribes to the date filter context re-computes independently from the raw event array — that's N chart components each doing O(n) work, hence N+1 behavior.

The existing `GET /api/v1/summary` returns a single pre-aggregated object for all-time. This pattern does not extend to filtered queries without server-side aggregation.

**Why it happens:**
The developer sends all events to the frontend ("the client has the data, let it filter"), which feels correct for a local-only tool. The re-aggregation cost is invisible with small datasets. The problem surfaces at scale (heavy Claude Code users accumulate 50k+ events over months).

**How to avoid:**
- Keep aggregation server-side. Extend `GET /api/v1/summary` to accept `?from=ISO8601&to=ISO8601` query params. The Hono server filters the in-memory `costs` array once, aggregates, and returns a pre-computed summary. Clients never receive raw event arrays for analytics endpoints.
- For the time-series chart (cost over time), add a dedicated `GET /api/v1/timeseries?from=&to=&granularity=day|week|month` endpoint that returns bucketed data ready for charting. The server buckets once; the chart plots the result directly without re-processing.
- For session explorer (which legitimately needs per-session data), use paginated endpoints: `GET /api/v1/sessions?from=&to=&page=1&limit=50`. Never return all sessions in one response.
- The React date filter state (a `{from, to}` object stored in Context or URL params) triggers API re-fetches, not client-side filter operations.

**Warning signs:**
- Any `events.filter(...)` or `costs.filter(...)` calls in React component files or hooks
- A single large `events` or `costs` array being fetched from the API
- `useMemo(() => computeCostSummary(events, dateRange), [events, dateRange])` pattern in components
- Dashboard feels sluggish when scrolling through date ranges

**Phase to address:**
Dashboard milestone, Phase 4 (Cost Charts and Filtering) — the API endpoint design must be settled before building chart components.

---

### Pitfall 9: Dark Mode with Tailwind v4 Requires a Different Setup Than v3

**What goes wrong:**
Tailwind v4 replaced `tailwind.config.js` entirely with CSS-first configuration. The v3 pattern of `darkMode: 'class'` in `tailwind.config.js` does not exist in v4. Developers migrating documentation or tutorials written for v3 will add a config file that Tailwind v4 silently ignores, then spend hours debugging why `dark:bg-gray-900` does nothing.

The correct v4 approach requires adding a `@custom-variant` directive to the CSS file (the existing `web/src/index.css` which currently contains only `@import "tailwindcss"`). Without this directive, `dark:` utilities default to `prefers-color-scheme` media queries only — there is no user-toggleable class strategy.

Additionally, the system-aware requirement (dark mode should follow OS preference by default, but allow manual override) requires a three-state toggle (`light | dark | system`) with `localStorage` persistence and a `matchMedia` listener. This is straightforward but has a Flash of Unstyled Content (FOUC) risk: if the theme class is applied by React after mount, the initial render may flash light mode before going dark.

**Why it happens:**
Tailwind v4 is a breaking change from v3. Most tutorials, Stack Overflow answers, and blog posts still document v3 patterns. The project already uses v4 (`tailwindcss: ^4.2.1`) with the `@tailwindcss/vite` plugin but the current `index.css` has no dark mode configuration.

**How to avoid:**
- Add the class-based dark variant to `index.css`:
  ```css
  @import "tailwindcss";
  @custom-variant dark (&:where(.dark, .dark *));
  ```
- Apply the theme class synchronously before React mounts to prevent FOUC. Add a blocking `<script>` tag in `index.html` that reads `localStorage.theme` and sets the `dark` class on `<html>` before the page paints.
- Store theme preference in `localStorage` (`'light'`, `'dark'`, or absent for system). The React toggle component reads from `localStorage` but the initial class application is pre-React.
- Do not use `data-theme` attribute strategy — it requires an additional `@custom-variant` rule and complicates the JS toggle logic without benefit for a simple two-theme system.

**Warning signs:**
- `tailwind.config.js` or `tailwind.config.ts` file with `darkMode: 'class'` (v3 pattern, ignored in v4)
- `dark:` utilities applied in JSX but dark mode toggle never works
- Flash of light mode content visible when loading the page in dark mode
- `document.documentElement.classList.toggle('dark')` called inside a React `useEffect` (too late — causes FOUC)

**Phase to address:**
Dashboard milestone, Phase 5 (Dark Mode) — but the `@custom-variant` line must be added to `index.css` before any `dark:` utilities are written anywhere, or all dark mode styles written before that point will silently do nothing.

---

### Pitfall 10: Activity Heatmap Uses Wrong Day Boundaries Due to UTC/Local Mismatch

**What goes wrong:**
Claude Code stores `timestamp` fields as ISO 8601 strings in UTC (e.g., `"2026-02-28T03:45:00.000Z"`). An activity heatmap groups events by calendar day. If the heatmap bucketing uses UTC day boundaries (`timestamp.slice(0, 10)` or `new Date(timestamp).toISOString().slice(0, 10)`), a user working late at night in UTC-5 will have their 11pm activity attributed to the next day's cell. A user's Monday session ending at 11:30pm EST (04:30am UTC Tuesday) appears in Tuesday's heatmap cell, making the heatmap look wrong.

An additional heatmap pitfall is empty-day display: if days with zero events are not explicitly represented in the data structure, the heatmap library will skip them (showing no cell) or compress the grid, making it impossible to see long idle stretches.

**Why it happens:**
UTC is the right storage format (no timezone ambiguity), but display requires local time. The conversion is a one-liner (`toLocaleDateString`) but is easy to forget when building aggregation logic on the server side, where there is no "local timezone" concept without explicit timezone detection.

**How to avoid:**
- Never bucket heatmap data on the server using UTC dates. Either:
  - Pass the user's IANA timezone in the API request (`?tz=America/New_York`) and bucket server-side with proper timezone conversion using the Node.js `Intl` API (`new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date)` returns `YYYY-MM-DD` in local time), or
  - Return raw timestamps from the API and bucket client-side using `toLocaleDateString('en-CA')` which returns `YYYY-MM-DD` in the user's local timezone automatically.
  - The client-side approach is simpler for a local tool and avoids timezone negotiation.
- Pre-fill empty days: generate the full date range array from `min(eventDates)` to `max(eventDates)` or the selected filter range, then left-join event counts. Days with no events get `count: 0` explicitly.
- Verify with a test case: create an event at `2026-02-28T23:30:00Z` and assert it appears in Feb 28 for a UTC-5 user (not Mar 1).

**Warning signs:**
- Heatmap shows activity shifted by one day vs the user's perception
- Days with zero events are missing from the grid (not just empty-colored)
- Server-side bucketing code using `new Date(ts).toISOString().slice(0, 10)` (UTC-only)
- No timezone parameter in heatmap API request

**Phase to address:**
Dashboard milestone, Phase 6 (Activity Heatmap and Differentiator Features).

---

### Pitfall 11: Session List Becomes Unresponsive with Large Datasets Without Virtualization

**What goes wrong:**
A heavy Claude Code user may have 500-2000 sessions. Rendering all sessions as DOM nodes in a list causes browser jank. React renders all rows, the browser must layout all rows, and scrolling becomes laggy. With session cards that include sparklines or cost indicators, each row has significant render weight.

A secondary pitfall: the choice between pagination and infinite scroll has UX implications. Pagination requires users to click "Next" to find a session from last Tuesday. Infinite scroll with no search makes finding anything beyond recent sessions impractical. Pure virtual scrolling (rendering only visible rows but maintaining logical scroll position) gives the feel of having all data without the DOM cost — but requires knowing the session list height up front, which is non-trivial with variable-height session cards.

**Why it happens:**
The session list starts with a few dozen sessions during development and feels fine. Real users with 6+ months of heavy usage have 500-2000 sessions. The performance cliff is invisible until shipped.

**How to avoid:**
- Use `@tanstack/react-virtual` for the session list (higher weekly downloads than `react-window` as of 2025, better TypeScript support, supports variable-height rows). Do not use react-window — it requires fixed row heights.
- Implement server-side pagination as the fallback: `GET /api/v1/sessions?page=1&limit=50&sortBy=cost&order=desc`. Virtual scroll the current page; load next page when approaching the bottom.
- Add search/filter controls (date range, project, model) that filter server-side before sending to the list. This reduces the rendered set to < 100 items in most real use cases, making virtualization optional.
- For the initial release, 50-item paginated pages with server-side filtering is sufficient. Add virtualization if profiling shows it is needed.

**Warning signs:**
- `sessions.map(s => <SessionCard .../>)` rendering all sessions without virtualization
- Browser DevTools showing > 500 DOM nodes in the session list
- Scroll performance below 30fps in Chrome Performance tab
- Session list component re-rendering on every date filter change because it receives the full unfiltered list

**Phase to address:**
Dashboard milestone, Phase 7 (Session Explorer) — pagination architecture must be settled before building the session list UI.

---

### Pitfall 12: Cache Efficiency Score Double-Counts Tokens

**What goes wrong:**
A "cache efficiency score" measures what fraction of input tokens were served from cache vs billed at full rate. The naive formula is:

```
efficiency = (cacheRead + cacheCreation) / input * 100
```

This double-counts: `input_tokens` in the Anthropic API response already **includes** `cache_creation_input_tokens` and `cache_read_input_tokens`. Dividing the cache subtypes by `input` produces a ratio > 1.0 for cache-heavy sessions, or produces nonsensical numbers when sessions have no caching at all (0/0 → NaN → displayed as "Infinity%" or "NaN%").

The existing `cost/engine.ts` already handles this correctly for cost calculation (`baseInput = max(0, input - cacheCreation - cacheRead)`), but a UI component building a cache efficiency metric from scratch may not follow the same logic.

**Why it happens:**
The Anthropic token usage documentation is ambiguous about whether `input_tokens` is a gross total or net-of-cache figure. The correct interpretation (gross) is not obvious from field names alone. Developers building the efficiency UI independently from the cost engine rediscover this pitfall.

**How to avoid:**
- Define a canonical `CacheEfficiency` computation in the cost module (not in UI components):
  ```typescript
  // cacheRead / grossInput is the "savings rate"
  // grossInput = input (which already includes cacheCreation + cacheRead)
  const cacheHitRate = input > 0 ? cacheRead / input : 0;
  const cacheSavingsRate = input > 0 ? (cacheRead + cacheCreation) / input : 0;
  ```
- Guard against division by zero: return `null` (not 0%) when there are no input tokens. Display `null` as "—" not "0%".
- Add a unit test: given `input=100, cacheCreation=20, cacheRead=30`, assert efficiency = 50% (30 reads / 100 gross input) and savings rate = 50%.
- The UI efficiency display should consume the server-computed metric from `GET /api/v1/summary`, not re-implement the formula.

**Warning signs:**
- Cache efficiency percentage > 100% for any session
- `NaN%` or `Infinity%` appearing in the UI
- Cache efficiency formula living in a React component rather than in the cost module
- No unit test for the efficiency calculation

**Phase to address:**
Dashboard milestone, Phase 4 or Phase 6 (wherever cache efficiency score is introduced as a feature).

---

### Pitfall 13: Humorous Copy Becomes Annoying Through Repetition

**What goes wrong:**
"You burned 847K tokens this week. We don't judge. (We judge a little.)" is funny the first time. After 50 visits, it is irritating. Static humorous copy that appears on every load trains users to mentally skip the entire personality layer — and eventually to resent it. The UX risk is that humor that was a differentiator on the first impression becomes friction for returning users.

A secondary pitfall: humor that obscures the actual metric. "You're basically running a data center out of your laptop 🔥" in place of the actual token count makes the UI feel playful but reduces information density. Power users lose trust in a tool that prioritizes jokes over data.

**Why it happens:**
The copy is written once for the first-run experience without distinguishing between first-visit and repeat-visit states. The humorous copy feels good when the developer writes it (they're not fatigued by it yet). There's no feedback loop until users complain.

**How to avoid:**
- Separate humorous copy from data display: show the data prominently, add the quip as a secondary element below or in a tooltip. "Total: $47.23" is the headline; "(that's 47 fancy coffees you'll never drink)" is the footnote.
- Use a pool of rotating quips rather than one static string per metric. Store them in a `copy.ts` file with a `getQuip(category: string, value: number, seed?: string)` function. Seed with the current week number for weekly consistency.
- Reserve the most premium humor for milestone moments (first $1 spent, first $100 spent, first 1M tokens). These fire once and feel like Easter eggs, not wallpaper.
- Add a way to dismiss or reduce personality in settings. Even if 90% of users never use it, the 10% who want clean data mode will appreciate the option.
- Never use humor to substitute for empty states. An empty state with only a joke and no actionable guidance is a UX failure.

**Warning signs:**
- Same quip appearing on every page load
- Humorous copy rendering before or over the actual data value
- No `copy.ts` or equivalent centralization of copy strings
- Copy strings hardcoded directly in JSX components
- No mechanism to display different copy on repeat visits

**Phase to address:**
Dashboard milestone (any phase introducing personality copy) — establish the copy rotation system before writing the first quip, or refactoring 20 components later is painful.

---

### Pitfall 14: Global Date Filter State Without URL Sync Breaks Shareability and Navigation

**What goes wrong:**
The date range filter ("Last 7 days", "Last 30 days", "Custom: Jan 1 - Feb 28") is a global state that affects every chart and list on the dashboard. If stored only in React Context or component state, it resets to the default on every page reload and cannot be bookmarked or shared. This is a significant UX regression compared to every analytics tool users are familiar with (Google Analytics, Grafana, etc.), where the date range persists in the URL.

The secondary pitfall is over-engineering: adding Redux or Zustand for a single piece of state (the date range) is unnecessary complexity for this codebase. Neither library is currently a dependency, and adding a 50KB state management library for one filter is tech debt.

**Why it happens:**
React Context is the obvious first choice for global state. URL sync is an afterthought. The limitation only becomes apparent when a user tries to share a view or bookmark a date range.

**How to avoid:**
- Store the date filter in URL search params using React Router v7's `useSearchParams`. The hash router already in use (`createHashRouter`) supports search params — the URL becomes `/#/?from=2026-02-01&to=2026-02-28`.
- Use a thin custom hook (`useDateFilter`) that reads/writes search params and provides a clean API (`{ from, to, setRange }`). Components never interact with `useSearchParams` directly.
- For date range presets ("Last 7 days"), store the preset key in the URL, not the resolved dates. The hook resolves preset keys to actual dates at read time, so "Last 7 days" always means the last 7 days from today, not from when the URL was created.
- Do not add Redux or Zustand. Context is appropriate for derived UI state (theme toggle, sidebar open/closed). URL params are appropriate for filter state that defines what data is shown.

**Warning signs:**
- Date filter state in `useState` or `createContext` at the App level
- Refreshing the page resets the date filter
- Zustand or Redux appearing in `package.json` for the web package
- Multiple components each managing their own date range state instead of sharing one source

**Phase to address:**
Dashboard milestone, Phase 4 (Cost Charts and Filtering) — the URL param approach must be established with the first filter before any charts are built against Context state.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded model pricing in source code | Quick to implement | Every price change requires a code change, rebuild, and npm publish | Never -- use a separate JSON data file from day one |
| Loading all JSONL into memory | Simple parsing logic | Crashes on users with 4GB+ of JSONL data (ccusage#821 timeout) | Only for MVP prototype, must migrate to streaming within weeks |
| Single monolithic `index.js` | Fast to write | Impossible to separate CLI/parser/dashboard for cloud reuse | Never -- module boundaries from day one |
| `JSON.parse()` without try/catch per line | Cleaner code | One malformed line crashes the entire parser, losing all data | Never -- JSONL is line-independent by design, always wrap per-line |
| Shipping source maps in npm package | Easier debugging | Doubles package size, exposes source code structure | Only during private beta, strip before public launch |
| Using `express` for local server | Familiar API | 2MB+ of dependencies for serving static files; use `node:http` or `fastify` | Acceptable if already in the dependency tree for other reasons |
| Storing parsed data in a global variable | Easy access from anywhere | Memory leak, no way to refresh, blocks multi-project support | Only for initial prototype |
| Client-side date filter aggregation | Simple React code | O(n * chart_count) re-computation on filter change; freezes UI at 10k+ events | Never for aggregation; client-side only acceptable for presentation-layer transforms |
| Hardcoded hex colors in Recharts props | Copy-paste from docs | Immune to dark mode; requires finding and replacing every `stroke="#..."` | Never -- define a `chartTheme.ts` before writing the first chart |
| Static humorous copy strings in JSX | Fast first-pass | Annoying on repeat visits; impossible to rotate without touching every component | Only for a single-use prototype; centralize copy before shipping |

## Integration Gotchas

Common mistakes when connecting to external services or data sources.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `~/.claude` directory | Hardcoding `~/.claude` path | Check `~/.config/claude`, `~/.claude`, and `CLAUDE_CONFIG_DIR` in that order. Support `--dir` override. |
| JSONL file reading | Using `fs.readFileSync` on all files | Use `fs.createReadStream` + `readline` interface for streaming. Files can be 12MB+ (anthropics/claude-code#23948). |
| Model name matching | Exact string match on model name | Parse model identifiers like `claude-sonnet-4-20250514` by stripping date suffixes; match against a base model table |
| Cache token types | Treating all input tokens the same | Distinguish `input_tokens`, `cache_creation_input_tokens` (5-min write), `cache_read_input_tokens`, and `cache_creation.ephemeral_{5m,1h}_input_tokens`. Each has different pricing. |
| Project slug decoding | Using the raw slug as the project name | Decode by replacing leading dash and internal dashes with `/` to reconstruct the original path (e.g., `-Users-alex-work-myapp` -> `/Users/alex/work/myapp`) |
| Session identification | Treating each JSONL file as one session | Multiple files can share a `sessionId`. Sidechain agents (`isSidechain: true`) share the parent's `sessionId`. Aggregate by `sessionId`, not by file. |
| Sub-agent token counting | Ignoring `agentId` field | Sub-agent transcripts are stored separately as `todos/{sessionId}-agent-{agentId}.json`. Their token usage must be included in session totals or you undercount significantly. |
| Browser auto-open | Using `open` package to launch browser | Use platform-specific commands (`open` on macOS, `xdg-open` on Linux, `start` on Windows). The `open` package adds 1MB+ of dependencies. |
| Recharts + Tailwind v4 | Passing Tailwind class names as `stroke`/`fill` props | Recharts SVG props do not understand Tailwind classes. Use `var(--color-*)` CSS variable strings or a `getChartColors()` JS function. |
| Tailwind v4 dark mode | Adding `darkMode: 'class'` to `tailwind.config.js` | No config file in v4. Add `@custom-variant dark (&:where(.dark, .dark *));` to `index.css`. |
| Heatmap timezone | `new Date(ts).toISOString().slice(0, 10)` for day bucketing | Use `new Intl.DateTimeFormat('en-CA', { timeZone: userTz }).format(new Date(ts))` or `date.toLocaleDateString('en-CA')` client-side. |
| Session list at scale | `sessions.map(s => <SessionCard />)` for all sessions | Use `@tanstack/react-virtual` or paginate at `GET /api/v1/sessions?page=N&limit=50`. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all JSONL files synchronously at startup | Dashboard takes 30+ seconds to load | Parse files in parallel with streaming; show progressive results | > 100 JSONL files or > 500MB total data |
| Unindexed date range filtering | Date filter takes seconds to apply | Pre-compute a time-series index during initial parse; cache it | > 10,000 messages across all sessions |
| Re-parsing on every page navigation | Each dashboard tab triggers full re-parse | Parse once at startup, hold aggregated data in memory, serve from cache | Any dataset beyond trivial |
| Rendering all data points in charts | Browser tab freezes, chart library OOM | Downsample data: show daily aggregates for ranges > 30 days, hourly for < 30 days | > 1,000 data points in a single chart |
| Watching `~/.claude` with `fs.watch` for live updates | High CPU usage, duplicate events, platform-specific bugs | Use `chokidar` with debouncing, or skip live-watching in v1 (require manual refresh) | Always problematic on macOS (FSEvents quirks) |
| Storing computed dashboard state in the server | Memory grows with each connected tab | Compute on the client side; server only serves raw aggregated JSON | > 5 concurrent browser tabs |
| Sending full `CostEvent[]` array to React frontend | Large JSON transfer on every filter change; client re-aggregates | Server aggregates on query params; returns summary objects, not raw events | > 5,000 events (typically after 2-3 months of heavy Claude Code use) |
| All session cards rendered simultaneously | 300-500ms render, janky scroll | Virtualize with `@tanstack/react-virtual` or paginate; render only visible rows | > 100 sessions in the list |
| Single tooltip component re-rendering all chart data | Chart tooltip causes full re-render of parent | Memoize chart data with `useMemo`; use `React.memo` on chart wrapper components | > 50 data points with rapid mouse movement |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Serving dashboard on `0.0.0.0` | Anyone on local network can see your AI coding conversations and costs | Bind exclusively to `127.0.0.1`. Reject this in code review forever. |
| No authentication on local server | Browser extensions or malicious scripts could query `localhost:PORT` for data | Add a random auth token to the URL (e.g., `localhost:3456?token=abc123`) generated at startup |
| Displaying full conversation content | Expands attack surface; if dashboard is somehow exposed, all code/secrets visible | Show only metadata (token counts, timestamps, models). Conversation content viewing should be an explicit opt-in. |
| Including user paths in error messages | Leaks filesystem structure if error logs are shared | Sanitize all paths in error output; replace home directory with `~` |
| Shipping with `eval()` or dynamic imports based on JSONL content | Malicious JSONL could execute code | Never evaluate JSONL content as code. Parse as pure data only. |
| Using `http` without CORS restrictions | Cross-origin requests from malicious pages can steal dashboard data | Set strict CORS headers: `Access-Control-Allow-Origin: null` (or specific localhost origin) |
| npm postinstall scripts | Supply chain vector -- users inspect these for malicious behavior | Avoid postinstall scripts entirely. If needed, make them auditable and minimal. |

## UX Pitfalls

Common user experience mistakes in this analytics dashboard domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing $0.00 for unknown models | Users think the tool is broken | Show token counts with "pricing unavailable for [model]" message and a link to submit pricing data |
| Cost displayed without date context | "You spent $47" is meaningless without knowing the time range | Always show cost with explicit date range: "You spent $47 this week (Feb 17-23)" |
| No explanation of cache token types | Users confused by "cache read" vs "cache write" pricing differences | Add inline tooltips: "Cache reads are 90% cheaper than base input tokens" |
| Requiring CLI flags for basic usage | Users run `npx yclaude` and nothing happens because they need `--dir` | Auto-detect `~/.claude` and `~/.config/claude`. Only require `--dir` for non-standard locations |
| Humorous copy that obscures actual data | Users can't find the number they need because it's buried in a joke | Lead with the data, follow with humor. "Total: $47.23 -- that's 47 fancy coffees you'll never drink." |
| Dashboard shows "No data" without guidance | User doesn't understand why; gives up | Show a specific diagnostic: "Checked ~/.config/claude/projects/ -- found 0 JSONL files. Is Claude Code installed? See troubleshooting." |
| Slow initial load with no feedback | User thinks the command failed | Show a CLI spinner immediately: "Parsing 847 session files..." with a progress count |
| Date filter resetting on page refresh | Users lose their current view; confusing if they shared a link | Store date filter in URL search params so state persists and is shareable |
| Dark mode flash on initial load | Jarring white flash before dark mode activates | Apply `.dark` class synchronously before React mounts via a blocking `<script>` in `index.html` |
| Heatmap activity off by one day | Users notice their late-night sessions appear on the wrong day | Use local timezone bucketing; never UTC for calendar display |
| Cache efficiency showing "NaN%" | Erodes trust in all other metrics | Guard against zero-denominator; display "—" for sessions with no input tokens |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **JSONL Parser:** Often missing handling for `<persisted-output>` wrapped lines that inflate file sizes to 12MB+ -- verify parser handles or skips these gracefully
- [ ] **Cost Calculator:** Often missing cache token type differentiation -- verify that 5-min cache write, 1-hour cache write, and cache read tokens use different price multipliers (1.25x, 2x, 0.1x respectively)
- [ ] **Cost Calculator:** Often missing long-context pricing tier -- verify that sessions with > 200K input tokens use premium pricing (2x input, 1.5x output for Sonnet models)
- [ ] **Project Detection:** Often missing the `~/.config/claude` path -- verify both legacy and current directories are checked
- [ ] **Session Grouping:** Often missing sidechain agent aggregation -- verify that `isSidechain: true` messages are rolled up into parent session totals
- [ ] **Date Filtering:** Often missing timezone handling -- verify that UTC timestamps from JSONL are converted to user's local timezone for filtering and heatmap display
- [ ] **Model Name Resolution:** Often missing date-suffixed model names -- verify `claude-sonnet-4-20250514` resolves to `claude-sonnet-4` pricing
- [ ] **Error Handling:** Often missing graceful degradation for corrupted JSONL lines -- verify one bad line doesn't crash the entire parse
- [ ] **CLI Help:** Often missing `--version` and `--help` flags -- npm convention, users expect them
- [ ] **Port Conflict:** Often missing port-in-use handling -- verify `--port` with fallback to next available port if default is taken
- [ ] **Dark Mode Setup:** Verify `@custom-variant dark (&:where(.dark, .dark *));` is in `index.css` -- Tailwind v4 default is media-only, not class-based
- [ ] **Dark Mode FOUC:** Verify a blocking `<script>` in `index.html` applies `.dark` class before React mounts -- React `useEffect` is too late
- [ ] **Chart Colors:** Verify no `stroke="#..."` or `fill="#..."` hex literals in any Recharts component -- all chart colors must use CSS variables or a theme object
- [ ] **Cache Efficiency:** Verify efficiency formula uses `cacheRead / input` not `cacheRead / (input - cacheRead)` -- gross denominator, not net
- [ ] **Session List:** Verify session list renders only visible rows (virtualized) or uses pagination -- never renders all sessions as DOM nodes
- [ ] **Heatmap Empty Days:** Verify days with zero events are present in the data as `{ date, count: 0 }` entries -- missing days collapse the grid
- [ ] **Date Filter URL Sync:** Verify date filter survives page refresh -- if it resets, it's in component state, not URL params
- [ ] **Personality Copy Rotation:** Verify at least 5 quips per metric -- single static quips become irritating after 3 visits

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| JSONL format breaking change | MEDIUM | 1. Pin ccusage parser as reference 2. Add failing test case 3. Update parser with version detection 4. Publish patch release within 48 hours |
| Pricing table stale after model launch | LOW | 1. Update pricing JSON file 2. Publish patch release 3. If auto-update endpoint exists, update server-side immediately |
| npx bundle too large (> 10MB) | MEDIUM | 1. Audit with `npm pack --dry-run` 2. Add `.npmignore` rules 3. Switch to esbuild bundling 4. Remove unused dependencies |
| Privacy incident (data leak) | HIGH | 1. Publish incident report immediately 2. Identify and patch the vector 3. Publish patch release 4. May require full security audit -- reputation damage is permanent |
| Token count mismatch with upstream | LOW | 1. Document known upstream issues 2. Add disclaimer to UI 3. Link to relevant Claude Code GitHub issues 4. Implement deduplication heuristics |
| License dispute with forker | HIGH | 1. Consult legal counsel 2. If MIT, limited recourse -- fork is legal 3. If AGPL, enforce compliance 4. Compete on execution, not legal threats |
| JSONL files too large to parse (> 1GB single file) | MEDIUM | 1. Switch to streaming parser if not already 2. Add `maxLineLength` safety limit 3. Skip lines exceeding threshold with warning |
| Charts broken in dark mode (hex colors) | MEDIUM | 1. Extract all hex literals to `chartTheme.ts` 2. Replace with CSS variable references 3. Run visual regression tests in both themes |
| Client-side aggregation is slow (N+1 problem) | HIGH | 1. Add server-side aggregation endpoints with date params 2. Update all chart data hooks to call new endpoints 3. Remove raw event arrays from API responses |
| Heatmap showing wrong days (UTC mismatch) | LOW | 1. Add `tz` param to heatmap API endpoint 2. Switch bucketing to `Intl.DateTimeFormat` 3. Add test for UTC-5 edge case |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| JSONL format instability | Phase 1 (Local MVP) | Integration tests pass against JSONL corpus from 3+ Claude Code versions |
| Token usage data unreliability | Phase 1 (Local MVP) | Deduplication logic tested; UI shows "estimated" label on costs |
| Pricing table staleness | Phase 1 (static table), Phase 2 (auto-update) | Unknown model names display gracefully; pricing JSON is separate from code |
| npx bundle size | Phase 1 (Local MVP) | CI check: `npm pack` size < 5MB; cold start benchmark < 10s |
| Privacy violations | Phase 1 (Local MVP) | Server binds to 127.0.0.1 only; zero network requests verified; CSP headers set |
| Licensing trap | Phase 1 (pre-launch) | LICENSE file committed; cloud/team code in separate repository or directory with proprietary license |
| File System Access API (browser) | Phase 2 (Cloud) | Fallback to file upload for Firefox/Safari users; feature detection at runtime |
| Local-to-cloud data migration | Phase 2 (Cloud) | Explicit opt-in consent flow; data encrypted in transit and at rest; no conversation content uploaded by default |
| Open source competitors forking | Phase 2-3 | Differentiation through UX, humor, cloud features, and benchmarking data (not features alone) |
| Large dataset performance | Phase 1 (Local MVP) | Streaming parser tested against 4GB dataset; progressive loading in dashboard |
| Chart dark mode (hex colors) | Dashboard milestone, Phase 4 (Cost Charts) | Visual tests in both light and dark mode; no hex literals in chart component props |
| Date filter N+1 re-aggregation | Dashboard milestone, Phase 4 (Cost Charts) | All chart data loaded via API with date params; no `events.filter()` in React components |
| Tailwind v4 dark mode setup | Dashboard milestone, Phase 5 (Dark Mode) | `@custom-variant` in `index.css`; FOUC test; three-state toggle works |
| Heatmap UTC/local timezone mismatch | Dashboard milestone, Phase 6 (Heatmap) | Unit test: event at 11pm EST appears on correct calendar day; empty days rendered as zeroes |
| Session list performance | Dashboard milestone, Phase 7 (Session Explorer) | Session list with 2000 sessions renders in < 100ms; scroll at 60fps |
| Cache efficiency double-counting | Dashboard milestone, Phase 6 (Differentiator Features) | Unit test: `input=100, cacheRead=30` yields 30% efficiency, not > 100% |
| Humorous copy fatigue | Dashboard milestone (any phase with copy) | Quips pooled in `copy.ts`; milestone-triggered quips fire once; dismiss/reduce option exists |
| Date filter not URL-synced | Dashboard milestone, Phase 4 (Cost Charts) | Date filter survives page refresh; filter state visible in hash URL |

## Sources

- [Anthropic Official Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- HIGH confidence, verified Feb 2026
- [ccusage GitHub Issues](https://github.com/ryoppippi/ccusage/issues) -- HIGH confidence, real-world issues from the leading competitor
  - [#866: JSONL usage unreliable upstream](https://github.com/ryoppippi/ccusage/issues/866)
  - [#844: Missing claude-opus-4-6 pricing](https://github.com/ryoppippi/ccusage/issues/844)
  - [#821: Timeout with large data directories](https://github.com/ryoppippi/ccusage/issues/821)
- [anthropics/claude-code#23948: persisted-output JSONL bloat](https://github.com/anthropics/claude-code/issues/23948) -- HIGH confidence
- [anthropics/claude-code#5904: /cost doubles usage](https://github.com/anthropics/claude-code/issues/5904) -- HIGH confidence
- [anthropics/claude-code#6805: Stream-JSON token duplication](https://github.com/anthropics/claude-code/issues/6805) -- HIGH confidence
- [anthropics/claude-code#28927: Silent billing change](https://github.com/anthropics/claude-code/issues/28927) -- HIGH confidence
- [Claude Code JSONL Data Structures Gist](https://gist.github.com/samkeen/dc6a9771a78d1ecee7eb9ec1307f1b52) -- MEDIUM confidence (community-maintained)
- [ccusage Directory Detection Guide](https://ccusage.com/guide/directory-detection) -- HIGH confidence
- [File System Access API - Can I Use](https://caniuse.com/native-filesystem-api) -- HIGH confidence (Firefox/Safari do not support it)
- [npm/cli#7295: npx slow for cached packages](https://github.com/npm/cli/issues/7295) -- MEDIUM confidence
- [FOSS Force: Open Source vs Freemium](https://fossforce.com/2025/11/ten-reasons-and-five-exceptions-to-choose-open-source-over-freemium/) -- MEDIUM confidence
- [TermsFeed: Dual Licensing](https://www.termsfeed.com/blog/dual-license-open-source-commercial/) -- MEDIUM confidence
- [Snyk: npm Security Best Practices](https://snyk.io/articles/npm-security-best-practices-shai-hulud-attack/) -- MEDIUM confidence (2025 supply chain attacks context)
- [Tailwind CSS v4 Dark Mode Docs](https://tailwindcss.com/docs/dark-mode) -- HIGH confidence, official docs, verified Feb 2026
- [Tailwind v4 resolveConfig Discussion](https://github.com/tailwindlabs/tailwindcss/discussions/14764) -- HIGH confidence, confirmed by Adam Wathan that resolveConfig will not return
- [Tailwind v4 dark variant broken cases](https://github.com/tailwindlabs/tailwindcss/discussions/16070) -- MEDIUM confidence
- [TanStack Virtual vs react-window comparison](https://borstch.com/blog/development/comparing-tanstack-virtual-with-react-window-which-one-should-you-choose) -- MEDIUM confidence
- [TanStack Virtual weekly downloads](https://npmtrends.com/@tanstack/react-virtual-vs-react-virtualized-vs-react-window) -- HIGH confidence (npm trends data)
- [Recharts + CSS variables for dark mode (Reshaped)](https://www.reshaped.so/docs/getting-started/guidelines/recharts) -- MEDIUM confidence
- [React Router useSearchParams docs](https://reactrouter.com/api/hooks/useSearchParams) -- HIGH confidence, official docs
- [Update search params re-render issue (React Router)](https://github.com/remix-run/react-router/discussions/9851) -- MEDIUM confidence
- [UX humor in design — The Dexign Studio](https://blog.thedexignstudio.com/role-humor-ux-design/) -- MEDIUM confidence
- [NNG on tone dimensions in UX](https://www.nngroup.com/articles/tone-of-voice-dimensions/) -- HIGH confidence (cited by multiple sources)
- [LLM cache efficiency metric formula](https://artificialanalysis.ai/models/caching) -- MEDIUM confidence

---
*Pitfalls research for: yclaude (AI coding analytics dashboard — dashboard milestone)*
*Researched: 2026-02-28*
