/**
 * Provider display helpers: colors, names, and filter types.
 *
 * ProviderId is re-declared here (matching src/providers/types.ts) to avoid
 * cross-package imports -- the web tsconfig only includes web/src.
 */

export type ProviderId = 'claude' | 'cursor' | 'opencode';

export type ProviderFilter = ProviderId | 'all';

/** Per-provider brand colors for light and dark themes. */
export const PROVIDER_COLORS: Record<ProviderFilter, { light: string; dark: string }> = {
  claude: { light: '#7c3aed', dark: '#a78bfa' },
  cursor: { light: '#22c55e', dark: '#4ade80' },
  opencode: { light: '#f59e0b', dark: '#fbbf24' },
  all: { light: '#3b82f6', dark: '#60a5fa' },
};

/** Human-readable provider names. */
export const PROVIDER_NAMES: Record<ProviderId, string> = {
  claude: 'Claude Code',
  cursor: 'Cursor',
  opencode: 'OpenCode',
};
