---
phase: 10-conversations-viewer
plan: 03
subsystem: ui
tags: [react, react-markdown, syntax-highlighting, prism, conversations, chat-detail, markdown, tool-blocks, dark-mode]

# Dependency graph
requires:
  - phase: 10-conversations-viewer
    plan: 01
    provides: "/api/v1/chats/:id endpoint with ChatDetailResponse (summary + messages with content blocks)"
  - phase: 10-conversations-viewer
    plan: 02
    provides: "react-markdown, remark-gfm, react-syntax-highlighter installed; ChatCard 'View full conversation' button; useConfig hook"
  - phase: 08-dark-mode-personality
    provides: "Dark mode CSS vars, useThemeStore, dark token palette"
provides:
  - "MarkdownRenderer with GFM support and CodeBlock integration for syntax-highlighted code"
  - "CodeBlock with PrismLight (12 languages), copy button, language badge, light/dark themes"
  - "ToolUseBlock collapsible sections showing tool name + target with full input/result"
  - "SkillBlock collapsible section for skill/orchestrator XML tag content"
  - "MessageBubble with role-aware layout (user right-aligned, assistant full-width)"
  - "useChatDetail React Query hook for /api/v1/chats/:id"
  - "ChatDetail page with summary card, message thread, session analytics link"
  - "XML tag preprocessing pipeline (contentPreprocessor) with raw/clean toggle"
  - "Server-side XML tag stripping for chat list previews"
  - "/chats/:sessionId route in App.tsx"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "react-markdown code component override: fenced code blocks delegated to CodeBlock via className match; pre override returns children directly to prevent double-wrapping"
    - "PrismLight with explicit language registration (12 languages + 6 aliases) for tree-shaking"
    - "Content preprocessing: XML tag stripping via regex before markdown rendering, with raw/clean toggle"
    - "Tool result matching via Map<toolId, result> built from user message tool_result blocks"
    - "Server-side content cleaning: stripXmlTags applied to firstMessage/firstMessageFull in /chats endpoint"

key-files:
  created:
    - web/src/components/MarkdownRenderer.tsx
    - web/src/components/CodeBlock.tsx
    - web/src/components/ToolUseBlock.tsx
    - web/src/components/SkillBlock.tsx
    - web/src/components/MessageBubble.tsx
    - web/src/hooks/useChatDetail.ts
    - web/src/pages/ChatDetail.tsx
    - web/src/lib/contentPreprocessor.ts
  modified:
    - web/src/App.tsx
    - src/server/routes/api.ts

key-decisions:
  - "XML tag preprocessing with raw/clean toggle -- Claude system prompts contain XML tags that pollute rendered output; regex stripping with toggle preserves debugging capability"
  - "SkillBlock component for skill/orchestrator XML content -- separate from ToolUseBlock since skills are prompt context, not tool invocations"
  - "Server-side XML stripping for chat list previews -- client-side stripping caused visible flicker; moved to /chats endpoint for clean card previews"
  - "Blank message filtering after XML stripping -- messages containing only XML tags (no visible content) hidden from thread to avoid empty bubbles"
  - "PrismLight with 12 languages + 6 aliases for tree-shaking -- full Prism bundle too large; covers TypeScript, JavaScript, Python, Bash, JSON, YAML, CSS, HTML, Go, Rust, SQL, Markdown"
  - "Tool result matching via Map<toolId, result> passed to MessageBubble -- keeps tool_use and tool_result paired inline without restructuring message array"

patterns-established:
  - "Content preprocessing pipeline: stripXmlTags -> extractSkillBlocks -> clean content for MarkdownRenderer"
  - "react-markdown component overrides: code (CodeBlock delegation), pre (children passthrough), GFM element styling"
  - "Role-aware message layout: user messages right-aligned compact, assistant messages full-width with icon"

requirements-completed: [CHAT-01]

# Metrics
duration: 15min
completed: 2026-03-05
---

# Phase 10 Plan 03: Conversation Thread Viewer Summary

**Full conversation thread page with react-markdown GFM rendering, PrismLight syntax highlighting (12 languages), collapsible tool use/skill blocks, user/assistant message bubbles, XML tag preprocessing with raw/clean toggle, and server-side preview cleaning**

## Performance

- **Duration:** ~15 min (across multiple sessions including checkpoint feedback fixes)
- **Started:** 2026-03-05T09:10:00Z
- **Completed:** 2026-03-05T17:26:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 10

## Accomplishments
- Built complete markdown rendering pipeline: MarkdownRenderer wraps react-markdown with GFM, delegates fenced code blocks to CodeBlock (PrismLight with 12 registered languages, copy button, language badge, light/dark theme switching)
- Implemented collapsible ToolUseBlock showing tool name + target summary (file path, command, pattern, etc.) with full input/result expansion
- Created role-aware MessageBubble layout: user messages as right-aligned blue bubbles, assistant messages full-width with "C" avatar and metadata (model, tokens, timestamp)
- Built ChatDetail page with summary card (cost, model, duration, tokens, session analytics link), full message thread, and back navigation
- Added XML tag preprocessing pipeline (contentPreprocessor.ts) with raw/clean toggle to handle Claude system prompt XML tags polluting rendered output
- Created SkillBlock component for collapsible skill/orchestrator XML content display
- Moved XML tag stripping server-side for chat list previews to eliminate client-side flicker
- Implemented blank message filtering to hide messages that become empty after XML stripping

## Task Commits

Each task was committed atomically:

1. **Task 1: MarkdownRenderer, CodeBlock, and ToolUseBlock components** - `c641c69` (feat)
2. **Task 2: useChatDetail hook, MessageBubble, ChatDetail page, route registration** - `d439632` (feat)
3. **Task 3: Visual verification checkpoint** - APPROVED by user

