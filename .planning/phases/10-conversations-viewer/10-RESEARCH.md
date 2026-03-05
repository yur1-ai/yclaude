# Phase 10: Conversations Viewer - Research

**Researched:** 2026-03-05
**Domain:** Chat UI rendering, markdown/syntax highlighting, privacy-gated feature flags
**Confidence:** HIGH

## Summary

Phase 10 adds a Chats tab that displays parsed conversation text from JSONL files, gated behind `--show-messages`. The implementation touches every layer: CLI flag parsing, server-side config/403 gating, privacy filter bypass, new API endpoints, frontend routing with conditional nav, and a markdown-rich chat thread UI.

The most critical architectural insight is that **message content is currently stripped at the normalizer level** -- the `message` field is in `KNOWN_FIELDS` (normalizer.ts:79), so `extractUnknownFields` excludes it. The normalizer only extracts `model` and `usage` from `message`, discarding the actual content blocks. This means the parser pipeline needs a `preserveContent` option that keeps the `message` field when `--show-messages` is active. The privacy filter (`applyPrivacyFilter`) then becomes conditional rather than always-on.

The frontend requires three new dependencies for markdown rendering: `react-markdown` (GFM markdown to React), `remark-gfm` (tables, strikethrough, task lists), and `react-syntax-highlighter` with PrismLight (syntax highlighting with controlled bundle size). These are the established standard stack for this exact use case in React applications.

**Primary recommendation:** Preserve `message` content through the parser when `showMessages=true`, skip `applyPrivacyFilter`, serve content via new `/api/v1/chats` endpoints with 403 gating, and render with react-markdown + PrismLight.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two-line card layout (not table): line 1 = project name + model + timestamp, line 2 = first user message truncated ~80 chars
- Estimated cost shown as secondary metadata (right-aligned, subtle)
- Default sort: newest first
- Filtering: project dropdown + global DateRangePicker + text search input
- Text search: case-insensitive substring match across all user and assistant messages in a conversation
- Search results highlight matching terms in the preview snippet
- Expand/collapse on each card: collapsed shows truncated preview, expanded shows full first user message (untruncated)
- "View full conversation" button in expanded state navigates to `/chats/:sessionId` (new page)
- Server-side pagination: 50 per page with prev/next buttons (same as Sessions)
- Hybrid Claude-web style: user messages as compact right-aligned bubbles, assistant responses full-width with role icon
- Timestamps on all turns + token count and model on assistant turns
- Summary card at top: project, model, duration, total cost, token breakdown -- mirrors SessionDetail pattern
- "View session analytics" link in summary card navigates to `/sessions/:id`
- Tool use blocks (Read, Write, Bash, etc.) rendered as collapsible sections between messages
- Collapsed tool block shows: tool name + target (e.g. "Read: src/server/api.ts", "Bash: npm test")
- Expand tool block to see full content/output
- Full page scroll for all messages (no virtualization) -- works with browser Cmd+F
- Full GFM for both user and assistant messages: code blocks, inline code, lists, bold/italic, links, tables, blockquotes, task lists, strikethrough
- Syntax highlighting for code blocks with language detection
- Syntax highlighting theme follows app light/dark mode
- Copy button appears on hover (top-right of code block) -- standard pattern
- Language badge on code blocks (small label showing detected language)
- New dependencies needed: react-markdown + remark-gfm + syntax highlighter + copy-to-clipboard
- Chats nav item visible but locked -- clicking shows an explanation page (not hidden entirely)
- Explanation page: paragraph explaining privacy gate + styled code block with `npx yclaude --show-messages` + "All data stays on your machine" reassurance
- Same explanation page shown on direct URL navigation to #/chats
- `/api/v1/config` endpoint returns `{ showMessages: boolean }` -- frontend reads on load to control nav and routing
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

