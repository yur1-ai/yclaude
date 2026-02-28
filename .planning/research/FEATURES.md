# Feature Research

**Domain:** AI coding tool usage analytics dashboard
**Researched:** 2026-02-28
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete. These are validated by what every competitor already ships.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Total cost overview | ccusage, Claud-ometer, and Anthropic Console all show this. First question every user has: "How much did I spend?" | LOW | Sum of (tokens x model pricing). Maintain a static pricing lookup table, updated when Anthropic changes rates. Cache tokens (creation + read) must be calculated at their discounted rates. |
| Cost over time (daily/weekly/monthly) | ccusage has daily + monthly modes. Claud-ometer has time-series charts. Users need trends, not just totals. | LOW | Line/area chart with date grouping. Allow toggling between day/week/month granularity. |
| Per-model breakdown | Every competitor shows this. Users running mixed Sonnet/Opus/Haiku need to see where expensive model usage happens. | LOW | Donut chart + table. Data is in `message.model` field. |
| Per-project breakdown | ccusage has `--project` and `--instances`. Claud-ometer has a full Projects view. Users working across repos need this. | MEDIUM | Decode project slugs back to readable paths (e.g., `-Users-alex-work-myapp` to `myapp`). Need smart slug-to-name mapping. |
| Session list with drill-down | Claud-ometer has session browser with full conversation replay. Sniffly has message walkthrough. Users expect to inspect individual sessions. | MEDIUM | List view: duration, message count, tokens, cost. Detail view: message-by-message with token counts. |
| Date range filtering | ccusage has `--since`/`--until`. Universal dashboard pattern. Without it, large datasets are unusable. | LOW | Date picker component. Filter applies to all views. |
| Token breakdown (input/output/cache) | All competitors distinguish token types. Cache tokens are significantly cheaper and users want to see cache efficiency. | LOW | Show input, output, cache_creation, cache_read as separate metrics. Critical for cost accuracy. |
| Dark mode | Industry standard for developer tools in 2026. 60%+ of developers prefer dark themes. Missing this feels amateur. | LOW | System preference detection + manual toggle. Use CSS variables for theming. |
| Local-first, zero telemetry | Claud-ometer's tagline is literally "no cloud, no telemetry, just your data." Privacy is table stakes for tools reading `~/.claude`. | LOW | Architecture concern more than feature. No network calls in v1. Data never leaves the machine. |
| Responsive table/chart layout | ccusage auto-adapts to terminal width. Claud-ometer uses responsive web layout. Dashboard must work on various screen sizes. | LOW | Standard responsive CSS. Not mobile-first (developers use large screens), but don't break below 1024px. |

### Differentiators (Competitive Advantage)

