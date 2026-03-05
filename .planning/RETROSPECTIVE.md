# Retrospective: yclaude

---

## Milestone: v1.1 — Analytics Completion + Distribution

**Shipped:** 2026-03-05
**Phases:** 8 | **Plans:** 25

### What Was Built

- 6 new pages: Models (donut chart + table), Projects (decoded names), Sessions (paginated + drill-down), Chats (opt-in conversation viewer with markdown)
- Dark mode with system-aware toggle and persistent localStorage preference
- Personality copy system with 14 quip categories woven throughout all views
- npm publishing with automated GitHub Actions CI/CD on tag push
- Tier-reference pricing architecture with info tooltips and unknown model warnings
- Conversations viewer gated behind `--show-messages` CLI flag with server-side 403 enforcement
- 24h/48h date range presets enabling hourly chart buckets

### What Worked

- **Phase-by-phase execution** kept scope manageable — each phase had clear boundaries and success criteria
- **Server-side aggregation pattern** (established in v1.0) scaled cleanly across all 12 new API endpoints
- **TDD approach in API development** (Phase 6) caught issues early and provided regression safety
- **Decimal phase insertion** (9.1, 9.2) for gap closure worked well — addressed audit findings without disrupting milestone structure
- **Milestone audit before completion** surfaced the pricing accuracy issue (Phase 9.1) and tech debt (Phase 9.2) early enough to fix
- **CSS vars on charts from v1.0** meant dark mode (Phase 8) required zero chart color rewrites

### What Was Inefficient

- **SUMMARY.md format inconsistency** — early phases (5) had "## One-liner" sections, later phases dropped them; made automated extraction harder
- **REQUIREMENTS.md traceability staleness** — 9.1-01 through 9.1-04 showed "Pending" when actually Complete; Phase 9.2 requirements defined only in ROADMAP.md
- **Nyquist validation partially adopted** (3/8 phases) — should either commit fully or drop it in v2.0
- **Phase 10 XML tag rendering issues** required multiple fix iterations (server-side stripping, blank message filtering) — research phase should have identified Claude system prompt XML tags as a rendering concern

### Patterns Established

- `SortableTable<T extends Record<string, unknown>>` generic pattern for all data tables
- Detail page layout: page-header → summary-card → chart-card → table-card with space-y-6
- `CostInfoTooltip` pattern for contextual pricing explanations
- Dual event pipeline (filtered + raw) for privacy-gated content serving
- Server-side XML stripping for clean markdown rendering
- `ChatCard` standalone component pattern (cards for browsing, tables for structured data)

### Key Lessons

1. **Pricing accuracy matters more than presentation polish** — users noticed "est. prices seem off" before they noticed missing dark mode; fix data accuracy first
2. **Privacy gates must be server-side** (403 enforcement), never client-side toggles — prevents data leakage through URL manipulation
3. **Module-level side effects** (media listeners, store references) create subtle initialization ordering bugs — prefer lazy initialization
4. **Recharts requires hex colors** in many contexts (heatmap theme) — CSS variables don't work everywhere; document per-component
5. **Decimal phases are efficient for gap closure** — lower overhead than a full new milestone cycle

### Cost Observations

- 146 commits across 5 days for 8 phases and 25 plans
- Codebase grew from ~3,017 LOC to ~8,264 LOC (+174% in 5 days)
- Tests grew from 102 to 174 (+71%)
- Notable: Decimal phase insertion is an efficient pattern — 9.1 and 9.2 together addressed all audit findings without major rework

---

## Milestone: v1.0 — Local MVP

**Shipped:** 2026-02-28
**Phases:** 4 | **Plans:** 11

### What Was Built

- Resilient JSONL parser with 56 tests — per-line error handling, UUID dedup, multi-path detection, `<persisted-output>` tag handling
- Cost engine covering 19 Claude models with full cache tier pricing; `EstimatedCost` branded type enforces "estimated" label at compile time
- `applyPrivacyFilter()` strips all conversation content at the library layer before any route receives data
- Hono server + Commander CLI — CSP headers, 127.0.0.1-only, `--dir`/`--port`/`--no-open`; 102 server tests passing
- Full-stack integration — Vite React SPA served via `serveStatic`; single `npx yclaude` binary auto-opens browser
- Cost analytics dashboard — StatCard, TrendIndicator, TokenBreakdown, CostBarChart, DateRangePicker wired to TanStack Query + Zustand

