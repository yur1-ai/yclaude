import { useState } from 'react';

interface ToolUseBlockProps {
  toolName: string;
  toolInput?: Record<string, unknown>;
  toolId?: string;
  result?: { content?: string; isError?: boolean };
}

function getToolTarget(toolName: string, toolInput?: Record<string, unknown>): string {
  if (!toolInput) return '';
  const name = toolName.toLowerCase();

  if (name === 'read' || name === 'write' || name === 'edit') {
    return String(toolInput.file_path ?? '');
  }
  if (name === 'bash') {
    const cmd = String(toolInput.command ?? '');
    return cmd.length > 60 ? `${cmd.slice(0, 60)}...` : cmd;
  }
  if (name === 'grep' || name === 'glob') {
    return String(toolInput.pattern ?? '');
  }
  if (name === 'websearch') {
    return String(toolInput.query ?? '');
  }
  if (name === 'webfetch') {
    return String(toolInput.url ?? '');
  }
  return '';
}

export function ToolUseBlock({ toolName, toolInput, result }: ToolUseBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const target = getToolTarget(toolName, toolInput);
  const summary = target ? `${toolName}: ${target}` : toolName;

  return (
    <div className="rounded border border-slate-200 dark:border-[#30363d] bg-slate-50 dark:bg-[#0d1117] my-2 text-xs font-mono text-slate-600 dark:text-[#8b949e]">
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 cursor-pointer text-left"
      >
        <span className="shrink-0 text-[10px]">{expanded ? '\u25BC' : '\u25B6'}</span>
        <span className="truncate">{summary}</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-200 dark:border-[#30363d] px-3 py-2 space-y-2">
          {/* Tool input */}
          {toolInput && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-[#484f58] mb-1">
                Input
              </p>
              <pre className="text-xs bg-slate-100 dark:bg-[#161b22] rounded p-2 overflow-auto max-h-[300px] whitespace-pre-wrap">
                {JSON.stringify(toolInput, null, 2)}
              </pre>
            </div>
          )}

          {/* Tool result */}
          {result?.content != null && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-[#484f58] mb-1">
                Result
              </p>
              <pre
                className={`text-xs rounded p-2 overflow-auto max-h-[300px] whitespace-pre-wrap ${
                  result.isError
                    ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-[#161b22]'
                }`}
              >
                {result.content}
              </pre>
              {result.content.endsWith('... (truncated)') && (
                <p className="text-[10px] text-slate-400 dark:text-[#484f58] mt-1 italic">
                  Output was truncated
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