Features that set yclaude apart. Not required, but these are where you win. Ordered by impact vs. effort.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Humorous personality throughout** | No competitor has personality. ccusage is dry tables. Claud-ometer is standard charts. "You burned 847K tokens this week. We don't judge. (We judge a little.)" makes the tool memorable and shareable. | LOW | Copy system with themed messages for spend thresholds, time patterns, model choices. Not just one-liners -- weave it into empty states, tooltips, loading screens. This IS the brand. |
| **GitHub-style activity heatmap** | Claud-ometer has this but yclaude can do it better with personality annotations ("Your most expensive Tuesday ever"). Visual at-a-glance usage patterns over months. | LOW | Calendar heatmap component. Color intensity = cost or token count. Clicking a day drills into that day's sessions. |
| **Cache efficiency scoring** | No competitor surfaces cache efficiency as a first-class metric. Claude Code's prompt caching saves 90% on cached tokens. Showing "Your cache hit rate is 73% -- nice!" teaches users and saves them money. | MEDIUM | Calculate: cache_read_tokens / (cache_read_tokens + cache_creation_tokens + input_tokens). Display as percentage with trend. Add humorous commentary at thresholds. |
| **"Cost per conversation turn" metric** | No competitor normalizes cost by interaction. Knowing "each message costs you ~$0.12 on average" is more intuitive than raw token counts. Enables apples-to-apples comparison across sessions. | LOW | total_cost / total_user_messages. Show per-project and per-session. Trend over time. |
| **Sidechain/subagent analysis** | No competitor surfaces `isSidechain` data. Claude Code spawns sub-agents that consume tokens invisibly. "32% of your tokens went to sub-agents you never saw" is a unique insight. | MEDIUM | Filter and aggregate by `isSidechain` flag. Show main vs. sidechain cost split. Per-session sidechain breakdown. |
| **Git branch correlation** | No competitor uses `gitBranch` data. "Feature branch `auth-refactor` cost $47 across 12 sessions" connects AI spend to actual work items. | MEDIUM | Group sessions by git branch. Show cost and token usage per branch. Timeline of branch activity. |
| **Session compaction detection** | Claud-ometer highlights compaction events in amber. yclaude can go further: "This session hit the context wall 3 times -- maybe break it up next time?" Actionable coaching. | MEDIUM | Detect compaction/summary events in JSONL. Count per session. Surface in session detail view with advice. |
| **Smart cost projections** | Claude Code Usage Monitor does ML-based predictions for rate limits. yclaude can project: "At this rate, you'll spend $340 this month." | MEDIUM | Rolling average of daily spend x remaining days. Show as projection line on the cost-over-time chart. Include confidence interval. |
| **npx zero-install experience** | ccusage proved this works. But ccusage is CLI-only. yclaude combines npx simplicity with a full web dashboard. "One command, full dashboard" -- no competitor offers this combo. | LOW | `npx yclaude` starts server + opens browser. This is distribution strategy, not a feature to build -- it's how you package the features. |
| **Shareable session snapshots** | Sniffly has shareable dashboards. yclaude can let users generate a static HTML snapshot of a session or date range, sharable without exposing raw conversation data. "Look how much I spent on Tuesday" for social/team sharing. | HIGH | Generate self-contained HTML with charts and stats (no conversation content for privacy). Export as file or clipboard-ready image. |
| **"Insights" panel with actionable tips** | No competitor provides optimization coaching. "You used Opus for 67% of messages. Switching routine work to Sonnet could save ~$120/month." Data-driven, personalized recommendations. | MEDIUM | Rule engine: analyze usage patterns, generate tips. Examples: model selection optimization, session length advice, time-of-day patterns. |
| **Crowdsourced benchmarking (Phase 2+)** | Nobody in the ecosystem does this. "Your team spends 2.3x the median for similar project sizes." Requires opt-in anonymous data contribution. Massive moat if achieved. | HIGH | Phase 2+ feature. Requires cloud infrastructure, data normalization, privacy-preserving aggregation. Defer implementation but design data model to support it from day 1. |
| **Team dashboard with per-developer views (Phase 3)** | Anthropic's official dashboard is Enterprise-only. No third-party tool serves SMB teams (5-50 devs). Huge gap. | HIGH | Phase 3 feature. Multi-user auth, per-user data aggregation, manager views, budget alerts. Design data model for multi-user from day 1. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Explicitly do NOT build these in v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time token streaming monitor** | Claude Code Usage Monitor does this. Feels "cool" and responsive. | Different product category entirely. Requires persistent process watching `~/.claude` for file changes. Adds complexity (file watchers, WebSocket connections) with minimal value for a dashboard that summarizes historical data. Competing with Usage Monitor on their turf. | Post-session analysis is yclaude's strength. Show "last updated X minutes ago" with manual refresh. Auto-refresh on an interval (30s-60s) if dashboard is open during active coding. |
| **Conversation content display** | Claud-ometer shows full conversation replay. Sniffly shows message walkthrough. Feels like "depth." | Privacy nightmare for a tool that may later have cloud features. Storing/displaying conversation content raises the bar on security massively. Most users care about cost and tokens, not re-reading conversations. Also dramatically increases parsing/rendering complexity. | Show message-level metadata (tokens, model, timestamp, tool calls) WITHOUT the actual conversation text. Link to the JSONL file for users who want raw content. |
| **OpenTelemetry/Prometheus/Grafana export** | Enterprise devops teams want to feed into existing monitoring. Seems "professional." | Different audience entirely. Adds heavy dependencies. The target user is a developer who runs `npx yclaude`, not a platform engineer configuring Grafana dashboards. Premature optimization for enterprise before PMF. | CSV/JSON export covers 95% of needs. In Phase 4 (Enterprise), consider OTLP export as a paid feature. |
| **IDE extension (VS Code, JetBrains)** | "I want to see my usage without leaving my editor." | Massive engineering surface area. Each IDE has different extension APIs. Splits focus from the core web dashboard. ccusage's Raycast extension proves that the community will build these if the data layer is good. | Expose a clean API/data format that community contributors can use to build IDE extensions. Prioritize the web dashboard. |
| **Multi-AI-tool support in v1** | "I also use Cursor/Copilot, show everything in one place." | Each tool has completely different data formats, storage locations, and metrics. Supporting even one additional tool doubles parsing complexity. Premature before validating the core Claude Code experience. | Design the data abstraction layer to support multiple providers (use a generic schema internally), but only implement the Claude Code parser in v1. Ship Cursor/Copilot parsers in Phase 3. |
| **AI-powered natural language queries** | "Ask questions about my usage in plain English." Trendy in 2026 dashboards. | Requires either shipping an LLM or making API calls (breaking local-first promise). Massive complexity for questionable value -- a well-designed dashboard with good filters answers 95% of questions without NLP. | Good filter/search UX with pre-built "insight cards" that answer common questions. The humorous personality layer already gives the dashboard a "smart" feel without actual AI. |
| **Budget alerts and notifications in v1** | Teams want "alert me when spend exceeds $X." Seems straightforward. | Requires a persistent background process or service to check thresholds. yclaude v1 is an on-demand dashboard, not a running service. Slack/email notifications require integrations and auth flows. | Show budget progress bars on the dashboard ("$127 of $200 monthly budget used"). Defer actual push notifications to Phase 3 (team features) where a cloud component justifies the always-on architecture. |
| **Automatic pricing updates** | "Keep the pricing table current automatically." | Anthropic does not publish a machine-readable pricing API. Scraping is fragile. Auto-updating prices without user awareness could cause incorrect cost calculations. | Ship a static pricing table. Display "last pricing update" date prominently. Allow manual override via config. Community PR process for price updates (ccusage does this successfully). |

