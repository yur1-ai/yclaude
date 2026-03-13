import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, ChatSummary } from '../hooks/useChatDetail';
import { chatToFilename, chatToMarkdown } from '../lib/chatToMarkdown';

interface ShareDropdownProps {
  summary: ChatSummary;
  messages: ChatMessage[];
}

type Status =
  | { type: 'idle' }
  | { type: 'loading'; text: string }
  | { type: 'success'; text: string }
  | { type: 'error'; text: string };

export function ShareDropdown({ summary, messages }: ShareDropdownProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Auto-clear status after 3s (but not loading — that waits for the response)
  useEffect(() => {
    if (status.type === 'idle' || status.type === 'loading') return;
    const t = setTimeout(() => setStatus({ type: 'idle' }), 3000);
    return () => clearTimeout(t);
  }, [status]);

  const getMarkdown = useCallback(
    () => chatToMarkdown(summary, messages),
    [summary, messages],
  );

  const getFilename = useCallback(
    () => `${chatToFilename(summary.displayName)}.md`,
    [summary.displayName],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getMarkdown());
      setStatus({ type: 'success', text: 'Copied!' });
    } catch {
      setStatus({ type: 'error', text: 'Copy failed' });
    }
    setOpen(false);
  }, [getMarkdown]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([getMarkdown()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFilename();
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ type: 'success', text: 'Downloaded!' });
    setOpen(false);
  }, [getMarkdown, getFilename]);

  const handleGist = useCallback(async () => {
    setOpen(false);
    const md = getMarkdown();
    setStatus({ type: 'loading', text: 'Creating gist...' });
    try {
      const res = await fetch('/api/v1/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: md, filename: getFilename() }),
      });
      const data = await res.json();
      if (data.url) {
        setStatus({ type: 'success', text: 'Gist created!' });
        window.open(data.url, '_blank', 'noopener');
      } else if (data.fallback === 'clipboard') {
        // Fallback: copy markdown + open gist.github.com
        await navigator.clipboard.writeText(md);
        window.open('https://gist.github.com', '_blank', 'noopener');
        setStatus({ type: 'error', text: data.error ?? 'Copied — paste into Gist manually' });
      } else {
        setStatus({ type: 'error', text: data.error ?? 'Gist creation failed' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Network error' });
    }
  }, [getMarkdown, getFilename]);

  const itemClass =
    'flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-[#c9d1d9] hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-500 dark:border-[#30363d] dark:bg-[#161b22] dark:text-[#8b949e] hover:text-slate-700 dark:hover:text-[#e6edf3] transition-colors"
      >
        Share &#9662;
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-[#30363d] dark:bg-[#161b22] py-1">
          <button type="button" onClick={handleCopy} className={itemClass}>
            {/* Clipboard icon */}
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3a2.25 2.25 0 00-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            Copy as Markdown
          </button>
          <button type="button" onClick={handleDownload} className={itemClass}>
            {/* Download icon */}
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download as Markdown
          </button>
          <div className="border-t border-slate-100 dark:border-[#21262d] my-1" />
          <button type="button" onClick={handleGist} className={itemClass}>
            {/* External link icon */}
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Share as Gist
          </button>
        </div>
      )}

      {/* Status toast */}
      {status.type !== 'idle' && (
        <div
          className={`absolute right-0 top-full mt-1 px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
              : status.type === 'loading'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
          } ${open ? 'hidden' : ''}`}
        >
          {status.text}
        </div>
      )}
    </div>
  );
}