### Deferred Ideas (OUT OF SCOPE)
- Full-text search with relevance ranking / fuzzy matching -- simple substring is v1, upgrade later if needed
- Export conversations as markdown files
- Virtualized list for 100+ turn conversations -- full scroll is adequate for v1
- Copy entire conversation button
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAT-01 | User can view conversation messages in a Chats tab, gated behind `--show-messages` opt-in flag for privacy | Full stack coverage: CLI flag, server gating, conditional privacy filter, new API endpoints, frontend chat list + thread pages, markdown rendering |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | 10.1.0 | Render markdown as React components | De facto standard for markdown in React; 10M+ weekly downloads; maintained by unified ecosystem |
| remark-gfm | 4.0.1 | GFM extensions (tables, strikethrough, task lists) | Official remark plugin for GitHub Flavored Markdown; required by user decision |
| react-syntax-highlighter | 16.1.1 | Syntax highlighting in code blocks | Battle-tested React syntax highlighter; PrismLight build for controlled bundle size; supports JSX/TSX |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | -- | copy-to-clipboard | Use `navigator.clipboard.writeText()` -- native API, no library needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-syntax-highlighter (PrismLight) | react-shiki (0.9.2) | react-shiki is pre-1.0, larger full bundle (~1.2MB gz vs ~17KB gz for PrismLight), newer/less battle-tested; Shiki produces better highlighting but overkill for local tool |
| react-syntax-highlighter (PrismLight) | @shikijs/rehype | Requires async setup, more complex integration with react-markdown; better for SSR/build-time highlighting |
| react-markdown | markdown-it + manual rendering | More control but far more code; react-markdown's component override system handles all our needs |

**Installation:**
```bash
cd web && bun add react-markdown remark-gfm react-syntax-highlighter && bun add -D @types/react-syntax-highlighter
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── server/
│   ├── cli.ts                    # Add --show-messages flag
│   ├── server.ts                 # Update AppState + createApp signature
│   └── routes/
│       └── api.ts                # Add /config, /chats, /chats/:id endpoints
├── cost/
│   └── privacy.ts                # No changes (remains unconditional)
├── parser/
│   ├── normalizer.ts             # Add preserveContent option
│   └── types.ts                  # Add ParseOptions.preserveContent
└── index.ts                      # parseAll gains preserveContent param

web/src/
├── components/
│   ├── Layout.tsx                # Conditional Chats nav item
│   ├── ChatCard.tsx              # Chat list card (new)
│   ├── MessageBubble.tsx         # User/assistant message rendering (new)
│   ├── ToolUseBlock.tsx          # Collapsible tool use section (new)
│   ├── MarkdownRenderer.tsx      # react-markdown + syntax highlighter wrapper (new)
│   └── CodeBlock.tsx             # Code block with copy button + language badge (new)
├── hooks/
│   ├── useConfig.ts              # GET /api/v1/config (new)
│   ├── useChats.ts               # GET /api/v1/chats with pagination (new)
│   └── useChatDetail.ts          # GET /api/v1/chats/:id (new)
├── pages/
│   ├── Chats.tsx                 # Chat list page (new)
│   ├── ChatDetail.tsx            # Full conversation thread page (new)
│   └── ChatsDisabled.tsx         # Explanation page when feature is off (new)
├── lib/
│   └── quips.ts                  # Add empty_chats and feature_disabled arrays
└── App.tsx                       # Add /chats and /chats/:sessionId routes
```

### Pattern 1: Privacy-Gated Data Flow
**What:** The `--show-messages` flag controls whether message content flows through the entire pipeline.
**When to use:** This is the core architecture pattern for the entire feature.

```
CLI (--show-messages flag)
  → parseAll({ preserveContent: true })
    → normalizer: include 'message' field in output (remove from KNOWN_FIELDS when preserveContent=true)
  → Conditional: if showMessages, skip applyPrivacyFilter; else apply it
  → createApp({ events, costs, rawEvents?, showMessages })
    → /api/v1/config → { showMessages: boolean }
    → /api/v1/chats → 403 if !showMessages; else build chat list from rawEvents
    → /api/v1/chats/:id → 403 if !showMessages; else build conversation thread
```

**Key insight:** Two event arrays are needed when `showMessages=true`:
1. `costs` (always privacy-filtered, used by existing endpoints) -- MUST remain unchanged to guarantee Session Explorer stays metadata-only
2. `rawEvents` (with message content preserved, used only by /chats endpoints) -- only exists when showMessages=true

This ensures Session Explorer (Phase 6) remains metadata-only **regardless** of the `--show-messages` flag per user requirement.

