import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { MessageBubble } from '../components/MessageBubble';
import { useChatDetail } from '../hooks/useChatDetail';
import type { ChatMessage } from '../hooks/useChatDetail';
import { useConfig } from '../hooks/useConfig';
import { hasXmlTags, processContent } from '../lib/contentPreprocessor';

/** Check if a message is purely system/skill metadata with no real content */
function isSystemOnlyMessage(msg: ChatMessage): boolean {
  // Only filter user messages — assistant messages always have real content
  if (msg.role !== 'user') return false;

  for (const block of msg.content) {
    if (block.type === 'text' && block.text) {
      if (!hasXmlTags(block.text)) return false;
      const processed = processContent(block.text);
      if (!processed.isSystemOnly) return false;
    }
  }
  return true;
}

/** Detect if a message is a skill invocation separator */
function getSkillInvocation(msg: ChatMessage): string | null {
  if (msg.role !== 'user') return null;
  for (const block of msg.content) {
    if (block.type === 'text' && block.text && hasXmlTags(block.text)) {
      const processed = processContent(block.text);
      if (processed.isSystemOnly && processed.skillName) {
        return processed.skillName;
      }
    }
  }
  return null;
}

export default function ChatDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: config, isLoading: configLoading } = useConfig();
  const { data, isLoading, isError, error } = useChatDetail(sessionId);
  const isDark = document.documentElement.classList.contains('dark');
  const [showRaw, setShowRaw] = useState(false);

  // Build tool results map: toolUseId -> { content, isError }
  const toolResults = useMemo(() => {
    const map = new Map<string, { content?: string; isError?: boolean }>();
    if (!data?.messages) return map;
    for (const msg of data.messages) {
      for (const block of msg.content) {
        if (block.type === 'tool_result' && block.toolUseId) {
          map.set(block.toolUseId, {
            content: block.resultContent,
            isError: block.isError,
          });
        }
      }
    }
    return map;
  }, [data?.messages]);

  if (configLoading || isLoading) {
    return (
      <p className="text-slate-500 dark:text-[#8b949e] text-sm p-8">Loading conversation...</p>
    );
  }

  if (isError) {
    const is403 = error instanceof Error && error.message === 'Conversation viewing is disabled';
    const is404 = error instanceof Error && error.message === 'Conversation not found';
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-[#e6edf3]">
          {is404 ? 'Conversation Not Found' : is403 ? 'Feature Disabled' : 'Error'}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-[#8b949e]">
          {is404
            ? 'This conversation does not exist or has no recorded messages.'
            : is403
              ? 'Conversation viewing requires the --show-messages flag.'
              : 'Failed to load conversation details.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/chats')}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          &larr; Back to chats
        </button>
      </div>
    );
  }

  if (!data || !config?.showMessages) return null;

  const { summary, messages } = data;

  const stats: { label: string; value: string }[] = [
    ...(summary.hasSubagents
      ? [
          { label: 'Total Cost', value: `$${summary.totalCost.toFixed(2)} est.` },
          { label: 'Main Thread', value: `$${summary.mainCostUsd.toFixed(2)} est.` },
          { label: 'Subagents', value: `$${summary.subagentCostUsd.toFixed(2)} est.` },
        ]
      : [{ label: 'Total Cost', value: `$${summary.totalCost.toFixed(2)} est.` }]),
    {
      label: 'Model',
      value: summary.model === 'Mixed' ? `Mixed (${summary.models.join(', ')})` : summary.model,
    },
    { label: 'Project', value: summary.displayName },
    {
      label: 'Duration',
      value: summary.durationMs != null ? `${(summary.durationMs / 1000).toFixed(1)}s` : '\u2014',
    },
    { label: 'Started', value: new Date(summary.timestamp).toLocaleString() },
    { label: 'Git Branch', value: summary.gitBranch ?? '\u2014' },
    { label: 'Input Tokens', value: summary.totalTokens.input.toLocaleString() },
    { label: 'Output Tokens', value: summary.totalTokens.output.toLocaleString() },
    {
      label: 'Cache Creation',
      value: summary.totalTokens.cacheCreation.toLocaleString(),
    },
    { label: 'Cache Read', value: summary.totalTokens.cacheRead.toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
        Conversation content is displayed because --show-messages was used. This data stays local.
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/chats')}
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-[#8b949e] dark:hover:text-[#e6edf3]"
          >
            &larr; Chats
          </button>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-[#e6edf3]">
            {summary.displayName}
          </h1>
        </div>

        {/* Raw/Clean toggle */}
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
            showRaw
              ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
              : 'border-slate-200 bg-white text-slate-500 dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#8b949e]'
          }`}
        >
          {showRaw ? 'Show clean' : 'Show raw'}
        </button>
      </div>

      {/* Summary card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-[#e6edf3]">Summary</h2>
          <button
            type="button"
            onClick={() => navigate(`/sessions/${summary.sessionId}`)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            View session analytics &rarr;
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {stats.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-500 dark:text-[#8b949e] uppercase tracking-wide">
                {label}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-[#e6edf3]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Message thread */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-[#e6edf3] mb-4">
          Conversation
        </h2>
        <div className="divide-y divide-slate-100 dark:divide-[#21262d]">
          {messages.map((msg, i) => {
            // In clean mode, replace system-only messages with a separator
            if (!showRaw) {
              const skillInvocation = getSkillInvocation(msg);
              if (skillInvocation) {
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-3 text-xs text-slate-400 dark:text-[#484f58]"
                  >
                    <div className="flex-1 border-t border-slate-200 dark:border-[#21262d]" />
                    <span className="font-mono shrink-0">/{skillInvocation}</span>
                    <div className="flex-1 border-t border-slate-200 dark:border-[#21262d]" />
                  </div>
                );
              }
              if (isSystemOnlyMessage(msg)) {
                return null; // Hide pure system messages entirely
              }
            }

            return (
              <MessageBubble
                key={i}
                message={msg}
                toolResults={toolResults}
                isDark={isDark}
                showRaw={showRaw}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
