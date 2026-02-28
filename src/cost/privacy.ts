import type { NormalizedEvent } from '../parser/types.js';

// Fields that may carry conversation text — stripped at the library boundary.
// 'message' carries raw assistant/user message objects passed through by the parser's
// .passthrough() schema. 'content' and 'text' are additional field names observed in
// JSONL and future Claude Code versions.
const CONTENT_FIELDS = new Set(['message', 'content', 'text']);

/**
 * Strips all conversation content fields from a NormalizedEvent array.
 *
 * This is the explicit, testable privacy boundary: no user messages or assistant
 * responses will reach any downstream consumer after calling this function.
 * The filter is a pure function — it does not mutate input events and has no
 * dependency on the cost engine.
 *
 * Fields stripped: message, content, text
 * Fields preserved: all required NormalizedEvent fields plus any other passthrough fields
 */
export function applyPrivacyFilter(events: NormalizedEvent[]): NormalizedEvent[] {
  return events.map(stripContentFields);
}

function stripContentFields(event: NormalizedEvent): NormalizedEvent {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event)) {
    if (!CONTENT_FIELDS.has(key)) {
      filtered[key] = value;
    }
  }
  // Cast is safe: we only remove extra passthrough fields.
  // All required NormalizedEvent fields (uuid, type, timestamp, sessionId) contain
  // no conversation text — they are never in CONTENT_FIELDS.
  return filtered as NormalizedEvent;
}
