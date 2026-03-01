---
phase: 07-differentiator-features
verified: 2026-03-01T09:00:00Z
status: passed
score: 19/19 must-haves verified
re_verification: false
---

# Phase 7: Differentiator Features Verification Report

**Phase Goal:** User gets insights no competing tool provides — cache efficiency scoring, activity patterns, subagent analysis, git branch context, and intraday spend visibility
**Verified:** 2026-03-01T09:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All must-haves from plans 07-01 through 07-04 were verified against the actual codebase.

#### Plan 07-01 — Backend API Extensions

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/v1/sessions returns gitBranch per row and supports ?branch= filter | VERIFIED | `api.ts:378,457,410-411` — gitBranch in SessionRow interface; branchFilter applied at event level |
| 2 | GET /api/v1/sessions returns hasSubagents, mainCostUsd, subagentCostUsd per row | VERIFIED | `api.ts:379-381,451-456,474` — isSidechain split, all three fields pushed to allSessions |
| 3 | GET /api/v1/sessions/:id summary includes mainCostUsd and subagentCostUsd | VERIFIED | `api.ts:515-518,566-569,596-599` — SessionSummary interface and build include all three fields |
| 4 | GET /api/v1/branches returns sorted unique non-null gitBranch values | VERIFIED | `api.ts:308-318` — Set dedup + .sort() + non-empty string filter |
| 5 | GET /api/v1/cost-over-time handles bucket=hour with ?tz= IANA timezone bucketing | VERIFIED | `api.ts:54-67,133,163-164` — getLocalHourKey() helper; tz param extracted; hour case in switch |
| 6 | GET /api/v1/activity returns gap-filled 365-day Activity[] with session counts and levels | VERIFIED | `api.ts:320-362` — daySessions Map counting distinct sessionIds; 366-iteration loop with year-boundary break; level quartile formula |

#### Plan 07-02 — Sessions Page Upgrades

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 7 | Session list rows with subagent events display a distinct 'Multi-agent' badge | VERIFIED | `Sessions.tsx:36` — `{row.hasSubagents && <SubagentBadge />}` in model column render |
| 8 | Session list has a git branch column showing the branch per row | VERIFIED | `Sessions.tsx:41-50` — gitBranch column with monospace font and '—' null sentinel |
| 9 | A branch filter dropdown on Sessions page lets users narrow to a specific branch | VERIFIED | `Sessions.tsx:107-118` — select with branchesData?.branches.map(); onChange sets branchFilter |
| 10 | Session detail summary header shows 'Main: $X | Subagents: $Y' cost split | VERIFIED | `SessionDetail.tsx:86-90` — conditional spread: `...(summary.hasSubagents ? [Total, Main Thread, Subagents] : [Total])` |
| 11 | Branch filter is local state — it does not affect Overview stats | VERIFIED | `Sessions.tsx:79` — `useState<string | null>(null)`; useDateRangeStore NOT imported with branch context; branchFilter NOT in Zustand |

#### Plan 07-03 — Activity Heatmap + Cache Efficiency

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 12 | A CacheEfficiencyCard StatCard on Overview shows cache % with two tab modes (Input Coverage / Cache Hit Rate) | VERIFIED | `CacheEfficiencyCard.tsx:42-64` — MODES array with two keys; button onClick sets local mode state |
| 13 | TrendIndicator on the cache card shows real % change vs prior equivalent period | VERIFIED | `CacheEfficiencyCard.tsx:34-38` — trendPercent computed from currentScore/priorScore; null for all/custom presets |
| 14 | A SubagentStatCard on Overview shows subagent share of total cost as a percentage | VERIFIED | `Overview.tsx:106-117` — conditional StatCard only when `subagentCostUsd > 0`; percentage formula correct |
| 15 | A GitHub-style activity heatmap renders below the chart on Overview with full-year green color scale | VERIFIED | `ActivityHeatmap.tsx:64-81` — ActivityCalendar with HEATMAP_THEME hex colors (5-level green scale) |
| 16 | Heatmap has its own year selector — changing it does NOT affect global date range | VERIFIED | `ActivityHeatmap.tsx:33` — `useState(currentYear)` local to component; no useDateRangeStore import anywhere in ActivityHeatmap.tsx |
| 17 | Heatmap cells show tooltip with session count + personality quip on hover | VERIFIED | `ActivityHeatmap.tsx:70-79` — cloneElement adds title attribute: `{count} session(s) — {getQuip(count)}` |
| 18 | Heatmap does NOT import useDateRangeStore | VERIFIED | grep on ActivityHeatmap.tsx returns no matches for useDateRangeStore |

