/**
 * Cursor data parser.
 *
 * Converts Cursor's two-database architecture (workspace composer heads +
 * global bubble data) into UnifiedEvent arrays. This is the core extraction
 * pipeline for the Cursor provider.
 */

import { randomUUID } from 'node:crypto';
import type { UnifiedEvent } from '../types.js';
import type { ComposerHead, ComposerFullData, RawBubble } from './types.js';
import { openCursorDb, readKvEntry, readKvEntries, detectSchemaVersion, closeCursorDb } from './db.js';
import { safeParseBubble, safeParseComposerData, safeParseComposerHead } from './schema.js';
import { debugLog } from '../../shared/debug.js';

export interface ParseCursorDataOptions {
  globalDbPath: string;
  workspaces: Array<{ dbPath: string; workspacePath?: string }>;
  preserveContent?: boolean;
  debug?: boolean;
}

/**
 * Parses Cursor data from workspace and global databases into UnifiedEvent[].
 *
 * 1. Opens global DB, detects schema version.
 * 2. For each workspace: reads composer heads.
 * 3. For each composer: reads full data + bubbles from global DB.
 * 4. Converts to UnifiedEvent[] with cost, model, and agent mode extraction.
 */
export function parseCursorData(options: ParseCursorDataOptions): UnifiedEvent[] {
  const { globalDbPath, workspaces, preserveContent = false } = options;
  const allEvents: UnifiedEvent[] = [];

  const globalDb = openCursorDb(globalDbPath);

  try {
    // Detect schema version for logging
    const schemaVersion = detectSchemaVersion(globalDb);
    debugLog(`Schema version: v${schemaVersion.version} (${schemaVersion.count} samples)`);

    // Step 1: Collect all composer heads from all workspaces
    const composerHeads: ComposerHead[] = [];

    for (const workspace of workspaces) {
      let wsDb;
      try {
        wsDb = openCursorDb(workspace.dbPath);
        const raw = readKvEntry(wsDb, 'ItemTable', 'composer.composerData');
        if (raw === null) {
          debugLog(`No composer data in workspace: ${workspace.dbPath}`);
          continue;
        }

        let parsed: { allComposers?: unknown[] };
        try {
          parsed = JSON.parse(raw) as { allComposers?: unknown[] };
        } catch {
          debugLog(`Corrupt composer.composerData JSON in workspace: ${workspace.dbPath}`);
          continue;
        }

        const rawComposers = parsed.allComposers ?? [];
        for (const rawHead of rawComposers) {
          const result = safeParseComposerHead(rawHead);
          if (result.success) {
            const head: ComposerHead = {
              ...result.data,
              ...(workspace.workspacePath ? { workspacePath: workspace.workspacePath } : {}),
            };
            composerHeads.push(head);
          } else {
            debugLog(`Invalid composer head: ${result.error}`);
          }
        }
      } catch (err) {
        debugLog(`Error reading workspace DB: ${workspace.dbPath}: ${String(err)}`);
      } finally {
        if (wsDb) closeCursorDb(wsDb);
      }
    }

    debugLog(`Found ${composerHeads.length} composer heads across ${workspaces.length} workspaces`);

    // Step 2: For each composer head, read full data + bubbles from global DB
    for (const head of composerHeads) {
      try {
        const events = processComposer(globalDb, head, preserveContent);
        allEvents.push(...events);
      } catch (err) {
        debugLog(`Error processing composer ${head.composerId}: ${String(err)}`);
      }
    }
  } finally {
    closeCursorDb(globalDb);
  }

  return allEvents;
}

