/**
 * Detects ASCII tables, box-drawing, and pipe-heavy lines in text,
 * wrapping consecutive preformatted lines in code fences.
 *
 * Used by both MarkdownRenderer (React) and chatToMarkdown (export).
 */

/** Detect backtick-wrapped decorative separator lines (e.g. `★ Insight ─────`) */
function isDecorativeSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('`') || !trimmed.endsWith('`')) return false;
  const inner = trimmed.slice(1, -1);
  // Must contain a run of 10+ box-drawing or dash characters
  return /[─═\-]{10,}/.test(inner);
}

/** Detect if a line looks like part of an ASCII table or preformatted terminal output */
function isPreformattedLine(line: string): boolean {
  // Box-drawing characters (─ ═ │ ╔ ╗ ╚ ╝ ║ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼)
  if (/[╔╗╚╝║═─┌┐└┘│├┤┬┴┼]/.test(line)) return true;
  // Table row: 2+ pipe characters with content between them
  if ((line.match(/\|/g) ?? []).length >= 2) return true;
  // Separator line: mostly dashes/equals (>20 chars)
  if (/^[\s\-=+|]+$/.test(line) && line.trim().length > 20) return true;
  return false;
}

/** Wrap consecutive preformatted lines in code fences so they render as scrollable blocks */
export function wrapPreformattedBlocks(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let block: string[] = [];
  let inCodeFence = false;

  function flushBlock() {
    if (block.length >= 2) {
      result.push('```text', ...block, '```');
    } else {
      result.push(...block);
    }
    block = [];
  }

  for (const line of lines) {
    // Track existing code fences — don't touch content inside them
    if (line.trimStart().startsWith('```')) {
      if (block.length > 0) flushBlock();
      inCodeFence = !inCodeFence;
      result.push(line);
      continue;
    }
    if (inCodeFence) {
      result.push(line);
      continue;
    }
    if (isPreformattedLine(line)) {
      block.push(line);
    } else {
      if (block.length > 0) flushBlock();
      result.push(line);
    }
  }
  if (block.length > 0) flushBlock();

  // Ensure blank lines around backtick-wrapped decorative separators
  // so markdown renders them as distinct blocks, not inline with adjacent text
  const final: string[] = [];
  for (let i = 0; i < result.length; i++) {
    const line = result[i];
    if (isDecorativeSeparator(line)) {
      // Add blank line before if previous line is non-empty
      if (final.length > 0 && final[final.length - 1] !== '') {
        final.push('');
      }
      final.push(line);
      // Add blank line after if next line is non-empty
      if (i + 1 < result.length && result[i + 1] !== '') {
        final.push('');
      }
    } else {
      final.push(line);
    }
  }

  return final.join('\n');
}
