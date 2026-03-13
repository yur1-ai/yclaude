/**
 * Zod validation schemas for Cursor state.vscdb data.
 *
 * All schemas use .passthrough() for forward compatibility -- unknown fields
 * from future Cursor versions are preserved, not rejected.
 */

import { z } from 'zod';
import type { ComposerFullData, ComposerHead, RawBubble } from './types.js';

// --- Bubble schema ---

export const BubbleSchema = z
  .object({
    type: z.number(),
    bubbleId: z.string(),
    _v: z.number().optional(),
    isAgentic: z.boolean().optional(),
    tokenCount: z
      .object({
        inputTokens: z.number(),
        outputTokens: z.number(),
      })
      .optional(),
    text: z.string().optional(),
    richText: z.string().optional(),
    thinking: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    thinkingDurationMs: z.number().optional(),
    createdAt: z.string().optional(),
    timingInfo: z
      .object({
        clientStartTime: z.number().optional(),
        clientRpcSendTime: z.number().optional(),
        clientSettleTime: z.number().optional(),
        clientEndTime: z.number().optional(),
      })
      .passthrough()
      .optional(),
    images: z.array(z.unknown()).optional(),
    context: z.record(z.string(), z.unknown()).optional(),
    toolResults: z.array(z.unknown()).optional(),
    modelInfo: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

// --- Composer full data schema ---

export const ComposerFullDataSchema = z
  .object({
    composerId: z.string(),
    _v: z.number().optional(),
    unifiedMode: z.string().optional(),
    forceMode: z.string().optional(),
    isAgentic: z.boolean().optional(),
    usageData: z
      .record(
        z.string(),
        z.object({
          costInCents: z.number(),
          amount: z.number(),
        }),
      )
      .optional(),
    modelConfig: z
      .object({
        modelName: z.string(),
        maxMode: z.boolean().optional(),
      })
      .optional(),
    fullConversationHeadersOnly: z
      .array(
        z.object({
          bubbleId: z.string(),
          type: z.number(),
          serverBubbleId: z.string().optional(),
        }),
      )
      .optional(),
    createdAt: z.number().optional(),
    lastUpdatedAt: z.number().optional(),
  })
  .passthrough();

// --- Composer head schema ---

export const ComposerHeadSchema = z
  .object({
    composerId: z.string(),
    createdAt: z.number().optional(),
    lastUpdatedAt: z.number().optional(),
    unifiedMode: z.enum(['agent', 'chat', 'edit', 'debug']).optional(),
    name: z.string().optional(),
    subtitle: z.string().optional(),
    totalLinesAdded: z.number().optional(),
    totalLinesRemoved: z.number().optional(),
    filesChangedCount: z.number().optional(),
    committedToBranch: z.string().optional(),
    createdOnBranch: z.string().optional(),
    isArchived: z.boolean().optional(),
    isDraft: z.boolean().optional(),
  })
  .passthrough();

// --- Safe parse wrappers ---

export function safeParseBubble(
  raw: unknown,
): { success: true; data: RawBubble } | { success: false; error: string } {
  const result = BubbleSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data as RawBubble };
  }
  return { success: false, error: result.error.message };
}

export function safeParseComposerData(
  raw: unknown,
): { success: true; data: ComposerFullData } | { success: false; error: string } {
  const result = ComposerFullDataSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data as ComposerFullData };
  }
  return { success: false, error: result.error.message };
}

export function safeParseComposerHead(
  raw: unknown,
): { success: true; data: ComposerHead } | { success: false; error: string } {
  const result = ComposerHeadSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data as ComposerHead };
  }
  return { success: false, error: result.error.message };
}
