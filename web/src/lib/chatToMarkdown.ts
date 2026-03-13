/**
 * Pure function to convert a chat session into a clean markdown string.
 * No React dependencies — reuses contentPreprocessor for system tag filtering.
 */
import type { ChatMessage, ChatSummary, ContentBlock } from '../hooks/useChatDetail';
import { hasXmlTags, processContent } from './contentPreprocessor';
import { wrapPreformattedBlocks } from './wrapPreformattedBlocks';

interface ChatToMarkdownOptions {
  includeToolCalls?: boolean;
  maxToolResultLines?: number;
}

const DEFAULTS: Required<ChatToMarkdownOptions> = {
  includeToolCalls: true,
  maxToolResultLines: 200,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getToolTarget(toolName: string, toolInput?: Record<string, unknown>): string {
  if (!toolInput) return '';
  const name = toolName.toLowerCase();
  if (name === 'read' || name === 'write' || name === 'edit')
    return String(toolInput.file_path ?? '');
  if (name === 'bash') {
    const cmd = String(toolInput.command ?? '');
    return cmd.length > 80 ? `${cmd.slice(0, 80)}...` : cmd;
  }
  if (name === 'grep' || name === 'glob') return String(toolInput.pattern ?? '');
  if (name === 'websearch') return String(toolInput.query ?? '');
  if (name === 'webfetch') return String(toolInput.url ?? '');
  return '';
}

function truncateLines(text: string, maxLines: number): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return `${lines.slice(0, maxLines).join('\n')}\n\n... (truncated ${lines.length - maxLines} more lines)`;
}

import { getSkillInvocation, isSystemOnlyMessage } from './messageHelpers';

/** Clean text content: strip system tags + wrap ASCII tables/box-drawing in code fences */
function cleanText(text: string): string {
  const stripped = hasXmlTags(text) ? processContent(text).text : text;
  return wrapPreformattedBlocks(stripped);
}

// ---------------------------------------------------------------------------
// Metadata table
// ---------------------------------------------------------------------------

function buildMetadataTable(summary: ChatSummary): string {
  const rows: [string, string][] = [
    ['**Date**', formatDate(summary.timestamp)],
    [
      '**Duration**',
      summary.durationMs != null ? `${(summary.durationMs / 1000).toFixed(1)}s` : '\u2014',
    ],
    [
      '**Model**',
      summary.model === 'Mixed' ? `Mixed (${summary.models.join(', ')})` : summary.model,
    ],
    ['**Git Branch**', summary.gitBranch ?? '\u2014'],
    ['**Tokens**', `${summary.totalTokens.input.toLocaleString()} in / ${summary.totalTokens.output.toLocaleString()} out`],
  ];

  // Cost row(s)
  if (summary.hasSubagents) {
    rows.push(
      ['**Total Cost**', `$${summary.totalCost.toFixed(2)} est.`],
      ['**Main Thread**', `$${summary.mainCostUsd.toFixed(2)} est.`],
      ['**Subagents**', `$${summary.subagentCostUsd.toFixed(2)} est.`],
    );
  } else {
    rows.push(['**Cost**', `$${summary.totalCost.toFixed(2)} est.`]);
  }

  const lines = ['| Field | Value |', '|-------|-------|'];
  for (const [field, value] of rows) {
    lines.push(`| ${field} | ${value} |`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Tool use -> markdown
// ---------------------------------------------------------------------------

function formatToolUse(
  block: ContentBlock,
  result: { content?: string; isError?: boolean } | undefined,
  maxResultLines: number,
): string {
  const toolName = block.toolName ?? 'unknown';
  const target = getToolTarget(toolName, block.toolInput);
  const summary = target ? `${toolName} \u2014 ${target}` : toolName;

  const parts: string[] = [`<details>`, `<summary>\uD83D\uDD27 ${summary}</summary>`, ''];

  if (block.toolInput) {
    parts.push('**Input:**', '````json', JSON.stringify(block.toolInput, null, 2), '````', '');
  }

  if (result?.content != null) {
    const label = result.isError ? '**Error:**' : '**Result:**';
    const truncated = truncateLines(result.content, maxResultLines);
    parts.push(label, '````', truncated, '````', '');
  }

  parts.push('</details>', '');
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function chatToMarkdown(
  summary: ChatSummary,
  messages: ChatMessage[],
  options?: ChatToMarkdownOptions,
): string {
  const opts = { ...DEFAULTS, ...options };

  // Build tool results map: toolUseId -> { content, isError }
  const toolResults = new Map<string, { content?: string; isError?: boolean }>();
  for (const msg of messages) {
    for (const block of msg.content) {
      if (block.type === 'tool_result' && block.toolUseId) {
        toolResults.set(block.toolUseId, {
          content: block.resultContent,
          isError: block.isError,
        });
      }
    }
  }

  const out: string[] = [];

  // Header
  out.push(`# ${summary.displayName} \u2014 Chat Session`, '');

  // Metadata table
  out.push(buildMetadataTable(summary), '');
  out.push('---', '');

  // Messages
  for (const msg of messages) {
    // Skill invocation separator
    const skillInvocation = getSkillInvocation(msg);
    if (skillInvocation) {
      out.push(`--- /${skillInvocation} ---`, '');
      continue;
    }

    // Skip system-only messages
    if (isSystemOnlyMessage(msg)) continue;

    const time = formatTime(msg.timestamp);

    if (msg.role === 'user') {
      out.push(`**User** \u2014 ${time}`, '');

      for (const block of msg.content) {
        if (block.type === 'text' && block.text) {
          const cleaned = cleanText(block.text);
          if (cleaned) out.push(cleaned, '');
        }
      }

      out.push('---', '');
    } else {
      // Assistant
      const modelTag = msg.model ? ` *(${msg.model})*` : '';
      out.push(`**Assistant**${modelTag} \u2014 ${time}`, '');

      for (const block of msg.content) {
        if (block.type === 'text' && block.text) {
          const cleaned = cleanText(block.text);
          if (cleaned) out.push(cleaned, '');
        }

        if (block.type === 'tool_use' && opts.includeToolCalls) {
          const result = block.toolId ? toolResults.get(block.toolId) : undefined;
          out.push(formatToolUse(block, result, opts.maxToolResultLines));
        }
      }

      out.push('---', '');
    }
  }

  // Footer
  out.push('*Generated by [yclaude](https://github.com/yur1-ai/yclaude)*', '');

  return out.join('\n');
}

/** Generate a safe filename from a display name */
export function chatToFilename(displayName: string): string {
  return (
    displayName
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 60) || 'chat'
  );
}
