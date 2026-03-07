/**
 * Provider abstraction types.
 *
 * All providers implement ProviderAdapter and produce UnifiedEvent[] arrays.
 * The registry orchestrates detection and loading across all known providers.
 */

// --- Provider identification ---

/** String literal union of all known provider identifiers. */
export type ProviderId = 'claude' | 'cursor' | 'opencode';

/** How the cost value was determined for this event. */
export type CostSource = 'estimated' | 'reported' | 'pre-calculated';

// --- Unified event model ---

/**
 * Flat event type with optional provider-specific fields.
 * Every provider adapter maps its native format into UnifiedEvent[].
 *
 * IMPORTANT: With exactOptionalPropertyTypes enabled, optional fields must
 * never be assigned `undefined` -- use conditional spread when constructing.
 */
export interface UnifiedEvent {
  // Required shared fields
  id: string;
  provider: ProviderId;
  sessionId: string;
  timestamp: string;
  type: string;
  costUsd: number;
  costSource: CostSource;

  // Optional shared fields
  model?: string;
  tokens?: {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
    cacheCreation5m: number;
    cacheCreation1h: number;
  };
  cwd?: string;
  gitBranch?: string;
  durationMs?: number;
  message?: Record<string, unknown>;

  // Claude-specific optionals
  isSidechain?: boolean;
  agentId?: string;
  requestId?: string;
  unknownModel?: boolean;

  // Cursor-specific optionals (Phase 12)
  isAgentic?: boolean;
  costInCents?: number;

  // OpenCode-specific optionals (Phase 14)
  additions?: number;
  deletions?: number;
  filesChanged?: number;
  parentSessionId?: string;
  routedProvider?: string;
}

// --- Load options ---

/** Options passed to adapter.load() */
export interface LoadOptions {
  dir?: string;
  preserveContent?: boolean;
  debug?: boolean;
}

// --- Provider adapter interface ---

/** Every provider must implement this interface. */
export interface ProviderAdapter {
  readonly id: ProviderId;
  readonly name: string;

  /** Returns true if this provider's data is available on the system. */
  detect(): Promise<boolean>;

  /** Load and normalize all events from this provider. */
  load(opts: LoadOptions): Promise<UnifiedEvent[]>;
}

// --- Provider info (returned from registry) ---

/** Status summary for a single provider after detection/loading. */
export interface ProviderInfo {
  id: ProviderId;
  name: string;
  status: 'loaded' | 'not-found' | 'error';
  eventCount: number;
  error?: string;
}
