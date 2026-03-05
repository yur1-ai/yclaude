import { useMemo } from 'react';
import type { ChatMessage } from '../hooks/useChatDetail';
import { hasXmlTags, processContent } from '../lib/contentPreprocessor';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SkillBlock } from './SkillBlock';
import { ToolUseBlock } from './ToolUseBlock';

interface MessageBubbleProps {
  message: ChatMessage;
  toolResults: Map<string, { content?: string; isError?: boolean }>;
  isDark: boolean;
  showRaw?: boolean;
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTokens(tokens: { input: number; output: number }): string {
  return `${tokens.input.toLocaleString()} in, ${tokens.output.toLocaleString()} out`;
}

/** Process a text block through the content preprocessor */
function useProcessedText(text: string, showRaw: boolean) {
  return useMemo(() => {
    if (showRaw || !hasXmlTags(text)) {
      return { text, skillSections: [], isSystemOnly: false, skillName: null };
    }
    return processContent(text);
  }, [text, showRaw]);
}

function TextBlockContent({
  text,
  isDark,
  showRaw,
}: { text: string; isDark: boolean; showRaw: boolean }) {
  const processed = useProcessedText(text, showRaw);

  return (
    <>
      {/* Skill invocation block (if detected) */}
      {processed.skillSections.length > 0 && (
        <SkillBlock
          skillName={processed.skillName ?? 'Skill Prompt'}
          sections={processed.skillSections}
        />
      )}
      {/* Remaining text content */}
      {processed.text && <MarkdownRenderer content={processed.text} isDark={isDark} />}
    </>
  );
}

export function MessageBubble({ message, toolResults, isDark, showRaw = false }: MessageBubbleProps) {
  const { role, content, timestamp, model, tokens } = message;

  if (role === 'user') {
    // Check if this user message has any visible content after processing
    if (!showRaw) {
      const hasVisibleContent = content.some((block) => {
        if (block.type !== 'text' || !block.text) return false;
        if (!hasXmlTags(block.text)) return true;
        const processed = processContent(block.text);
        return processed.text.length > 0 || processed.skillSections.length > 0;
      });
      if (!hasVisibleContent) return null;
    }

    return (
      <div className="flex justify-end my-4">
        <div className="max-w-[80%]">
          <div className="rounded-2xl rounded-br-sm px-4 py-3 bg-blue-600 text-white dark:bg-blue-700">
            {/* User message markdown with white text override */}
            <div className="[&_*]:!text-white [&_.text-sm]:!text-white [&_code]:!bg-blue-500/30 [&_code]:!text-white [&_a]:!text-blue-200">
              {content.map((block, i) => {
                if (block.type === 'text' && block.text) {
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: content blocks have no stable id
                    <div key={i}>
                      <TextBlockContent text={block.text} isDark={isDark} showRaw={showRaw} />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-[#8b949e] text-right mt-1">
            {formatTimestamp(timestamp)}
          </p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex gap-3 my-4">
      {/* Role icon */}
      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-sm font-bold shrink-0">
        C
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        {/* Metadata row */}
        <div className="flex items-center gap-3 mb-1">
          {model && (
            <span className="text-xs font-medium text-slate-500 dark:text-[#8b949e]">{model}</span>
          )}
          {tokens && (
            <span className="text-xs text-slate-400 dark:text-[#8b949e]">
              {formatTokens(tokens)}
            </span>
          )}
          <span className="text-xs text-slate-400 dark:text-[#8b949e]">
            {formatTimestamp(timestamp)}
          </span>
        </div>

        {/* Content blocks */}
        {content.map((block, i) => {
          if (block.type === 'text' && block.text) {
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: content blocks have no stable id
              <div key={i}>
                <TextBlockContent text={block.text} isDark={isDark} showRaw={showRaw} />
              </div>
            );
          }

          if (block.type === 'tool_use') {
            const matchedResult = block.toolId ? toolResults.get(block.toolId) : undefined;
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: content blocks have no stable id
              <div key={i}>
                <ToolUseBlock
                  toolName={block.toolName ?? 'unknown'}
                  toolInput={block.toolInput}
                  toolId={block.toolId}
                  result={matchedResult}
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