#### Plan 07-04 — Hourly Chart Bucket

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 19 | CostBarChart shows an 'Hourly' button as a 4th bucket option alongside Daily/Weekly/Monthly | VERIFIED | `CostBarChart.tsx:42-54` — BUCKETS array has 4 entries; Hourly with disabledWhen function |
| 20 | The Hourly button is disabled (greyed out) when selected date range exceeds 48 hours | VERIFIED | `CostBarChart.tsx:49-52,80-81` — disabledWhen checks `> 48 * 60 * 60 * 1000`; `cursor-not-allowed` class applied |
| 21 | Hovering the disabled Hourly button shows tooltip | VERIFIED | `CostBarChart.tsx:86-90` — `group-hover:block` span with exact message "Select a range of 48h or less for hourly view" |
| 22 | Selecting Hourly fetches data bucketed by local-timezone hour from the backend | VERIFIED | `useCostOverTime.ts:12,19,22` — LOCAL_TZ module constant; `params.set('tz', LOCAL_TZ)`; tz in queryKey |
| 23 | X-axis labels in Hourly view show HH:00 format | VERIFIED | `CostBarChart.tsx:24-28` — `if (bucket === 'hour') { const hour = dateStr.slice(11, 13); return \`${hour}:00\` }` |
| 24 | If Hourly is active and user changes date range to > 48h, bucket resets to 'day' | VERIFIED | `Overview.tsx:22-27` — useEffect watching from/to/bucket; calls setBucket('day') when condition met |

**Score:** 19/19 truths verified (24 sub-truths across 4 plans)

---

### Required Artifacts