### Pattern 2: JSONL Message Content Extraction
**What:** Extract displayable conversation content from raw JSONL events.
**When to use:** Building the /chats and /chats/:id API responses.

JSONL event content structure (verified from actual data):
```
Event types with message content:
  type=user:
    message.content = string (plain text, e.g. commands)
    message.content = [{type: "text", text: "..."}] (structured)
    message.content = [{type: "tool_result", tool_use_id: "...", content: "...", is_error: bool}]

  type=assistant:
    message.content = [{type: "text", text: "..."}] (rendered markdown)
    message.content = [{type: "thinking", thinking: "..."}] (thinking blocks -- skip or collapse)
    message.content = [{type: "tool_use", id: "...", name: "Bash|Read|Write|...", input: {...}}]
```

Content block extraction logic:
```typescript
interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  // For text blocks
  text?: string;
  // For tool_use blocks
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolId?: string;
  // For tool_result blocks
  toolUseId?: string;
  resultContent?: string;
  isError?: boolean;
}

function extractContentBlocks(message: Record<string, unknown>): ContentBlock[] {
  const content = message.content;
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }];
  }
  if (!Array.isArray(content)) return [];
  return content.filter(isContentBlock).map(normalizeContentBlock);
}
```

### Pattern 3: Chat Card List (New Pattern)
**What:** Card-based list layout instead of SortableTable.
**When to use:** The Chats page uses a card layout (user decision), not a table.

This is a new pattern in the codebase -- all existing list pages use `SortableTable`. The card layout should follow the project's existing card styling:
```
rounded-lg border border-slate-200 bg-white p-4 shadow-sm
dark:border-[#30363d] dark:bg-[#161b22]
```

Card structure:
- Line 1: project name (bold) + model badge + timestamp (right-aligned)
- Line 2: first user message preview, truncated ~80 chars + cost (right-aligned, subtle)
- Expand/collapse toggle: show full first user message when expanded
- "View full conversation" button in expanded state

### Pattern 4: Tool Use/Result Pairing
**What:** Match tool_use blocks from assistant messages with tool_result blocks from the next user message.
**When to use:** Rendering the conversation thread in ChatDetail.

Tool use blocks appear in assistant messages as `{type: "tool_use", id: "toolu_xxx", name: "Bash", input: {command: "..."}}`.
Tool results appear in the NEXT user message as `{type: "tool_result", tool_use_id: "toolu_xxx", content: "..."}`.

The thread renderer should:
1. Render tool_use blocks inline between text blocks in the assistant message
2. Show collapsed: `"Bash: npm test"` (extract tool name + first arg)
3. Show expanded: full input and result content
4. Match tool_result to tool_use by `id === tool_use_id`

Extracting tool target for collapsed display:
```typescript
function getToolTarget(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'Read': return String(input.file_path ?? '');
    case 'Write': return String(input.file_path ?? '');
    case 'Bash': return String(input.command ?? '').slice(0, 60);
    case 'Grep': return String(input.pattern ?? '');
    case 'Glob': return String(input.pattern ?? '');
    case 'Edit': return String(input.file_path ?? '');
    case 'WebSearch': return String(input.query ?? '');
    case 'WebFetch': return String(input.url ?? '');
    default: return '';
  }
}
```

### Anti-Patterns to Avoid
- **Sending raw events to existing endpoints:** NEVER pass content-containing events to `/api/v1/sessions`, `/api/v1/summary`, etc. These must always use privacy-filtered data. Keep two separate event arrays.
- **Client-side content gating:** NEVER rely on the frontend to hide message content. The server must enforce `showMessages` -- if 403 is returned, there is simply no data to display.
- **Mutating KNOWN_FIELDS:** Don't modify the `KNOWN_FIELDS` Set at runtime. Instead, add a `preserveContent` boolean parameter to `normalizeEvent` and conditionally include `message` in the output.
- **Using `unsafe-inline` for code highlight styles:** react-syntax-highlighter uses inline styles by default (Prism engine), which works within the existing CSP (`style-src 'self' 'unsafe-inline'`). Do NOT add external CDN styles.
- **Building a custom markdown parser:** The markdown rendering requirements (GFM, code blocks, lists, tables, etc.) are extensive. Use react-markdown + remark-gfm.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown to React | Custom regex-based parser | react-markdown 10.x | GFM spec has hundreds of edge cases; react-markdown handles them all |
| Syntax highlighting | Custom tokenizer | react-syntax-highlighter PrismLight | Language grammars are complex; Prism covers 300+ languages |
| GFM extensions | Manual table/task-list parsing | remark-gfm 4.x | Tables alone have dozens of edge cases (alignment, escaping, nesting) |
| Clipboard API | clipboard.js or custom fallback | navigator.clipboard.writeText() | Native API, all modern browsers support it, no polyfill needed |
| Text search highlighting | Custom DOM manipulation | String.replace with `<mark>` in React render | Simple substring match is sufficient for v1 |