## Feature Dependencies

```
[JSONL Parser] (core data layer)
    |-- [Cost Calculator] (requires parser + pricing table)
    |       |-- [Cost Over Time Chart] (requires calculator)
    |       |-- [Per-Model Breakdown] (requires calculator)
    |       |-- [Per-Project Breakdown] (requires calculator + slug decoder)
    |       |-- [Smart Cost Projections] (requires calculator + time series)
    |       |-- [Cache Efficiency Score] (requires parser token breakdowns)
    |       |-- [Cost Per Turn Metric] (requires calculator + message count)
    |       |-- [Git Branch Correlation] (requires parser + gitBranch field)
    |       |-- [Sidechain Analysis] (requires parser + isSidechain field)
    |
    |-- [Session List] (requires parser)
    |       |-- [Session Detail View] (requires session list)
    |       |-- [Session Compaction Detection] (requires session detail)
    |       |-- [Shareable Snapshots] (requires session detail + chart rendering)
    |
    |-- [Date Range Filter] (applies to all views)
    |
    |-- [Activity Heatmap] (requires parser + date aggregation)
    |
    |-- [Insights Panel] (requires calculator + all metrics)

[Humorous Personality] (cross-cutting, applies to all views)

[Dark Mode / Theming] (cross-cutting, applies to all views)

[Crowdsourced Benchmarking] (requires cloud infrastructure -- Phase 2+)
    |-- [Anonymous Data Contribution] (requires opt-in flow + cloud API)

[Team Dashboard] (requires multi-user auth -- Phase 3)
    |-- [Per-Developer Views] (requires team dashboard)
    |-- [Budget Alerts] (requires team dashboard + notification service)
    |-- [Manager View] (requires team dashboard + aggregation)
```

### Dependency Notes

- **All views require JSONL Parser:** The parser is the foundation. It must handle all `assistant` event fields: `message.usage`, `message.model`, `cwd`, `sessionId`, `timestamp`, `version`, `gitBranch`, `isSidechain`, `agentId`.
- **Cost Calculator requires Pricing Table:** Static lookup of model -> price-per-token. Must handle cache token pricing separately. This is a maintenance burden -- price changes require code updates.
- **Insights Panel requires everything:** It analyzes usage patterns across all dimensions. Build it last among v1 features.
- **Shareable Snapshots conflict with Privacy-First:** Must explicitly exclude conversation content. Only share metadata, charts, and aggregated stats. This tension must be designed around carefully.
- **Crowdsourced Benchmarking requires Cloud:** Cannot exist in v1 local-only mode. But the data schema should anticipate the anonymous contribution format from day 1.

## MVP Definition

### Launch With (v1.0)

Minimum viable product -- what gets someone to run `npx yclaude` instead of `npx ccusage`.