| Artifact | Status | Lines | Notes |
|----------|--------|-------|-------|
| `src/server/routes/api.ts` | VERIFIED | 606 | All backend Phase 7 changes: getLocalHourKey, /branches, /activity, /sessions extensions, /summary extensions, hour bucket |
| `web/src/hooks/useBranches.ts` | VERIFIED | 17 | Fetches /api/v1/branches; exports useBranches |
| `web/src/components/SubagentBadge.tsx` | VERIFIED | 7 | Amber "Multi-agent" chip; exports SubagentBadge |
| `web/src/hooks/useSessions.ts` | VERIFIED | 49 | SessionRow has all 4 new fields; branchFilter param in signature, queryKey, and params |
| `web/src/pages/Sessions.tsx` | VERIFIED | 160+ | Branch column, branch filter dropdown, SubagentBadge in model column; branchFilter as local useState |
| `web/src/pages/SessionDetail.tsx` | VERIFIED | — | Conditional cost split (Total / Main Thread / Subagents) when hasSubagents |
| `web/src/hooks/useSessionDetail.ts` | VERIFIED | — | Optional mainCostUsd, subagentCostUsd, hasSubagents on SessionSummary |
| `web/src/hooks/usePriorSummary.ts` | VERIFIED | 29 | Prior-period shift logic; enabled=false when no date range |
| `web/src/components/CacheEfficiencyCard.tsx` | VERIFIED | 79 | Two-tab toggle; cache formulas; TrendIndicator wired to prior period |
| `web/src/hooks/useActivityData.ts` | VERIFIED | 21 | Fetches /api/v1/activity with year and tz params |
| `web/src/components/ActivityHeatmap.tsx` | VERIFIED | 93 | ActivityCalendar with hex theme; local year state; cloneElement tooltip |
| `web/src/pages/Overview.tsx` | VERIFIED | 124 | CacheEfficiencyCard, SubagentStatCard (conditional), ActivityHeatmap added; from/to passed to CostBarChart; useEffect bucket reset |
| `web/src/hooks/useCostOverTime.ts` | VERIFIED | 29 | 'hour' in Bucket type; LOCAL_TZ module constant; tz in all requests and queryKey |
| `web/src/components/CostBarChart.tsx` | VERIFIED | 137 | 4-button BUCKETS with disabledWhen; HH:00 formatter via slice; disabled styling + CSS tooltip |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| api.ts /sessions handler | SessionRow.gitBranch, SessionRow.hasSubagents | sorted.find(e => e.gitBranch), sideEvents.length > 0 | WIRED | `api.ts:451-457,474` — all four fields in allSessions.push() |
| api.ts /cost-over-time handler | hour bucket with Intl.DateTimeFormat | getLocalHourKey() via ?tz= param | WIRED | `api.ts:54-67,133,163-164` — helper defined; tz read from query; hour case calls helper |
| api.ts /activity handler | gap-filled 365-day array | daySessions Map counting distinct sessionIds per local date | WIRED | `api.ts:325-362` — full implementation verified |
| Sessions.tsx branchFilter state | useSessions(projectFilter, branchFilter) | useState local to Sessions.tsx — NOT in Zustand | WIRED | `Sessions.tsx:79-80` — local useState; passed directly to useSessions |
| SubagentBadge.tsx | Sessions.tsx column render prop | row.hasSubagents conditional render | WIRED | `Sessions.tsx:36` — `{row.hasSubagents && <SubagentBadge />}` |
| SessionDetail.tsx | summary.mainCostUsd + summary.subagentCostUsd | summary card stat items conditional spread | WIRED | `SessionDetail.tsx:86-90` |
| CacheEfficiencyCard.tsx | useSummary() and usePriorSummary() | cache formulas on totalTokens from both periods | WIRED | `CacheEfficiencyCard.tsx:12-13,15-27` |
| ActivityHeatmap.tsx | react-activity-calendar ActivityCalendar | named import, green theme, cloneElement title tooltip | WIRED | `ActivityHeatmap.tsx:2,64,70-79` |
| Overview.tsx | ActivityHeatmap year state | local useState in ActivityHeatmap — NOT useDateRangeStore | WIRED | `ActivityHeatmap.tsx:33` — no useDateRangeStore import confirmed |
| CostBarChart.tsx BUCKETS | disabled state for 'hour' when range > 48h | disabledWhen function | WIRED | `CostBarChart.tsx:49-52,70` |
| useCostOverTime.ts | /api/v1/cost-over-time?tz=IANA | LOCAL_TZ module constant | WIRED | `useCostOverTime.ts:12,19,22` |
| CostBarChart.tsx makeFormatter | HH:00 label for hour bucket | dateStr.slice(11, 13) | WIRED | `CostBarChart.tsx:24-28` |
| Overview.tsx | bucket reset to 'day' when range exceeds 48h | useEffect watching from/to/bucket | WIRED | `Overview.tsx:22-27` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ANLT-07 | 07-03 | Cache efficiency score with trend indicator | SATISFIED | CacheEfficiencyCard with two-tab mode toggle and TrendIndicator showing prior-period comparison; formulas verified in `CacheEfficiencyCard.tsx:15-27` |
| ANLT-08 | 07-03 | GitHub-style activity heatmap with personality annotations on hover | SATISFIED | ActivityHeatmap using react-activity-calendar with green hex theme; cloneElement tooltip with count + quip; independent year picker; does not import useDateRangeStore |
| ANLT-09 | 07-01, 07-04 | 24h time window with hourly buckets and labeled x-axis ticks | SATISFIED | Backend: getLocalHourKey + hour case in cost-over-time handler. Frontend: 4th Hourly button with 48h guard; HH:00 formatter; tz forwarded |
| SESS-03 | 07-01, 07-02, 07-03 | Subagent sessions flagged distinctly; session detail breaks out subagent token cost separately | SATISFIED | SubagentBadge in Sessions table; hasSubagents/mainCostUsd/subagentCostUsd on all rows; SessionDetail cost split; SubagentStatCard on Overview |
| SESS-04 | 07-01, 07-02 | Git branch shown in session list; filterable by dropdown | SATISFIED | gitBranch column in Sessions table; useBranches hook populating dropdown; ?branch= filter on backend |