### What Worked

- **TDD throughout** — red-green on server and parser code caught integration issues before they hit the browser; 158 total tests by end of Phase 4
- **Branded types for domain invariants** — `EstimatedCost` made it structurally impossible to display costs without the "estimated" label; a good model for future domain types
- **CSS vars on all chart colors from day one** — Phase 4 established `var(--color-bar)`, `var(--color-grid)` etc. so Phase 8 dark mode requires zero chart rewrites; forward-thinking paid off
- **API-first aggregation** — keeping all aggregation server-side (src/aggregation/) prevented the N+1 client-side pitfall from the start
- **Hash routing decision was quick and correct** — `createHashRouter` eliminated the need for a server catch-all; clean and simple

### What Was Inefficient

- **Phase 2 VERIFICATION scope confusion** — verifier correctly flagged CORE-04 as partial (server/CSP not built yet), but this triggered a `gaps_found` status that required audit investigation to resolve
- **webDistPath absolute path resolution** — discovered mid-Phase 3 that `path.resolve('web-dist')` breaks under `npx`; `fileURLToPath(new URL(..., import.meta.url))` was the fix
- **react-day-picker CSS isolation** — spent time debugging global CSS pollution before landing on "import in the component, not index.css"

### Patterns Established

- `parseDate()` three-state return (`null | Date | 'invalid'`) — distinguishes absent from malformed without boolean flags
- `queryKey` uses serialized store values (`from?.toISOString()`) not `new Date()` — prevents infinite refetch loops
- Zustand preset buttons → immediate store update → all TanStack Query refetches fire automatically
- `applyPrivacyFilter()` in library layer (not CLI/server) — keeps privacy guarantee testable independently

### Key Lessons

1. **Split cross-phase requirements explicitly** — if a requirement spans two phases, note it in both plans to prevent verification confusion
2. **npx path resolution is a footgun** — any file served relative to the binary needs `fileURLToPath(new URL(..., import.meta.url))`
3. **Zustand over URL params for global state was right** — URL sync adds complexity with minimal benefit at this scale
4. **Milestone boundary at Phase 4 was the right call** — Phases 1-4 form a coherent, shippable unit

### Cost Observations

- All 4 phases completed in a single day (2026-02-28)
- ~100 minutes of execution time across 11 plans (~9 min/plan average including checkpoint waits)
- Notable: high velocity from clean foundation; each phase fed directly into the next with no rework

---

## Cross-Milestone Trends

*Updated after each milestone. Patterns that hold across multiple milestones.*

| Pattern | First seen | Confirmed | Notes |
|---------|-----------|-----------|-------|
| TDD prevents integration bugs | v1.0 | v1.1 | Red-green on server code; catch issues before browser |
| CSS vars on charts from day one | v1.0 | v1.1 | Paid off — dark mode required zero chart rewrites |
| Branded domain types | v1.0 | v1.1 | EstimatedCost; apply to future domain invariants |
| API-first aggregation | v1.0 | v1.1 | Never send raw arrays to frontend; scaled to 12 endpoints |
| Milestone audit before completion | v1.1 | — | Surfaced 9.1/9.2 gap closure phases; recommend keeping |
| Decimal phase insertion for gaps | v1.1 | — | Lower overhead than new milestone; efficient pattern |

### Process Evolution

| Milestone | Phases | Plans | Days | LOC | Tests | Key Change |
|-----------|--------|-------|------|-----|-------|------------|
| v1.0 | 4 | 11 | 1 | 3,017 | 102 | Initial process — planning + execution in single session |
| v1.1 | 8 | 25 | 5 | 8,264 | 174 | Added milestone audit, decimal phases, Nyquist (partial) |

### Top Lessons (Verified Across Milestones)

1. **Privacy-first architecture pays dividends** — never had to retrofit privacy after the fact; `applyPrivacyFilter` + `--show-messages` gating both built on this foundation
2. **Server-side aggregation prevents data leakage** — pattern from v1.0 scaled through all v1.1 features without modification
3. **Tight phase scoping enables clean milestone boundaries** — both milestones shipped without scope creep
4. **Data accuracy > presentation polish** — users notice wrong numbers before they notice missing features