- [ ] **JSONL parser** with resilient error handling -- the foundation of everything
- [ ] **Pricing table** for all current Claude models (Opus, Sonnet, Haiku) with cache token rates
- [ ] **Cost dashboard** -- total spend, cost over time (day/week/month), model breakdown donut
- [ ] **Project breakdown** -- cost and tokens per project with decoded directory names
- [ ] **Session list** -- browse sessions with cost, token count, duration, message count
- [ ] **Session detail** -- message-level metadata (tokens, model, timestamp) WITHOUT conversation text
- [ ] **Date range filter** -- applies globally across all views
- [ ] **Activity heatmap** -- GitHub-style calendar view of usage intensity
- [ ] **Cache efficiency score** -- percentage + trend, unique differentiator
- [ ] **Humorous personality** -- woven into all copy, empty states, tooltips, and threshold messages
- [ ] **Dark mode** -- system preference detection + manual toggle
- [ ] **`npx yclaude` entrypoint** -- zero-install, auto-open browser, `--port` and `--dir` flags

### Add After Validation (v1.x)

Features to add once core is working and getting initial user feedback.

- [ ] **Sidechain/subagent analysis** -- when user feedback confirms this data is interesting
- [ ] **Git branch correlation** -- when users request connecting spend to work items
- [ ] **Cost per conversation turn** -- when users ask "how much does each interaction cost?"
- [ ] **Smart cost projections** -- when users want forward-looking estimates
- [ ] **Session compaction detection** -- when power users want optimization coaching
- [ ] **Insights panel** -- when enough data patterns are identified to provide actionable tips
- [ ] **Shareable snapshots** -- when users ask to share usage data with teammates/managers
- [ ] **CSV/JSON export** -- when users want to take data into spreadsheets

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Cloud sync** -- requires infrastructure, auth, privacy framework (Phase 2)
- [ ] **Crowdsourced benchmarking** -- requires critical mass of users + cloud (Phase 2)
- [ ] **Multi-tool support** (Cursor, Copilot, Windsurf) -- requires parser plugins (Phase 3)
- [ ] **Team dashboards** -- requires multi-user auth, manager views (Phase 3)
- [ ] **Budget alerts with notifications** -- requires always-on service + integrations (Phase 3)
- [ ] **Enterprise features** (SSO, audit logs, RBAC) -- requires enterprise infrastructure (Phase 4)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| JSONL parser + cost calculator | HIGH | MEDIUM | P1 |
| Cost dashboard (total + over time) | HIGH | LOW | P1 |
| Per-model breakdown | HIGH | LOW | P1 |
| Per-project breakdown | HIGH | MEDIUM | P1 |
| Session list + detail | HIGH | MEDIUM | P1 |
| Date range filter | HIGH | LOW | P1 |
| Humorous personality copy | HIGH | LOW | P1 |
| Dark mode | MEDIUM | LOW | P1 |
| Activity heatmap | MEDIUM | LOW | P1 |
| Cache efficiency score | MEDIUM | LOW | P1 |
| npx entrypoint + auto-open | HIGH | LOW | P1 |
| Token breakdown (input/output/cache) | MEDIUM | LOW | P1 |
| Sidechain analysis | MEDIUM | LOW | P2 |
| Git branch correlation | MEDIUM | MEDIUM | P2 |
| Cost per turn metric | MEDIUM | LOW | P2 |
| Smart cost projections | MEDIUM | MEDIUM | P2 |
| Compaction detection | LOW | MEDIUM | P2 |
| Insights panel | MEDIUM | HIGH | P2 |
| Shareable snapshots | MEDIUM | HIGH | P2 |
| CSV/JSON export | MEDIUM | LOW | P2 |
| Cloud sync | HIGH | HIGH | P3 |
| Crowdsourced benchmarking | HIGH | HIGH | P3 |
| Team dashboards | HIGH | HIGH | P3 |
| Multi-tool parsers | MEDIUM | HIGH | P3 |
| Budget alerts | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch -- without these, no reason to use yclaude over ccusage
- P2: Should have, add in v1.x -- these make yclaude clearly better than alternatives
- P3: Future phases -- these require infrastructure beyond v1's local-only scope

## Competitor Feature Analysis

