import { useState, useMemo } from 'react';
import type { ChatItem } from '../hooks/useChats';
import { hasXmlTags, processContent } from '../lib/contentPreprocessor';

/** Strip XML tags from preview text, returning clean plain text */
function cleanPreview(text: string): string {
  if (!text || !hasXmlTags(text)) return text;
  return processContent(text).text;
}

interface ChatCardProps {
  chat: ChatItem;
  searchQuery?: string;
  onViewConversation: (sessionId: string) => void;
}

/**
 * Highlights matching substrings in text by wrapping them with <mark> tags.
 * Case-insensitive matching.
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            // biome-ignore lint/suspicious/noArrayIndexKey: split parts have no stable identity
            key={i}
            className="bg-yellow-200 dark:bg-yellow-900/50 rounded-sm"
          >
            {part}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: split parts have no stable identity
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function ChatCard({ chat, searchQuery, onViewConversation }: ChatCardProps) {
  const [expanded, setExpanded] = useState(false);

  const projectName = chat.displayName;
  const formattedTime = new Date(chat.timestamp).toLocaleString();
  const costLabel = `$${chat.costUsd.toFixed(2)} est.`;
  const preview = useMemo(() => cleanPreview(chat.firstMessage), [chat.firstMessage]);
  const fullMessage = useMemo(() => cleanPreview(chat.firstMessageFull), [chat.firstMessageFull]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded((prev) => !prev);
        }
      }}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-[#30363d] dark:bg-[#161b22] cursor-pointer hover:border-slate-300 dark:hover:border-[#484f58] transition-colors"
    >
      {/* Line 1: project name, model badge, timestamp */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-slate-900 dark:text-[#e6edf3] truncate">
            {projectName}
          </span>
          <span className="text-xs bg-slate-100 dark:bg-[#21262d] text-slate-600 dark:text-[#8b949e] px-1.5 py-0.5 rounded shrink-0">
            {chat.model}
          </span>
        </div>
        <span className="text-xs text-slate-500 dark:text-[#8b949e] shrink-0">
          {formattedTime}
        </span>
      </div>

      {/* Line 2 / Expanded content */}
      {expanded ? (
        <div className="mt-2">
          <p className="text-sm text-slate-600 dark:text-[#8b949e] whitespace-pre-wrap">
            <HighlightedText text={fullMessage} query={searchQuery ?? ''} />
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-400 dark:text-[#8b949e]">
              {chat.turnCount} turn{chat.turnCount !== 1 ? 's' : ''} &middot; {costLabel}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewConversation(chat.sessionId);
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View full conversation
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-slate-500 dark:text-[#8b949e] truncate mr-2">
            <HighlightedText text={preview} query={searchQuery ?? ''} />
          </p>
          <span className="text-xs text-slate-400 dark:text-[#8b949e] shrink-0">
            {costLabel}
          </span>
        </div>
      )}
    </div>
  );
}
