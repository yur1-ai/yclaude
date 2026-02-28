import { z } from 'zod';

// The canonical output type of the parser.
// Phase 2 (Cost Engine) consumes NormalizedEvent[] directly.
// .passthrough() on the schema ensures unknown fields from future Claude Code versions
// are preserved — Phase 2 can consume new fields without requiring a parser change.
export const NormalizedEventSchema = z.object({
  uuid: z.string(),
  type: z.string(),
  timestamp: z.string(),
  sessionId: z.string(),
  // Token data — only present on assistant events
  tokens: z.object({
    input: z.number(),
    output: z.number(),
    cacheCreation: z.number(),      // total cache write (sum of 5m + 1h tiers)
    cacheRead: z.number(),
    cacheCreation5m: z.number(),    // ephemeral 5-minute tier (1.25x pricing)
    cacheCreation1h: z.number(),    // ephemeral 1-hour tier (2x pricing)
  }).optional(),
  model: z.string().optional(),
  requestId: z.string().optional(),
  isSidechain: z.boolean().optional(),   // true = subagent event
  agentId: z.string().optional(),        // present when isSidechain = true
  gitBranch: z.string().optional(),
  cwd: z.string().optional(),            // ACTUAL project path (not slug)
  durationMs: z.number().optional(),     // from system/turn_duration events
}).passthrough();  // preserve unknown fields — future-proof per user decision

export type NormalizedEvent = z.infer<typeof NormalizedEventSchema>;

// Options accepted by the public parseAll() API
export interface ParseOptions {
  dir?: string;     // --dir flag: override default discovery paths
  debug?: boolean;  // --debug flag: enable verbose stderr logging
}
