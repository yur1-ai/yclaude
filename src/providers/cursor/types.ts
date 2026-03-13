/**
 * Internal Cursor-specific types.
 *
 * These types map to the actual data shapes found in Cursor's state.vscdb
 * databases. They are NOT exported from the package -- only used within
 * the cursor provider module.
 */

import type { UnifiedEvent } from '../types.js';

// --- Composer Head (per-workspace state.vscdb -> ItemTable -> 'composer.composerData') ---

/** Composer metadata stored in workspace-level state.vscdb. */
export interface ComposerHead {
  composerId: string;
  createdAt: number; // epoch ms
  lastUpdatedAt?: number; // epoch ms
  unifiedMode?: 'agent' | 'chat' | 'edit' | 'debug';
  name?: string;
  subtitle?: string;
  totalLinesAdded?: number;
  totalLinesRemoved?: number;
  filesChangedCount?: number;
  committedToBranch?: string;
  createdOnBranch?: string;
  isArchived?: boolean;
  isDraft?: boolean;
  /** Post-enrichment: workspace path from workspace.json folder field. */
  workspacePath?: string;
}

// --- Full Composer Data (global state.vscdb -> cursorDiskKV -> 'composerData:<id>') ---

/** Full composer data including usage and model config from global DB. */
export interface ComposerFullData {
  composerId: string;
  _v?: number;
  unifiedMode?: string;
  forceMode?: string;
  isAgentic?: boolean;
  usageData?: Record<string, { costInCents: number; amount: number }>;
  modelConfig?: { modelName: string; maxMode?: boolean };
  fullConversationHeadersOnly?: Array<{
    bubbleId: string;
    type: number;
    serverBubbleId?: string;
  }>;
  createdAt?: number; // epoch ms
  lastUpdatedAt?: number;
}

// --- Raw Bubble (global state.vscdb -> cursorDiskKV -> 'bubbleId:<composerId>:<bubbleId>') ---

/** Raw bubble JSON shape from state.vscdb. All fields optional except type and bubbleId. */
export interface RawBubble {
  type: number; // 1=user, 2=AI
  bubbleId: string;
  _v?: number; // 2 or 3
  isAgentic?: boolean;
  tokenCount?: { inputTokens: number; outputTokens: number };
  text?: string;
  richText?: string;
  thinking?: string | Record<string, unknown>;
  thinkingDurationMs?: number;
  createdAt?: string; // ISO string (v3)
  timingInfo?: {
    clientStartTime?: number;
    clientRpcSendTime?: number; // epoch ms -- best timestamp for v2
    clientSettleTime?: number;
    clientEndTime?: number;
  };
  images?: unknown[];
  context?: Record<string, unknown>;
  toolResults?: unknown[];
  modelInfo?: Record<string, unknown>;
}

// --- Parsed Session (intermediate result) ---

/** Intermediate result after parsing a single composer. */
export interface ParsedSession {
  composerId: string;
  composerHead: ComposerHead;
  bubbles: RawBubble[];
  costData: { costInCents: number; costUsd: number; models: string[] } | null;
  isAgentic: boolean;
  sessionType: 'composer' | 'edit';
  events: UnifiedEvent[];
}

// --- Error types ---

/** Parse error marker for corrupt sessions. */
export interface ParseError {
  composerId: string;
  error: string;
  raw?: unknown;
}

// --- Schema version detection ---

/** Result of detecting bubble schema version from the database. */
export interface SchemaVersion {
  version: number;
  count: number;
}
