# Phase 10: Conversations Viewer - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

A Chats tab displaying parsed conversation text from JSONL files, gated behind the `--show-messages` CLI flag for privacy. Users can browse a list of conversations, expand for a quick preview, then open a full thread page replicating Claude's web chat interface. The existing Session Explorer remains metadata-only regardless of this flag. No editing, exporting, or real-time streaming — read-only viewing of past conversations.

</domain>

<decisions>
## Implementation Decisions

### Chat list presentation
- Two-line card layout (not table): line 1 = project name + model + timestamp, line 2 = first user message truncated ~80 chars
- Estimated cost shown as secondary metadata (right-aligned, subtle)
- Default sort: newest first
- Filtering: project dropdown + global DateRangePicker + text search input
- Text search: case-insensitive substring match across all user and assistant messages in a conversation
- Search results highlight matching terms in the preview snippet
- Expand/collapse on each card: collapsed shows truncated preview, expanded shows full first user message (untruncated)
- "View full conversation" button in expanded state navigates to `/chats/:sessionId` (new page)
- Server-side pagination: 50 per page with prev/next buttons (same as Sessions)

### Conversation thread layout
- Hybrid Claude-web style: user messages as compact right-aligned bubbles, assistant responses full-width with role icon
- Timestamps on all turns + token count and model on assistant turns
- Summary card at top: project, model, duration, total cost, token breakdown — mirrors SessionDetail pattern
- "View session analytics" link in summary card navigates to `/sessions/:id`
- Tool use blocks (Read, Write, Bash, etc.) rendered as collapsible sections between messages
- Collapsed tool block shows: tool name + target (e.g. "Read: src/server/api.ts", "Bash: npm test")
- Expand tool block to see full content/output
- Full page scroll for all messages (no virtualization) — works with browser Cmd+F

### Markdown rendering
- Full GFM for both user and assistant messages: code blocks, inline code, lists, bold/italic, links, tables, blockquotes, task lists, strikethrough
- Syntax highlighting for code blocks with language detection (Claude includes language hints like ```ts, ```python)
- Syntax highlighting theme follows app light/dark mode (light theme in light mode, dark in dark mode)
- Copy button appears on hover (top-right of code block) — standard pattern from GitHub/Claude web
- Language badge on code blocks (small label showing detected language, e.g. "typescript")
- New dependencies needed: react-markdown + remark-gfm + syntax highlighter + copy-to-clipboard

### Disabled-state experience (no --show-messages)
- Chats nav item visible but locked — clicking shows an explanation page (not hidden entirely)
- Explanation page: paragraph explaining privacy gate + styled code block with `npx yclaude --show-messages` + "All data stays on your machine" reassurance
- Same explanation page shown on direct URL navigation to #/chats
- `/api/v1/config` endpoint returns `{ showMessages: boolean }` — frontend reads on load to control nav and routing
- Server-side enforcement: `/api/v1/chats` endpoints return 403 if `--show-messages` was not passed
- Subtle info banner at top of Chats page when enabled: "Conversation content is displayed because --show-messages was used. This data stays local."

### Claude's Discretion
- Exact markdown/syntax highlighting library choices (react-markdown vs alternatives, Shiki vs Prism vs react-syntax-highlighter)
- Loading skeleton design for chat list and thread
- Message block exact styling: spacing, border radius, background colors for light/dark, user bubble color vs assistant background
- How to handle messages with no content or empty turns
- How to parse tool use from assistant message content blocks (tool_use/tool_result content types)
- Personality quips for empty states (empty_chats, feature_disabled)
- Exact tool block collapsed/expanded styling

</decisions>

<specifics>
## Specific Ideas

- The conversation thread should replicate how Claude's web app renders chats: user messages as compact right-aligned bubbles, assistant messages full-width. Not a generic messaging app — a developer tool chat viewer.
- Code blocks are the star of the show since these are AI coding conversations — syntax highlighting, copy button, and language badge make or break the reading experience.
- The privacy banner should feel informational, not alarming — a subtle info bar, not a yellow warning.
- The locked explanation page should feel helpful, not restrictive: "here's how to enable this" rather than "access denied."

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SortableTable<T>` (`web/src/components/SortableTable.tsx`): could reuse for structured parts, but card list is a new pattern
- `DateRangePicker` + `useDateRangeStore`: global date filtering already wired
- `SessionDetail.tsx` page pattern: back button, summary card, detail content — replicate for conversation thread view
- `applyPrivacyFilter()` (`src/cost/privacy.ts`): current content stripping — make conditional on `showMessages` flag
- Quips system (`web/src/lib/quips.ts`): add `empty_chats` and `feature_disabled` quip arrays
- `useSessions`/`useSessionDetail` hooks: replicate pattern for `useChats`/`useChatDetail`

### Established Patterns
- React Query hook per page with date range store integration
- Hono API routes in `src/server/routes/api.ts` with date filtering and pagination
- CLI flags via Commander in `src/server/cli.ts`
- `createApp(state)` factory in `src/server/server.ts`
- Page structure: header row with title + DateRangePicker, then card sections
- Detail page: page-header (back + title), summary-card, content sections with space-y-6

### Integration Points
- `src/server/cli.ts`: add `--show-messages` flag, pass to createApp config
- `src/server/server.ts`: update createApp to accept `{ showMessages }` config
- `src/cost/privacy.ts`: make `applyPrivacyFilter()` conditional — preserve message content when showMessages=true
- `src/server/routes/api.ts`: add `/config`, `/chats`, `/chats/:sessionId` endpoints; 403 gate on chats endpoints
- `web/src/App.tsx`: add `/chats` and `/chats/:sessionId` routes
- `web/src/components/Layout.tsx`: conditionally show/lock Chats nav item based on /api/v1/config
- NormalizedEvent `.passthrough()` preserves raw `message` field through parser — content available pre-filter

</code_context>

<deferred>
## Deferred Ideas

- Full-text search with relevance ranking / fuzzy matching — simple substring is v1, upgrade later if needed
- Export conversations as markdown files
- Virtualized list for 100+ turn conversations — full scroll is adequate for v1
- Copy entire conversation button

</deferred>

---

*Phase: 10-conversations-viewer*
*Context gathered: 2026-03-05*