| Feature | ccusage | Claud-ometer | Sniffly | Usage Monitor | Anthropic Dashboard | yclaude (planned) |
|---------|---------|--------------|---------|---------------|--------------------|--------------------|
| Web dashboard | No (CLI tables) | Yes (Next.js) | Yes (Python/HTML) | No (terminal TUI) | Yes (web) | Yes (web) |
| npx install | Yes | No (git clone) | No (pip/uv) | No (pip/uv) | N/A (built-in) | Yes |
| Cost over time | Daily/monthly tables | Line charts | Basic stats | Real-time chart | Daily chart | Charts with personality |
| Per-model breakdown | `--breakdown` flag | Donut chart | Unknown | Per-model pricing | Per-user spend | Donut + table + humor |
| Per-project view | `--project` flag | Full project browser | Project split | No | No (per-user only) | Full project browser |
| Session drill-down | Session mode (table) | Full conversation replay | Message walkthrough | No | No | Metadata-only (privacy-safe) |
| Cache efficiency | Shows cache tokens | Cache metrics in cost view | No | Cache calculations | No | First-class metric with scoring |
| Activity heatmap | No | Yes (GitHub-style) | No | No | No | Yes, with personality |
| Git branch view | No | No | No | No | No | Yes (unique) |
| Sidechain analysis | No | No | No | No | No | Yes (unique) |
| Cost projections | No | No | No | ML-based predictions | No | Trend-based projections |
| Error analysis | No | No | Yes (key differentiator) | No | No | No (not in scope) |
| Data export | `--json` flag | ZIP export/import | Shareable links | No | CSV export | CSV/JSON + snapshots |
| Dark mode | N/A (terminal) | Likely (Next.js) | Unknown | Terminal themes | Standard web | Yes, system-aware |
| Personality/humor | None | None | None | None | None | Core differentiator |
| Team features | No | No | No | No | Enterprise only | Phase 3 |
| Multi-provider | better-ccusage fork | No | No | No | Claude only | Phase 3 (designed for) |
| Offline mode | Yes (`--offline`) | Yes (local files) | Yes (local) | Yes (local) | No (requires auth) | Yes (local-first) |

### Key Gaps in Competitors That yclaude Fills

1. **No personality anywhere.** Every tool is either dry CLI tables or standard dashboard chrome. yclaude's humor is a genuine differentiator that costs almost nothing to implement.

2. **No git branch correlation.** The `gitBranch` field exists in the JSONL data but nobody uses it. Connecting AI spend to actual feature work is an insight gap.

3. **No sidechain visibility.** The `isSidechain` field exists but nobody surfaces sub-agent costs. This is invisible spend that users cannot track today.

4. **No cache efficiency as a first-class metric.** Competitors show raw cache token numbers but don't help users understand if their caching is good or bad.

5. **No npx + web dashboard combo.** ccusage has npx but CLI-only. Claud-ometer has web but requires git clone + setup. yclaude is the only planned tool offering `npx yclaude` that launches a full web dashboard.

6. **No SMB team analytics.** Anthropic's dashboard is Enterprise-only. No third-party tool serves the 5-50 developer team segment. This is the monetization gap.

7. **Privacy-safe session detail.** Claud-ometer shows full conversation text, which is a liability for any future cloud/team features. yclaude's metadata-only approach is more privacy-conscious while still providing useful detail.

## Sources

- [ccusage GitHub repository](https://github.com/ryoppippi/ccusage) -- feature analysis, CLI flags, ecosystem (HIGH confidence)
- [Claud-ometer GitHub repository](https://github.com/deshraj/Claud-ometer) -- dashboard views, tech stack, limitations (HIGH confidence)
- [Sniffly GitHub repository](https://github.com/chiphuyen/sniffly) -- error analysis, shareable dashboards (HIGH confidence)
- [Claude Code Usage Monitor GitHub](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor) -- real-time monitoring, ML predictions (HIGH confidence)
- [Anthropic Claude Code Analytics docs](https://code.claude.com/docs/en/analytics) -- official team analytics features (HIGH confidence)
- [better-ccusage npm](https://www.npmjs.com/package/better-ccusage) -- multi-provider extension of ccusage (MEDIUM confidence)
- [Shipyard: How to track Claude Code usage](https://shipyard.build/blog/claude-code-track-usage/) -- tool comparison and gaps (MEDIUM confidence)
- [Claude Code cost management docs](https://code.claude.com/docs/en/costs) -- cost optimization strategies (HIGH confidence)
- [Dashboard UX best practices - Smashing Magazine](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/) -- dashboard design patterns (MEDIUM confidence)
- [Dashboard design principles - UXPin](https://www.uxpin.com/studio/blog/dashboard-design-principles/) -- UX patterns (MEDIUM confidence)
- [GitHub issue: Expose usage limits for status line](https://github.com/anthropics/claude-code/issues/22221) -- community feature requests (MEDIUM confidence)

---
*Feature research for: AI coding tool usage analytics dashboard (yclaude)*
*Researched: 2026-02-28*