**Key insight:** The markdown rendering pipeline (react-markdown + remark-gfm + react-syntax-highlighter) is the established standard. Each library handles a specific responsibility -- attempting to combine or replace any of them leads to subtle rendering bugs.

## Common Pitfalls

### Pitfall 1: Message Field Not Available in NormalizedEvent
**What goes wrong:** Developer assumes `event.message` is available in the current pipeline output.
**Why it happens:** The normalizer (normalizer.ts:79) lists `'message'` in `KNOWN_FIELDS`, so `extractUnknownFields` explicitly excludes it. Only `model` and `usage` are extracted from `message`.
**How to avoid:** Add `preserveContent?: boolean` to `normalizeEvent`. When true, include the full `message` object in the output alongside extracted tokens/model.
**Warning signs:** `event.message` is `undefined` in API response despite JSONL containing it.

### Pitfall 2: Privacy Filter Applied to Content-Bearing Events
**What goes wrong:** `applyPrivacyFilter()` strips `message`, `content`, and `text` fields -- the exact fields needed for chat display.
**Why it happens:** The filter is applied unconditionally in cli.ts:32 (`const filtered = applyPrivacyFilter(events)`).
**How to avoid:** When `showMessages=true`, keep TWO event arrays: `rawEvents` (unfiltered, for chats) and `filtered` (privacy-filtered, for all existing endpoints). Never pass `rawEvents` to `apiRoutes` -- only to the new chats endpoints.
**Warning signs:** Chat messages appear empty; all content blocks missing.

### Pitfall 3: Session Explorer Leaking Content When showMessages=true
**What goes wrong:** Enabling `--show-messages` causes the Session Explorer to show conversation text.
**Why it happens:** If `rawEvents` is accidentally passed to the session endpoints instead of `filtered`.
**How to avoid:** Strict separation: existing `apiRoutes(state)` always uses privacy-filtered events/costs. New chats endpoints get a separate reference to `rawEvents`. Architecture ensures Session Explorer CANNOT access content.
**Warning signs:** Session detail shows message text; privacy test fails.

### Pitfall 4: react-markdown v10 Component API Change
**What goes wrong:** Code examples from older blog posts use `components={{ code({node, inline, ...}) }}` which no longer works.
**Why it happens:** react-markdown v9+ removed the `inline` prop from the `code` component. In v10, the `code` component receives `{children, className, node}` -- no `inline` prop.
**How to avoid:** Detect inline code by checking if the parent element is `<pre>`: if the code element is inside `<pre>`, it's a code block; otherwise it's inline code. Use react-shiki's `isInlineCode` utility or check `node.position` manually.
**Warning signs:** All code renders as code blocks; inline backtick code appears in `<pre>` tags.

### Pitfall 5: Tool Use/Result Mismatch
**What goes wrong:** Tool results appear disconnected from their tool use blocks.
**Why it happens:** Tool results are in the NEXT user message (`type: "tool_result"` with `tool_use_id`), not in the assistant message that invoked the tool.
**How to avoid:** Build a Map of `tool_use_id -> result` from user messages, then attach results to tool_use blocks during rendering. Process events sequentially to maintain correct ordering.
**Warning signs:** Tool blocks show "no result" despite results existing in subsequent events.

