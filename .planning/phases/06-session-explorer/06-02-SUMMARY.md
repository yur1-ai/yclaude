---
phase: 06-session-explorer
plan: 02
subsystem: frontend
tags: [sessions, react-query, pagination, filtering, sortable-table]
dependency_graph:
  requires:
    - 06-01  # GET /api/v1/sessions endpoint
  provides:
    - useSessions hook with pagination and project filter
    - Sessions list page (replaces stub)
  affects:
    - web/src/pages/Sessions.tsx
    - web/src/hooks/useSessions.ts
tech_stack:
  added: []
  patterns:
    - React Query with serialized ISO string queryKey (prevents infinite refetch)
    - CSS-only hover tooltip for Mixed model display
    - Server-side pagination with client-side page state inside hook
    - useEffect page reset on filter change
key_files:
  created:
    - web/src/hooks/useSessions.ts
  modified:
    - web/src/pages/Sessions.tsx
decisions:
  - queryKey uses from?.toISOString() and to?.toISOString() to prevent infinite refetch loops (carried from STATE.md rule)
  - ProjectLink extracted as named component to allow useNavigate hook usage within column render prop
  - setPage exposed from useSessions hook to allow page reset from Sessions.tsx useEffect
metrics:
  duration: "76 seconds"
  completed: "2026-03-01"
  tasks_completed: 2
  files_modified: 2
---

# Phase 6 Plan 02: Session List UI Summary

Sessions list page fully implemented — sortable table with project filter dropdown and server-side pagination using useSessions React Query hook.

## What Was Built

**useSessions hook** (`web/src/hooks/useSessions.ts`):
- `SessionRow` extends `Record<string, unknown>` for SortableTable generic constraint
- `SessionsData` interface matching API response shape from Plan 01
- `useSessions(projectFilter)` wraps React Query with date range store, project filter, and server-side page state
- queryKey serializes dates as ISO strings — prevents infinite refetch loops (project rule)
- Returns query result spread plus `page` and `setPage` for page control from the consuming page

**Sessions.tsx page** (`web/src/pages/Sessions.tsx`):
- Replaces stub "Coming soon" with fully functional sessions table (141 lines)
- Header: page title + project dropdown + DateRangePicker compound filters
- Project dropdown populated from `useProjects()` hook
- SortableTable with 5 sortable columns: Project, Model, Cost, Time, Duration
- "Mixed" model tooltip using CSS hover (`relative group` pattern, no JS)
- Em dash (`&mdash;`) for null durationMs values
- Pagination Prev/Next with "Showing X-Y of Z" counter using server-supplied total/pageSize
- `useEffect` resets page to 1 when project filter changes
- Clicking project name navigates to `/sessions/:sessionId` via useNavigate

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | useSessions hook with pagination and project filter | a5346af | web/src/hooks/useSessions.ts |
| 2 | Sessions.tsx page — table, project filter dropdown, pagination | 218e51b | web/src/pages/Sessions.tsx |

## Deviations from Plan

**1. [Rule 2 - Auto-add] Extracted ProjectLink as named component**
- **Found during:** Task 2
- **Issue:** Column `render` functions are not React component function bodies; hooks (useNavigate) cannot be called inside them directly as inline arrow functions. Extracting `ProjectLink` as a named component allows `useNavigate` to be called correctly per React hooks rules.
- **Fix:** Created `function ProjectLink({ row }: { row: SessionRow })` component above `Sessions()` and referenced it in the column definition.
- **Files modified:** web/src/pages/Sessions.tsx
- **Commit:** 218e51b (included in Task 2 commit)

## Verification Results

- TypeScript compiles without errors (`tsc --noEmit` passes for both root and web)
- All success criteria met:
  - `web/src/hooks/useSessions.ts` exists with correct exports (SessionRow, SessionsData, useSessions)
  - `web/src/pages/Sessions.tsx` fully implemented — 141 lines (exceeds 80 line minimum)
  - SessionRow extends `Record<string, unknown>`
  - queryKey uses ISO string serialization
  - Page resets via useEffect when project filter changes
  - All 5 columns sortable; em dash for null duration; Mixed tooltip for multi-model sessions

## Self-Check: PASSED

- web/src/hooks/useSessions.ts: FOUND
- web/src/pages/Sessions.tsx: FOUND (141 lines)
- Commit a5346af: FOUND
- Commit 218e51b: FOUND
