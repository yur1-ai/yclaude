/**
 * Shared message classification helpers.
 * Used by both ChatDetail (React rendering) and chatToMarkdown (pure export).
 */
import type { ChatMessage } from '../hooks/useChatDetail';
import { hasXmlTags, processContent } from './contentPreprocessor';

/** Check if a message is purely system/skill metadata with no real content */
export function isSystemOnlyMessage(msg: ChatMessage): boolean {
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
export function getSkillInvocation(msg: ChatMessage): string | null {
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