### Pitfall 6: User Message Content is Sometimes a Plain String
**What goes wrong:** Parser assumes `message.content` is always an array of blocks.
**Why it happens:** Some user events have `message.content` as a plain string (e.g., command messages like `/gsd:discuss-phase`). Others have it as `[{type: "text", text: "..."}]`.
**How to avoid:** Always normalize: `typeof content === 'string' ? [{type: 'text', text: content}] : content`.
**Warning signs:** TypeError when trying to `.map()` on a string; messages showing `[object Object]`.

### Pitfall 7: CSP Blocks Dynamic Styles
**What goes wrong:** Syntax highlighter CSS doesn't apply.
**Why it happens:** Current CSP includes `style-src 'self' 'unsafe-inline'` which should allow inline styles. But if using a CSS-file-based theme (external URL), CSP blocks it.
**How to avoid:** Use react-syntax-highlighter's inline style themes (default behavior with Prism). These use React `style` attributes, not `<link>` or `<style>` tags. The existing CSP already allows `'unsafe-inline'` styles.
**Warning signs:** Code blocks render with no colors; console shows CSP violation.

### Pitfall 8: Large Conversations Memory Pressure
**What goes wrong:** A conversation with 200+ tool calls and results creates thousands of content blocks.
**Why it happens:** Each tool invocation generates a tool_use block (assistant) + tool_result block (user), each potentially containing large file contents or command outputs.
**How to avoid:** Truncate tool_result content in the API response (e.g., first 5000 chars with "... truncated" indicator). The user deferred virtualization, but server-side truncation is still advisable.
**Warning signs:** Browser tab crashes or becomes unresponsive on long conversations.

## Code Examples

Verified patterns from the existing codebase and library documentation:

### CLI Flag Addition (Commander pattern from cli.ts)
```typescript
// src/server/cli.ts — add after existing .option() calls
.option('--show-messages', 'enable conversation text viewing in Chats tab')

// In opts type:
const opts = program.opts<{
  dir: string | undefined;
  port: string;
  open: boolean;
  showMessages: boolean; // Commander converts --show-messages to camelCase
}>();
```

### Conditional Privacy Filter (cli.ts pipeline)
```typescript
// src/server/cli.ts — modified pipeline
const events = await parseAll(
  opts.dir !== undefined ? { dir: opts.dir } : {},
);

// Always privacy-filter for existing endpoints
const filtered = applyPrivacyFilter(events);
const costs = computeCosts(filtered);

// Keep raw events only when showMessages is true
const rawEvents = opts.showMessages ? events : undefined;

const app = createApp({ events: filtered, costs, rawEvents, showMessages: opts.showMessages ?? false });
```

### Server Config Endpoint (Hono pattern from api.ts)
```typescript
// In apiRoutes function — add /config endpoint
app.get('/config', (c) => {
  return c.json({ showMessages: state.showMessages });
});

// Chats endpoint with 403 gate
app.get('/chats', (c) => {
  if (!state.showMessages || !state.rawEvents) {
    return c.json({ error: 'Conversation viewing is disabled. Start with --show-messages to enable.' }, 403);
  }
  // ... build chat list from state.rawEvents
});
```

### useConfig Hook (React Query pattern from existing hooks)
```typescript
// web/src/hooks/useConfig.ts
import { useQuery } from '@tanstack/react-query';

interface AppConfig {
  showMessages: boolean;
}

export function useConfig() {
  return useQuery<AppConfig>({
    queryKey: ['config'],
    queryFn: async () => {
      const res = await fetch('/api/v1/config');
      if (!res.ok) throw new Error('Failed to fetch config');
      return res.json() as Promise<AppConfig>;
    },
    staleTime: Infinity, // Config never changes during server lifetime
  });
}
```

### Markdown Renderer with Syntax Highlighting
```typescript
// web/src/components/MarkdownRenderer.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
// ... register additional languages as needed

SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('json', json);

// Import themes for light/dark
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
  isDark: boolean;
}

export function MarkdownRenderer({ content, isDark }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ children, className, ...rest }) {
          const match = /language-(\w+)/.exec(className ?? '');
          const isBlock = Boolean(match);

          if (isBlock && match) {
            return (
              <CodeBlock language={match[1]} isDark={isDark}>
                {String(children).replace(/\n$/, '')}
              </CodeBlock>
            );
          }

          // Inline code
          return (
            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#21262d] text-sm font-mono" {...rest}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

### CodeBlock Component with Copy + Language Badge
```typescript
// web/src/components/CodeBlock.tsx
import { useState } from 'react';