function processComposer(
  globalDb: ReturnType<typeof openCursorDb>,
  head: ComposerHead,
  preserveContent: boolean,
): UnifiedEvent[] {
  const composerId = head.composerId;

  // Read full composer data
  let composerData: ComposerFullData | null = null;
  const rawComposerData = readKvEntry(globalDb, 'cursorDiskKV', `composerData:${composerId}`);
  if (rawComposerData !== null) {
    try {
      const parsed = JSON.parse(rawComposerData) as unknown;
      const result = safeParseComposerData(parsed);
      if (result.success) {
        composerData = result.data;
      } else {
        debugLog(`Invalid composer data for ${composerId}: ${result.error}`);
      }
    } catch {
      debugLog(`Corrupt composer data JSON for ${composerId}`);
    }
  }

  // Read bubbles
  const rawBubbleEntries = readKvEntries(globalDb, 'cursorDiskKV', `bubbleId:${composerId}:`);
  const allBubbles: RawBubble[] = [];

  for (const entry of rawBubbleEntries) {
    try {
      const parsed = JSON.parse(entry.value) as unknown;
      const result = safeParseBubble(parsed);
      if (result.success) {
        allBubbles.push(result.data);
      } else {
        debugLog(`Invalid bubble in ${composerId}: ${result.error}`);
      }
    } catch {
      debugLog(`Corrupt bubble JSON in ${composerId}: key=${entry.key}`);
    }
  }

  // Filter: skip empty composers
  if (allBubbles.length === 0) {
    debugLog(`Skipping empty composer: ${composerId}`);
    return [];
  }

  // Separate AI and user bubbles
  const aiBubbles = allBubbles.filter((b) => b.type === 2);
  const userBubbles = allBubbles.filter((b) => b.type === 1);

  if (aiBubbles.length === 0) {
    debugLog(`Skipping composer with no AI bubbles: ${composerId}`);
    return [];
  }

  // Extract cost data
  const costData = extractCostFromComposer(composerData);
  const totalCostCents = costData?.costInCents ?? 0;
  const totalCostUsd = totalCostCents / 100;
  const costPerBubble = aiBubbles.length > 0 ? totalCostUsd / aiBubbles.length : 0;

  // Determine isAgentic
  const unifiedMode = head.unifiedMode ?? composerData?.unifiedMode;
  const isAgentic = unifiedMode === 'agent';

  // Determine model
  const model = deriveModel(composerData);

  // Compute duration: sort ALL bubbles by timestamp, duration = last - first
  const allTimestamps = allBubbles
    .map((b) => {
      const ts = getBubbleTimestamp(b, head.createdAt);
      return new Date(ts).getTime();
    })
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);

  const durationMs =
    allTimestamps.length >= 2
      ? allTimestamps[allTimestamps.length - 1]! - allTimestamps[0]!
      : undefined;

  // Create UnifiedEvent per AI bubble
  const events: UnifiedEvent[] = [];

  for (let i = 0; i < aiBubbles.length; i++) {
    const bubble = aiBubbles[i]!;
    const isFirst = i === 0;

    const timestamp = getBubbleTimestamp(bubble, head.createdAt);

    // Build tokens if available (skip zero-zero — v3 bubbles report {0,0} when no data)
    const hasTokenData =
      bubble.tokenCount &&
      (bubble.tokenCount.inputTokens > 0 || bubble.tokenCount.outputTokens > 0);
    const tokens = hasTokenData
      ? {
          input: bubble.tokenCount!.inputTokens,
          output: bubble.tokenCount!.outputTokens,
          cacheCreation: 0,
          cacheRead: 0,
          cacheCreation5m: 0,
          cacheCreation1h: 0,
        }
      : undefined;

    // Build message if preserveContent
    let message: Record<string, unknown> | undefined;
    if (preserveContent) {
      const msgFields: Record<string, unknown> = {};
      if (bubble.text !== undefined) msgFields.text = bubble.text;
      if (bubble.richText !== undefined) msgFields.richText = bubble.richText;
      if (bubble.thinking !== undefined) msgFields.thinking = bubble.thinking;
      if (bubble.images !== undefined) msgFields.images = bubble.images;
      if (Object.keys(msgFields).length > 0) {
        message = msgFields;
      }
    }

    const event: UnifiedEvent = {
      id: randomUUID(),
      provider: 'cursor',
      sessionId: composerId,
      timestamp,
      type: 'assistant',
      costUsd: costPerBubble,
      costSource: 'reported',
      // Optional fields -- conditional spread for exactOptionalPropertyTypes
      ...(model !== undefined ? { model } : {}),
      ...(tokens !== undefined ? { tokens } : {}),
      ...(head.workspacePath ? { cwd: head.workspacePath } : {}),
      ...(head.createdOnBranch ? { gitBranch: head.createdOnBranch } : {}),
      ...(isFirst && durationMs !== undefined ? { durationMs } : {}),
      ...(isAgentic !== undefined ? { isAgentic } : {}),
      ...(isFirst && totalCostCents > 0 ? { costInCents: totalCostCents } : {}),
      ...(message !== undefined ? { message } : {}),
    };

    events.push(event);
  }

  return events;
}

// --- Internal helpers ---

/**
 * Extracts timestamp as ISO string from a bubble.
 * Priority: createdAt (v3), timingInfo.clientRpcSendTime (v2), fallback epoch ms.
 */
function getBubbleTimestamp(bubble: RawBubble, fallbackEpochMs?: number): string {
  // v3: ISO string
  if (typeof bubble.createdAt === 'string' && bubble.createdAt.length > 0) {
    return bubble.createdAt;
  }
  // v2: epoch ms in timingInfo
  if (bubble.timingInfo?.clientRpcSendTime) {
    return new Date(bubble.timingInfo.clientRpcSendTime).toISOString();
  }
  // Fallback to composer head createdAt
  if (fallbackEpochMs !== undefined) {
    return new Date(fallbackEpochMs).toISOString();
  }
  // Last resort
  return new Date().toISOString();
}

/**
 * Extracts and sums costInCents from composer usageData.
 */
function extractCostFromComposer(
  composerData: ComposerFullData | null,
): { costInCents: number; models: string[] } | null {
  if (!composerData?.usageData) return null;

  const usage = composerData.usageData;
  if (typeof usage !== 'object' || Object.keys(usage).length === 0) {
    return null;
  }

  let totalCents = 0;
  const models: string[] = [];

  for (const [modelKey, data] of Object.entries(usage)) {
    if (data && typeof data === 'object' && 'costInCents' in data) {
      totalCents += data.costInCents;
      models.push(modelKey);
    }
  }

  return totalCents > 0 ? { costInCents: totalCents, models } : null;
}

/**
 * Derives model name from composer data.
 * Prefers usageData keys (actual model names) over modelConfig.modelName (often generic).
 */
function deriveModel(composerData: ComposerFullData | null): string | undefined {
  if (!composerData) return undefined;

  // Check usageData keys for actual model names
  if (composerData.usageData && Object.keys(composerData.usageData).length > 0) {
    const keys = Object.keys(composerData.usageData);
    // Prefer non-'default' keys (actual model names like 'claude-3.5-sonnet')
    const nonDefault = keys.find((k) => k !== 'default');
    if (nonDefault) return nonDefault;
    // If only 'default' key exists, fall through to modelConfig
  }

  // Fall back to modelConfig.modelName
  if (composerData.modelConfig?.modelName) {
    return composerData.modelConfig.modelName;
  }

  return undefined;
}
