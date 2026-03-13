import { ClaudeAdapter } from './claude/adapter.js';
import { CursorAdapter } from './cursor/adapter.js';
import { OpenCodeAdapter } from './opencode/adapter.js';
import type { LoadOptions, ProviderAdapter, ProviderInfo, UnifiedEvent } from './types.js';

/**
 * Static list of all known provider adapters.
 * To add a new provider: import its adapter class and add an instance here.
 */
const KNOWN_ADAPTERS: ProviderAdapter[] = [
  new ClaudeAdapter(),
  new CursorAdapter(),
  new OpenCodeAdapter(),
];

/**
 * Discover and load events from all available providers.
 *
 * 1. Filters out adapters in the `exclude` list
 * 2. Detects all remaining adapters in parallel
 * 3. Loads detected providers in parallel
 * 4. Returns combined events and per-provider status info
 *
 * Provider failures are isolated: a single adapter crash does not
 * prevent other providers from loading. Errors are logged to stderr
 * with actionable hints.
 */
export async function loadProviders(
  opts: LoadOptions & { exclude?: string[] },
): Promise<{ events: UnifiedEvent[]; providers: ProviderInfo[] }> {
  // Separate exclude from LoadOptions before passing to adapters
  const { exclude, ...loadOpts } = opts;
  const excludeSet = new Set(exclude ?? []);

  const adapters = KNOWN_ADAPTERS.filter((a) => !excludeSet.has(a.id));
  const skippedAdapters = KNOWN_ADAPTERS.filter((a) => excludeSet.has(a.id));

  // Phase 1: Parallel detection
  const detectionResults = await Promise.all(
    adapters.map(async (adapter) => {
      try {
        const found = await adapter.detect();
        return { adapter, found, error: undefined };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(
          `[yclaude] Warning: ${adapter.name} detection failed: ${message}\n` +
            `  Hint: Check file permissions for ${adapter.name} data directory.\n`,
        );
        return { adapter, found: false, error: message };
      }
    }),
  );

  // Phase 2: Parallel loading of detected providers
  const detectedAdapters = detectionResults.filter((r) => r.found && !r.error);
  const loadResults = await Promise.all(
    detectedAdapters.map(async ({ adapter }) => {
      try {
        const events = await adapter.load(loadOpts);
        return { adapter, events, error: undefined };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(
          `[yclaude] Warning: ${adapter.name} loading failed: ${message}\n  Hint: Try re-running with --debug for more details.\n`,
        );
        return { adapter, events: [] as UnifiedEvent[], error: message };
      }
    }),
  );

  // Build ProviderInfo for all adapters (including excluded and not-found)
  const providers: ProviderInfo[] = [];

  // Excluded adapters
  for (const adapter of skippedAdapters) {
    providers.push({
      id: adapter.id,
      name: adapter.name,
      status: 'not-found',
      eventCount: 0,
    });
  }

  // Detection failures
  for (const result of detectionResults) {
    if (result.error) {
      providers.push({
        id: result.adapter.id,
        name: result.adapter.name,
        status: 'error',
        eventCount: 0,
        error: result.error,
      });
    } else if (!result.found) {
      providers.push({
        id: result.adapter.id,
        name: result.adapter.name,
        status: 'not-found',
        eventCount: 0,
      });
    }
  }

  // Loaded providers (success or load error)
  const allEvents: UnifiedEvent[] = [];
  for (const result of loadResults) {
    if (result.error) {
      providers.push({
        id: result.adapter.id,
        name: result.adapter.name,
        status: 'error',
        eventCount: 0,
        error: result.error,
      });
    } else {
      providers.push({
        id: result.adapter.id,
        name: result.adapter.name,
        status: 'loaded',
        eventCount: result.events.length,
      });
      allEvents.push(...result.events);
    }
  }

  return { events: allEvents, providers };
}