interface CodeBlockProps {
  language: string;
  isDark: boolean;
  children: string;
}

export function CodeBlock({ language, isDark, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group rounded-lg overflow-hidden my-3">
      {/* Language badge + copy button header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-[#21262d] text-xs text-slate-500 dark:text-[#8b949e]">
        <span className="font-mono">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:text-slate-700 dark:hover:text-[#e6edf3]"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={isDark ? oneDark : oneLight}
        customStyle={{ margin: 0, borderRadius: 0 }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
```

### Conditional Nav Item (Layout.tsx pattern)
```typescript
// web/src/components/Layout.tsx — modified navItems
// Replace static navItems array with dynamic list that includes conditional Chats item
function NavItems({ showMessages }: { showMessages: boolean }) {
  const baseItems = [
    { to: '/', label: 'Overview', end: true },
    { to: '/models', label: 'Models' },
    { to: '/projects', label: 'Projects' },
    { to: '/sessions', label: 'Sessions' },
  ];

  // Chats is always visible but routes to disabled page when showMessages=false
  const chatsItem = { to: '/chats', label: 'Chats', locked: !showMessages };

  return (
    <>
      {baseItems.map(/* existing NavLink rendering */)}
      <NavLink
        key="/chats"
        to="/chats"
        className={({ isActive }) =>
          `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive ? 'bg-slate-100 text-slate-900 dark:bg-[#21262d] dark:text-[#e6edf3]'
                     : 'text-slate-600 hover:bg-slate-50 dark:text-[#8b949e] dark:hover:bg-[#21262d]'
          }`
        }
      >
        Chats {!showMessages && <span className="text-xs opacity-50 ml-1">locked</span>}
      </NavLink>
    </>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-markdown v8 `components.code({inline})` | v10: no `inline` prop; detect via className/parent | react-markdown v9 (2023) | Must check `className` for `language-*` to distinguish block vs inline code |
| react-syntax-highlighter full bundle | PrismLight with manual language registration | Always available | ~17KB gz vs ~200KB+ gz; only load languages you need |
| clipboard.js library | navigator.clipboard.writeText() | Modern browsers | No library needed; works in all target environments |
| Custom markdown regexes | react-markdown + remark-gfm unified pipeline | Established since 2020 | Standard, maintained, handles edge cases |

**Deprecated/outdated:**
- react-syntax-highlighter `SyntaxHighlighter` (full Highlight.js build): Use `PrismLight` instead for bundle size
- react-markdown `components.code({inline, ...})`: `inline` prop removed in v9+
- copy-to-clipboard npm package: Use native `navigator.clipboard` API

## Open Questions

1. **How many languages to register in PrismLight?**
   - What we know: Claude Code conversations heavily feature TypeScript, JavaScript, Python, Bash, JSON, YAML, CSS, HTML, Go, Rust, SQL, Markdown
   - What's unclear: Exact set needed -- too few = unhighlighted code, too many = wasted bundle
   - Recommendation: Start with ~12 most common (ts, js, python, bash, json, yaml, css, html, go, rust, sql, markdown), add more based on user feedback. Each language adds ~1-5KB gz.

2. **Thinking block rendering**
   - What we know: Claude's thinking blocks (`{type: "thinking", thinking: "..."}`) appear in assistant messages
   - What's unclear: Whether to show them at all, collapse them, or skip them
   - Recommendation: Skip thinking blocks entirely in v1. They're internal reasoning and not part of the conversation. Can add collapsed "Thinking..." sections later if requested.

3. **Tool result content truncation threshold**
   - What we know: Some tool results contain entire file contents (10KB+)
   - What's unclear: Optimal truncation length for display
   - Recommendation: Server-side truncation at 10,000 characters with "... (truncated)" suffix. Covers most practical cases while preventing browser memory issues.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=dot` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01a | --show-messages CLI flag parsing | unit | `npx vitest run src/server/__tests__/cli.test.ts -t "show-messages" -x` | Existing file, new tests needed |
| CHAT-01b | /api/v1/config returns showMessages boolean | unit | `npx vitest run src/server/__tests__/api-chats.test.ts -t "config" -x` | New file needed |
| CHAT-01c | /api/v1/chats returns 403 without --show-messages | unit | `npx vitest run src/server/__tests__/api-chats.test.ts -t "403" -x` | New file needed |
| CHAT-01d | /api/v1/chats returns paginated chat list with showMessages=true | unit | `npx vitest run src/server/__tests__/api-chats.test.ts -t "chat list" -x` | New file needed |
| CHAT-01e | /api/v1/chats/:id returns full conversation thread | unit | `npx vitest run src/server/__tests__/api-chats.test.ts -t "chat detail" -x` | New file needed |
| CHAT-01f | Privacy filter conditional bypass preserves content when showMessages=true | unit | `npx vitest run src/cost/__tests__/privacy.test.ts -t "conditional" -x` | Existing file, new tests needed |
| CHAT-01g | Normalizer preserves message field when preserveContent=true | unit | `npx vitest run src/parser/__tests__/normalizer.test.ts -t "preserveContent" -x` | Existing file, new tests needed |
| CHAT-01h | Session Explorer endpoints remain metadata-only regardless of showMessages | unit | `npx vitest run src/server/__tests__/api-sessions.test.ts -x` | Existing file, verify existing tests cover this |
| CHAT-01i | Text search matches across user and assistant messages | unit | `npx vitest run src/server/__tests__/api-chats.test.ts -t "search" -x` | New file needed |
| CHAT-01j | Chat list / thread UI rendering | manual-only | Manual: verify card layout, markdown rendering, code blocks, tool use blocks in browser | N/A -- no frontend test framework |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=dot` (~0.5s)
- **Per wave merge:** `npx vitest run` (full output)
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] `src/server/__tests__/api-chats.test.ts` -- covers CHAT-01b through CHAT-01e, CHAT-01i
- [ ] New tests in `src/server/__tests__/cli.test.ts` -- covers CHAT-01a (--show-messages flag)
- [ ] New tests in `src/parser/__tests__/normalizer.test.ts` -- covers CHAT-01g (preserveContent)
- [ ] New tests in `src/cost/__tests__/privacy.test.ts` -- covers CHAT-01f (conditional bypass)

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/parser/normalizer.ts:79` -- `KNOWN_FIELDS` Set excludes `message` from passthrough
- Codebase inspection: `src/cost/privacy.ts:7` -- `CONTENT_FIELDS` strips `message`, `content`, `text`
- Codebase inspection: `src/server/cli.ts` -- Commander option pattern
- Codebase inspection: `src/server/routes/api.ts` -- Hono endpoint patterns, sessions pagination
- Codebase inspection: JSONL files at `~/.claude/projects/` -- verified event content structures
- npm registry: react-markdown 10.1.0, remark-gfm 4.0.1, react-syntax-highlighter 16.1.1

### Secondary (MEDIUM confidence)
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) -- component API for v10
- [react-syntax-highlighter GitHub](https://github.com/react-syntax-highlighter/react-syntax-highlighter) -- PrismLight usage
- [react-shiki npm](https://www.npmjs.com/package/react-shiki) -- v0.9.2, pre-1.0 stability concern
- [assistant-ui syntax highlighting docs](https://www.assistant-ui.com/docs/ui/SyntaxHighlighting) -- shiki vs react-syntax-highlighter comparison

### Tertiary (LOW confidence)
- Web search on bundle sizes -- exact gz numbers vary by bundler configuration

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- react-markdown + remark-gfm + react-syntax-highlighter is the established standard; versions verified via npm
- Architecture: HIGH -- data flow verified by reading actual normalizer, privacy filter, and JSONL structures; existing patterns (hooks, Hono routes, Commander) well understood
- Pitfalls: HIGH -- identified from direct codebase analysis (normalizer KNOWN_FIELDS, privacy filter CONTENT_FIELDS, JSONL content shapes)
- Library recommendations: MEDIUM -- PrismLight vs Shiki tradeoff is judgment-based; both work, PrismLight chosen for stability (16.x vs 0.9.x) and bundle size predictability

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable domain; react-markdown/remark-gfm/react-syntax-highlighter are mature)
