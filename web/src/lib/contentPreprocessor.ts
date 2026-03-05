/**
 * Content preprocessor for conversation viewer.
 *
 * Handles XML tags injected by Claude Code runtime (system metadata)
 * and skill/plugin orchestrators (GSD, etc.).
 *
 * System tags are stripped entirely.
 * Skill tags are extracted as structured sections for collapsible rendering.
 */

/** Tags that are pure system metadata — always stripped */
const SYSTEM_TAGS = [
  'command-name',
  'command-message',
  'command-args',
  'local-command-caveat',
  'system-reminder',
  'local-command-stdout',
] as const;

/** Tags from skill/orchestrator prompts — extracted as collapsible sections */
const SKILL_TAGS = [
  'objective',
  'execution_context',
  'context',
  'process',
  'tasks',
  'success_criteria',
  'verification',
  'output',
  'files_to_read',
  'behavior',
  'action',
  'interfaces',
] as const;

export interface SkillSection {
  tag: string;
  content: string;
}

export interface ProcessedContent {
  /** Cleaned text with system tags removed and skill tags extracted */
  text: string;
  /** Extracted skill sections for collapsible rendering */
  skillSections: SkillSection[];
  /** Whether this message is purely system/skill metadata with no user content */
  isSystemOnly: boolean;
  /** Detected skill name if this is a skill invocation */
  skillName: string | null;
}

/** Build a regex that matches a specific XML tag and its content (including nested tags) */
function tagRegex(tagName: string): RegExp {
  // Match opening tag, capture content (non-greedy), match closing tag
  // Use the 'gs' flags: g for global, s for dotAll (. matches newline)
  return new RegExp(`<${tagName}[^>]*>[\\s\\S]*?</${tagName}>`, 'g');
}

/** Strip all instances of system tags from text */
function stripSystemTags(text: string): string {
  let result = text;
  for (const tag of SYSTEM_TAGS) {
    result = result.replace(tagRegex(tag), '');
  }
  return result;
}

/** Extract skill sections from text, returning cleaned text and extracted sections */
function extractSkillSections(text: string): { cleaned: string; sections: SkillSection[] } {
  let cleaned = text;
  const sections: SkillSection[] = [];

  for (const tag of SKILL_TAGS) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g');
    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
    while ((match = regex.exec(text)) !== null) {
      sections.push({
        tag,
        content: match[1].trim(),
      });
    }
    cleaned = cleaned.replace(tagRegex(tag), '');
  }

  return { cleaned, sections };
}

/** Detect skill name from command-name tag or skill-like patterns */
function detectSkillName(text: string): string | null {
  // Try command-name tag first
  const cmdMatch = /<command-name>\/?([^<]+)<\/command-name>/.exec(text);
  if (cmdMatch) {
    return cmdMatch[1].trim();
  }

  // Try command-message tag
  const msgMatch = /<command-message>([^<]+)<\/command-message>/.exec(text);
  if (msgMatch) {
    return msgMatch[1].trim();
  }

  return null;
}

/** Process message content: strip system tags, extract skill sections */
export function processContent(text: string): ProcessedContent {
  const skillName = detectSkillName(text);
  const stripped = stripSystemTags(text);
  const { cleaned, sections } = extractSkillSections(stripped);

  // Collapse multiple blank lines into max 2
  const normalized = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  // A message is "system only" if after stripping all tags, very little content remains
  const isSystemOnly = normalized.length < 10 && sections.length > 0;

  return {
    text: normalized,
    skillSections: sections,
    isSystemOnly,
    skillName,
  };
}

/** Quick check: does this text contain any XML tags we handle? */
export function hasXmlTags(text: string): boolean {
  const allTags = [...SYSTEM_TAGS, ...SKILL_TAGS];
  return allTags.some((tag) => text.includes(`<${tag}`));
}
