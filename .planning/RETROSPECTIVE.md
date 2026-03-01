# Retrospective: yclaude

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

- **Phase 2 VERIFICATION scope confusion** — verifier correctly flagged CORE-04 as partial (server/CSP not built yet), but this triggered a `gaps_found` status that required audit investigation to resolve; would have been cleaner if the PLAN explicitly noted "CORE-04 split: privacy filter here, server/CSP in Phase 3"
- **webDistPath absolute path resolution** — discovered mid-Phase 3 that `path.resolve('web-dist')` breaks under `npx` (resolves relative to cwd, not binary); `fileURLToPath(new URL('../../web-dist', import.meta.url))` was the fix; this should be in the Phase 3 research/pitfalls docs earlier
- **react-day-picker CSS isolation** — spent a moment debugging global CSS pollution before landing on "import in the component, not index.css"; should be a documented pattern

### Patterns Established

- `parseDate()` three-state return (`null | Date | 'invalid'`) — distinguishes absent from malformed without boolean flags; reuse in any future date-parsing API routes
- `queryKey` uses serialized store values (`from?.toISOString()`) not `new Date()` — prevents infinite refetch loops; enforce in code review
- Zustand preset buttons → immediate store update → all TanStack Query refetches fire automatically — clean reactive pattern for future global filters
- `applyPrivacyFilter()` in library layer (not CLI/server) — keeps privacy guarantee testable independently of the server

### Key Lessons

1. **Split cross-phase requirements explicitly in the plan** — if a requirement spans two phases, note it in both plans ("CORE-04 part 1: privacy filter here; part 2: server/CSP in Phase 3") to prevent verification confusion
2. **npx path resolution is a footgun** — any file served relative to the binary location needs `fileURLToPath(new URL(..., import.meta.url))`; add to PITFALLS for Phase 9 (npm distribution)
3. **Zustand over URL params for global state was right** — URL sync adds complexity with minimal benefit at this scale; revisit only if users request shareable dashboard links
4. **Milestone boundary at Phase 4 (not Phase 8) was the right call** — Phases 1-4 form a coherent, shippable unit; Phases 5-8 are a natural second layer; cleaner than a monolithic v1.0

### Cost Observations

- All 4 phases completed in a single day (2026-02-28)
- ~100 minutes of execution time across 11 plans (~9 min/plan average including checkpoint waits)
- Sessions: single-day sprint — no cross-session context overhead in v1.0
- Notable: high velocity from clean foundation; each phase fed directly into the next with no rework

---

## Cross-Milestone Trends

*Updated after each milestone. Patterns that hold across multiple milestones.*

| Pattern | First seen | Confirmed | Notes |
|---------|-----------|-----------|-------|
| TDD prevents integration bugs | v1.0 | — | Red-green on server code; catch issues before browser |
| CSS vars on charts from day one | v1.0 | — | Pays off in dark mode phase |
| Branded domain types | v1.0 | — | EstimatedCost; apply to future domain invariants |
| API-first aggregation | v1.0 | — | Never send raw arrays to frontend |