**Note on REQUIREMENTS.md staleness:** The REQUIREMENTS.md traceability table (line 74-75) and checkboxes (lines 15-16) still show ANLT-07 and ANLT-08 as "Pending" with unchecked boxes. This is a documentation staleness issue — the file has a last-updated timestamp of "after 07-02 execution" (before 07-03 ran). The actual code fully implements both requirements. REQUIREMENTS.md should be updated to mark ANLT-07 and ANLT-08 as complete.

---

### Anti-Patterns Found

No blockers or stubs found. The `return null` instances in `CacheEfficiencyCard.tsx` are legitimate guard clauses for null data conditions, not empty implementations.

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `CacheEfficiencyCard.tsx:19` | `return null` | Info | Guard clause — data not loaded yet, not a stub |
| `CacheEfficiencyCard.tsx:35-36` | `return null` | Info | Guard clause — trendPercent null for all/custom presets, by design |

---

### Commit Verification

All 8 task commits documented in summaries exist in git history:

| Commit | Plan | Description |
|--------|------|-------------|
| `5589a83` | 07-01 Task 1 | Extend /sessions list and detail with subagent + branch fields |
| `cb9e381` | 07-01 Task 2 | Add /branches, /activity endpoints and hour bucket |
| `7437fba` | 07-02 Task 1 | Add SubagentBadge, useBranches hook, update useSessions |
| `df075ae` | 07-02 Task 2 | Add branch filter, subagent badge, and cost split to Sessions/SessionDetail |
| `67ad1cb` | 07-03 Task 1 | Extend /summary with subagent costs, add usePriorSummary + CacheEfficiencyCard |
| `1b07805` | 07-03 Task 2 | Add ActivityHeatmap, useActivityData, update Overview |
| `b7765e1` | 07-04 Task 1 | Extend useCostOverTime with 'hour' Bucket type and timezone forwarding |
| `19ee271` | 07-04 Task 2 | Add Hourly bucket to CostBarChart with disabled state and HH:00 formatter |

---

### Human Verification Required

The following items need visual verification in a running browser session:

#### 1. Hourly Chart in Action

**Test:** Set date range to last 24h. Click "Hourly" button.
**Expected:** Chart re-renders with x-axis labels in HH:00 format (e.g. "09:00", "14:00"). Network tab confirms `?bucket=hour&tz=<local_tz>`.
**Why human:** Cannot verify rendered chart axis labels or network request content programmatically.

#### 2. Heatmap Tooltip Behavior

**Test:** Visit Overview. Hover over a non-zero activity cell in the ActivityHeatmap.
**Expected:** Browser native tooltip appears showing e.g. "3 sessions — Why, Claude?!" with a personality quip.
**Why human:** Browser title attribute tooltip rendering cannot be verified programmatically.

#### 3. Branch Filter Isolation from Overview

**Test:** Set branch filter on Sessions page. Navigate to Overview.
**Expected:** Overview stats are unchanged (branch filter does not bleed into global state).
**Why human:** Requires navigating between pages to observe state isolation.

#### 4. CacheEfficiencyCard Tab Toggle

**Test:** Visit Overview. Click "Hit Rate" tab on Cache Efficiency card.
**Expected:** Displayed percentage changes to reflect cache hit rate formula. "Input Coverage" and "Hit Rate" tabs visually distinguish active state.
**Why human:** Requires real data and visual inspection of tab state styling.

#### 5. ANLT-07/ANLT-08 in REQUIREMENTS.md

**Test:** Update REQUIREMENTS.md to mark ANLT-07 and ANLT-08 as satisfied (check boxes and update traceability table).
**Expected:** Checkboxes `[x]` for ANLT-07 and ANLT-08; traceability table shows "Complete" for both.
**Why human:** Documentation update requires human judgment and commit.

---

### Gaps Summary

No gaps blocking goal achievement. All 19 must-have truths verified. All 14 artifacts exist, are substantive, and are correctly wired. All 5 required requirement IDs (ANLT-07, ANLT-08, ANLT-09, SESS-03, SESS-04) are implemented in the codebase.

The only outstanding item is a documentation staleness issue in REQUIREMENTS.md (ANLT-07 and ANLT-08 still marked as "Pending" in the traceability table), which does not affect the code.

TypeScript compiles without errors in both the server (`tsconfig.json`) and the web (`web/`).

---

_Verified: 2026-03-01T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
