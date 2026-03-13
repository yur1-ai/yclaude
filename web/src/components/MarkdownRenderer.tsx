import { useMemo } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { wrapPreformattedBlocks } from '../lib/wrapPreformattedBlocks';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
  isDark: boolean;
}

export function MarkdownRenderer({ content, isDark }: MarkdownRendererProps) {
  const preprocessed = useMemo(() => wrapPreformattedBlocks(content), [content]);

  const components: Components = {
    code({ children, className, ...rest }) {
      const match = /language-(\w+)/.exec(className ?? '');
      const text = String(children).replace(/\n$/, '');
      // Fenced code block: has language class OR is multi-line (from bare ``` fences)
      if (match || text.includes('\n')) {
        return (
          <CodeBlock language={match?.[1] ?? 'text'} isDark={isDark}>
            {text}
          </CodeBlock>
        );
      }
      // Inline code
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#21262d] text-sm font-mono"
          {...rest}
        >
          {children}
        </code>
      );
    },

    // Prevent double-wrapping: react-markdown wraps code in <pre><code>,
    // but CodeBlock already provides its own container
    pre({ children }) {
      return <>{children}</>;
    },

    a({ children, href, ...rest }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener"
          className="text-blue-600 dark:text-blue-400 hover:underline"
          {...rest}
        >
          {children}
        </a>
      );
    },

    table({ children }) {
      return <table className="border-collapse text-sm w-full my-3">{children}</table>;
    },

    th({ children }) {
      return (
        <th className="border border-slate-300 dark:border-[#30363d] px-3 py-1.5 text-left font-medium bg-slate-50 dark:bg-[#161b22]">
          {children}
        </th>
      );
    },

    td({ children }) {
      return (
        <td className="border border-slate-300 dark:border-[#30363d] px-3 py-1.5">{children}</td>
      );
    },

    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-slate-300 dark:border-[#30363d] pl-4 italic text-slate-600 dark:text-[#8b949e] my-3">
          {children}
        </blockquote>
      );
    },

    ul({ children }) {
      return <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>;
    },

    ol({ children }) {
      return <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>;
    },

    p({ children }) {
      return <p className="my-2 leading-relaxed">{children}</p>;
    },
  };

  return (
    <div className="text-sm text-slate-800 dark:text-[#e6edf3] overflow-x-auto [overflow-wrap:anywhere]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {preprocessed}
      </ReactMarkdown>
    </div>
  );
}