### Checkpoint Feedback Fixes (post-verification refinements)

4. **XML tag preprocessing, skill blocks, raw/clean toggle** - `74972b5` (feat)
5. **Hide blank messages after XML tag stripping** - `b08ada0` (fix)
6. **Strip XML tags from chat list card previews (client-side)** - `9d08cde` (fix)
7. **Strip XML tags server-side in chat list previews** - `e4a19fa` (fix)
8. **Strip skill/orchestrator XML tags server-side, remove client cleanPreview** - `6d396e1` (fix)

## Files Created/Modified
- `web/src/components/CodeBlock.tsx` - PrismLight syntax highlighter with 12 languages, copy button, language badge, light/dark themes
- `web/src/components/MarkdownRenderer.tsx` - react-markdown wrapper with GFM, code/pre overrides, styled GFM elements (tables, blockquotes, lists, links)
- `web/src/components/ToolUseBlock.tsx` - Collapsible tool use/result section with tool name + target summary
- `web/src/components/SkillBlock.tsx` - Collapsible skill/orchestrator XML content display
- `web/src/components/MessageBubble.tsx` - Role-aware message rendering (user right-aligned, assistant full-width with icon)
- `web/src/hooks/useChatDetail.ts` - React Query hook for /api/v1/chats/:id with 403/404 error handling
- `web/src/pages/ChatDetail.tsx` - Conversation thread page with summary card, message thread, raw/clean toggle
- `web/src/lib/contentPreprocessor.ts` - XML tag stripping, skill block extraction, content cleaning utilities
- `web/src/App.tsx` - Added /chats/:sessionId route pointing to ChatDetail
- `src/server/routes/api.ts` - Server-side XML tag stripping for chat list firstMessage/firstMessageFull previews

## Decisions Made
- XML tag preprocessing with raw/clean toggle: Claude system prompts embed XML tags (skill references, orchestrator instructions) that appear as raw text in rendered output. Added regex-based stripping with a toggle so users can view raw content for debugging.
- SkillBlock as separate component from ToolUseBlock: skills are prompt context injected by Claude, not user-invoked tools -- different semantic meaning warrants distinct UI treatment.
- Server-side XML stripping for previews: initial client-side approach caused visible flicker on card rendering; moved stripping to /chats endpoint for clean server-rendered previews.
- Blank message filtering: messages containing only XML tags (e.g., pure system prompt blocks) produce empty bubbles after stripping -- these are now hidden from the thread.
- PrismLight over full Prism: full bundle too large; 12 languages (TypeScript, JavaScript, Python, Bash, JSON, YAML, CSS, HTML, Go, Rust, SQL, Markdown) plus 6 aliases cover the vast majority of code blocks in Claude conversations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] XML tag preprocessing pipeline**
- **Found during:** Task 3 (human verification checkpoint)
- **Issue:** Claude system prompts inject XML tags (`<skill>`, `<orchestrator>`, `<files_to_read>`, etc.) into message content that rendered as raw text, cluttering the conversation view
- **Fix:** Created contentPreprocessor.ts with stripXmlTags and extractSkillBlocks utilities, added raw/clean toggle to ChatDetail, created SkillBlock component for extracted skill content
- **Files modified:** web/src/lib/contentPreprocessor.ts, web/src/pages/ChatDetail.tsx, web/src/components/SkillBlock.tsx, web/src/components/MessageBubble.tsx
- **Verification:** Visual verification -- XML tags no longer pollute rendered output; raw toggle reveals original content
- **Committed in:** 74972b5, b08ada0

**2. [Rule 1 - Bug] Blank messages after XML stripping**
- **Found during:** Task 3 (during XML preprocessing implementation)
- **Issue:** Some messages contained only XML tags with no visible content; after stripping, empty message bubbles appeared in the thread
- **Fix:** Added content-length check to filter out messages with no visible text after XML tag removal
- **Files modified:** web/src/pages/ChatDetail.tsx
- **Committed in:** b08ada0

**3. [Rule 1 - Bug] XML tags in chat list card previews**
- **Found during:** Task 3 (after fixing detail page XML tags)
- **Issue:** Chat list cards showed raw XML tags in firstMessage preview text, causing visual noise
- **Fix:** Initially added client-side cleanPreview, then moved to server-side stripping in /chats endpoint for flicker-free rendering; removed client-side fallback
- **Files modified:** src/server/routes/api.ts, web/src/components/ChatCard.tsx (intermediate), then reverted ChatCard changes
- **Committed in:** 9d08cde, e4a19fa, 6d396e1

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 bugs)
**Impact on plan:** All fixes were necessary for a clean conversation viewing experience. XML tag pollution was not anticipated in the plan since it depends on real-world Claude message content structure. No scope creep -- all fixes directly support the core reading experience.

## Issues Encountered
- XML tags from Claude system prompts (skills, orchestrator instructions, file references) were not anticipated during planning since they only appear in real conversation data, not in the API contract. Required iterative fixing across detail page, card previews, and ultimately server-side stripping.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 10 (Conversations Viewer) is now COMPLETE -- all 3 plans delivered
- v1.1 milestone (Analytics Completion + Distribution) is fully delivered
- All CHAT-01 success criteria met: --show-messages gating, chat list, conversation thread, markdown rendering, Session Explorer privacy isolation

## Self-Check: PASSED

All 8 created files verified on disk. All 7 task commits (c641c69, d439632, 74972b5, b08ada0, 9d08cde, e4a19fa, 6d396e1) confirmed in git history.

---
*Phase: 10-conversations-viewer*
*Completed: 2026-03-05*
