import { useState } from 'react';
import type { SkillSection } from '../lib/contentPreprocessor';

interface SkillBlockProps {
  skillName: string;
  sections: SkillSection[];
}

/** Format tag names for display: execution_context -> Execution Context */
function formatTagName(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SkillBlock({ skillName, sections }: SkillBlockProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/20 my-2 text-xs">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 cursor-pointer text-left"
      >
        <span className="shrink-0 text-[10px] text-purple-500 dark:text-purple-400">
          {expanded ? '\u25BC' : '\u25B6'}
        </span>
        <span className="font-mono text-purple-700 dark:text-purple-300 font-medium">
          {skillName}
        </span>
        <span className="text-purple-400 dark:text-purple-500">
          {sections.length} section{sections.length !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Expanded sections */}
      {expanded && (
        <div className="border-t border-purple-200 dark:border-purple-900/50 px-3 py-2 space-y-3">
          {sections.map((section) => (
            <SkillSectionItem
              key={`${section.tag}-${section.content.slice(0, 20)}`}
              section={section}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SkillSectionItem({ section }: { section: SkillSection }) {
  const [open, setOpen] = useState(false);
  const preview = section.content.split('\n')[0].slice(0, 100);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-left w-full"
      >
        <span className="text-[10px] text-purple-400">{open ? '\u25BC' : '\u25B6'}</span>
        <span className="text-[10px] uppercase tracking-wide text-purple-500 dark:text-purple-400 font-medium">
          {formatTagName(section.tag)}
        </span>
        {!open && <span className="text-slate-400 dark:text-[#484f58] truncate">{preview}</span>}
      </button>
      {open && (
        <pre className="mt-1 text-xs bg-purple-100/50 dark:bg-purple-950/30 rounded p-2 overflow-auto max-h-[300px] whitespace-pre-wrap text-slate-700 dark:text-[#8b949e]">
          {section.content}
        </pre>
      )}
    </div>
  );
}
