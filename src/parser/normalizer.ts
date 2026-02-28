import type { NormalizedEvent } from './types.js';

// Normalizes a raw JSONL event object into a NormalizedEvent.
// Returns null for events that lack a uuid (e.g., file-history-snapshot, queue-operation).
// All unrecognized top-level fields are preserved via spread per user decision.
export function normalizeEvent(raw: Record<string, unknown>): NormalizedEvent | null {
  const uuid = raw['uuid'];
  const type = raw['type'];
  const timestamp = raw['timestamp'];
  const sessionId = raw['sessionId'];

  // Events without uuid are not tracked (file-history-snapshot, queue-operation)
  if (typeof uuid !== 'string' || !uuid) return null;
  if (typeof type !== 'string') return null;

  // Extract known top-level fields
  const base: NormalizedEvent = {
    uuid,
    type,
    timestamp: typeof timestamp === 'string' ? timestamp : '',
    sessionId: typeof sessionId === 'string' ? sessionId : '',
    // Preserve all other fields via passthrough
    ...extractUnknownFields(raw),
  };

  // Populate optional known fields
  if (typeof raw['requestId'] === 'string') base.requestId = raw['requestId'];
  if (typeof raw['isSidechain'] === 'boolean') base.isSidechain = raw['isSidechain'];
  if (typeof raw['agentId'] === 'string') base.agentId = raw['agentId'];
  if (typeof raw['gitBranch'] === 'string') base.gitBranch = raw['gitBranch'];
  if (typeof raw['cwd'] === 'string') base.cwd = raw['cwd'];  // ground truth for project path
  if (typeof raw['durationMs'] === 'number') base.durationMs = raw['durationMs'];

  // Extract token data from assistant events
  if (type === 'assistant') {
    const msg = raw['message'] as Record<string, unknown> | undefined;
    if (msg) {
      if (typeof msg['model'] === 'string') base.model = msg['model'];

      const usage = msg['usage'] as Record<string, unknown> | undefined;
      if (usage) {
        const cacheCreationRaw = usage['cache_creation'] as Record<string, unknown> | undefined;
        base.tokens = {
          input: toNumber(usage['input_tokens']),
          output: toNumber(usage['output_tokens']),
          cacheCreation: toNumber(usage['cache_creation_input_tokens']),
          cacheRead: toNumber(usage['cache_read_input_tokens']),
          cacheCreation5m: cacheCreationRaw
            ? toNumber(cacheCreationRaw['ephemeral_5m_input_tokens'])
            : 0,
          cacheCreation1h: cacheCreationRaw
            ? toNumber(cacheCreationRaw['ephemeral_1h_input_tokens'])
            : 0,
        };
      }
    }
  }

  return base;
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

// Spread all fields NOT already handled as named fields.
// This implements the "unknown fields pass through" user decision.
const KNOWN_FIELDS = new Set([
  'uuid', 'type', 'timestamp', 'sessionId', 'requestId',
  'isSidechain', 'agentId', 'gitBranch', 'cwd', 'durationMs', 'message',
]);

function extractUnknownFields(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN_FIELDS.has(key)) {
      result[key] = value;
    }
  }
  return result;
}
