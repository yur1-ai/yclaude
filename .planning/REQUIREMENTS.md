# Requirements: yclaude

**Defined:** 2026-03-07
**Core Value:** Give developers full visibility into their AI coding spend -- locally first, with no friction.

## v1.2 Requirements

Requirements for multi-provider analytics milestone. Each maps to roadmap phases.

### Provider Infrastructure

- [x] **PROV-01**: User sees all AI coding tools working through a unified data layer (UnifiedEvent type, ProviderAdapter interface, provider registry; existing Claude Code refactored to src/providers/claude/)
- [x] **PROV-02**: User's installed AI tools are auto-detected on startup with no manual configuration (check ~/.claude/, Cursor state.vscdb paths, OpenCode opencode.db)
- [ ] **PROV-03**: User can switch between provider-specific dashboard views via tab navigation (per-provider tabs + "All" tab for cross-provider totals)
- [ ] **PROV-04**: User can filter all API endpoints by provider via ?provider= query parameter (backward compatible -- no param returns all data)
- [ ] **PROV-05**: User sees provider-specific personality copy throughout the dashboard (different humor per tool context)

### Cursor Analytics

- [x] **CURS-01**: User can view Cursor session list with tokens, models, timestamps, and duration parsed from state.vscdb (composerData v3 + bubbles, schema version detection, read-only SQLite via node:sqlite)
- [x] **CURS-02**: User can view accurate Cursor cost data extracted from usageData.costInCents field (provider-reported cost, more accurate than token re-estimation)
- [x] **CURS-03**: User can see Cursor agent mode vs manual mode analytics (isAgentic flag segmentation with token/cost comparison)

### OpenCode Analytics

- [ ] **OC-01**: User can view OpenCode session list with tokens, models, timestamps parsed from opencode.db SQLite or legacy JSON files (dual-format auto-detection)
- [ ] **OC-02**: User can view OpenCode cost data using pre-calculated cost fields (session.cost, response.cost) covering 75+ models without maintaining separate pricing tables
- [ ] **OC-03**: User can see code-change metrics per OpenCode session (additions, deletions, files changed from summary_* columns)
- [ ] **OC-04**: User can see OpenCode session hierarchy showing parent/child relationships (subagent spawning via parent_id)
- [ ] **OC-05**: User can see which AI providers OpenCode routes to (Anthropic, OpenAI, Google, etc. breakdown via responses.provider_id)

### Cross-Provider

- [ ] **CROSS-01**: User can view a cross-provider overview showing total spend across all tools with per-provider cost breakdown cards
- [ ] **CROSS-02**: User can compare model usage across providers (e.g., "Sonnet for 60% in Claude Code, GPT-4o for 80% in OpenCode")
- [ ] **CROSS-03**: User can view a unified activity heatmap showing ALL AI coding activity across all providers in one calendar

## Future Requirements (v1.3+)

### Ollama Analytics (deferred -- no persistent usage data exists)

- **OLMA-01**: User can view Ollama usage analytics (requires proxy or log parser -- data collection mechanism needed)
- **OLMA-02**: User can see "you saved $X" cloud-equivalent cost calculator for local model runs

### Extended Features

- **CONV-01**: User can view Cursor conversations (bubble text, thinking content)
- **CONV-02**: User can view OpenCode conversations (messages table)
- **EXPORT-01**: User can export per-provider data as CSV/JSON
- **COPILOT-01**: User can view GitHub Copilot usage analytics (no accessible local data currently)

### Cloud & Teams (deferred from v2.0)

- **CLOUD-01**: Cloud sync -- opt-in persistence across machines
- **TEAM-01**: Team admin aggregated usage view
- **BENCH-01**: Community benchmarking -- anonymized usage comparison

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time Ollama monitoring | Requires persistent WebSocket/polling -- different product category (Prometheus/Grafana territory) |
| Cursor cloud API integration | Requires auth, API keys, enterprise subscription -- breaks local-first promise |
| Real-time sync for any provider | Requires file watching, change detection, SSE/WebSocket -- startup-time loading is sufficient |
| Blended session timeline | Different tools have fundamentally different session models -- forced unification loses context |
| Provider comparison recommendations | Apples-to-oranges (API vs subscription vs free) -- show data, let users decide |
| Cursor tab-completion analytics | Enterprise API only -- not in local state.vscdb |
| Automatic pricing updates | Network calls break local-first guarantee |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROV-01 | Phase 11 | Complete |
| PROV-02 | Phase 11 | Complete |
| PROV-03 | Phase 13 | Pending |
| PROV-04 | Phase 13 | Pending |
| PROV-05 | Phase 13 | Pending |
| CURS-01 | Phase 12 | Complete |
| CURS-02 | Phase 12 | Complete |
| CURS-03 | Phase 12 | Complete |
| OC-01 | Phase 14 | Pending |
| OC-02 | Phase 14 | Pending |
| OC-03 | Phase 14 | Pending |
| OC-04 | Phase 14 | Pending |
| OC-05 | Phase 14 | Pending |
| CROSS-01 | Phase 13 | Pending |
| CROSS-02 | Phase 13 | Pending |
| CROSS-03 | Phase 13 | Pending |

**Coverage:**
- v1.2 requirements: 16 total
- Mapped to phases: 16/16
- Unmapped: 0

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 after roadmap creation (Phases 11-14)*
