import { z } from 'zod';

// Raw cache_creation sub-object (two token tiers)
export const RawCacheCreationSchema = z.object({
  ephemeral_5m_input_tokens: z.number().default(0),
  ephemeral_1h_input_tokens: z.number().default(0),
}).passthrough();

// Raw usage object from message.usage
export const RawAssistantUsageSchema = z.object({
  input_tokens: z.number().default(0),
  output_tokens: z.number().default(0),
  cache_creation_input_tokens: z.number().default(0),
  cache_read_input_tokens: z.number().default(0),
  cache_creation: RawCacheCreationSchema.optional(),
  server_tool_use: z.record(z.string(), z.unknown()).optional(),
  service_tier: z.string().optional(),
  inference_geo: z.string().optional(),
  speed: z.string().optional(),
  iterations: z.array(z.unknown()).optional(),
}).passthrough();

// Permissive raw event schema — all top-level fields optional
// except type, which is always present. .passthrough() required per user decision.
export const RawEventSchema = z.object({
  uuid: z.string().optional(),
  type: z.string(),
  timestamp: z.string().optional(),
  sessionId: z.string().optional(),
  requestId: z.string().optional(),
  isSidechain: z.boolean().optional(),
  agentId: z.string().optional(),
  gitBranch: z.string().optional(),
  cwd: z.string().optional(),
  slug: z.string().optional(),
  version: z.string().optional(),
  durationMs: z.number().optional(),
  message: z.object({
    model: z.string().optional(),
    usage: RawAssistantUsageSchema.optional(),
  }).passthrough().optional(),
}).passthrough();

export type RawEvent = z.infer<typeof RawEventSchema>;
