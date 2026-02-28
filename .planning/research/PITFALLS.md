# Pitfalls Research

**Domain:** npm-distributed AI coding analytics dashboard (Claude Code usage tracker)
**Researched:** 2026-02-28
**Confidence:** HIGH (verified against ccusage issues, Anthropic official docs, and real-world ecosystem data)

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

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **JSONL Parser:** Often missing handling for `<persisted-output>` wrapped lines that inflate file sizes to 12MB+ -- verify parser handles or skips these gracefully
- [ ] **Cost Calculator:** Often missing cache token type differentiation -- verify that 5-min cache write, 1-hour cache write, and cache read tokens use different price multipliers (1.25x, 2x, 0.1x respectively)
- [ ] **Cost Calculator:** Often missing long-context pricing tier -- verify that sessions with > 200K input tokens use premium pricing (2x input, 1.5x output for Sonnet models)
- [ ] **Project Detection:** Often missing the `~/.config/claude` path -- verify both legacy and current directories are checked
- [ ] **Session Grouping:** Often missing sidechain agent aggregation -- verify that `isSidechain: true` messages are rolled up into parent session totals
- [ ] **Date Filtering:** Often missing timezone handling -- verify that UTC timestamps from JSONL are converted to user's local timezone for filtering
- [ ] **Model Name Resolution:** Often missing date-suffixed model names -- verify `claude-sonnet-4-20250514` resolves to `claude-sonnet-4` pricing
- [ ] **Error Handling:** Often missing graceful degradation for corrupted JSONL lines -- verify one bad line doesn't crash the entire parse
- [ ] **CLI Help:** Often missing `--version` and `--help` flags -- npm convention, users expect them
- [ ] **Port Conflict:** Often missing port-in-use handling -- verify `--port` with fallback to next available port if default is taken

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

---
*Pitfalls research for: yclaude (AI coding analytics dashboard)*
*Researched: 2026-02-28*
