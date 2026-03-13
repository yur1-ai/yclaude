import type { ProviderId } from '../lib/providers';
import { PROVIDER_COLORS, PROVIDER_NAMES } from '../lib/providers';
import { useThemeStore } from '../store/useThemeStore';

interface ProviderCardProps {
  providerId: ProviderId;
  name: string;
  cost: number;
  sessions: number;
  costSource: string;
  onClick: () => void;
}

/** Cost source label mapping for display. */
function costSourceLabel(costSource: string): string {
  switch (costSource) {
    case 'api-estimated':
      return 'API-estimated';
    case 'provider-reported':
      return 'provider-reported';
    default:
      return costSource;
  }
}

/**
 * Clickable provider breakdown card with colored left border accent.
 * Shows provider name, total cost, session count, and cost source methodology.
 */
export function ProviderCard({
  providerId,
  name,
  cost,
  sessions,
  costSource,
  onClick,
}: ProviderCardProps) {
  const { theme } = useThemeStore();
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  const accentColor = isDark ? PROVIDER_COLORS[providerId].dark : PROVIDER_COLORS[providerId].light;

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow text-left border-l-4 dark:border-[#30363d] dark:bg-[#161b22]"
      style={{ borderLeftColor: accentColor }}
    >
      {/* Provider name with colored dot */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: accentColor }}
        />
        <span className="text-sm font-medium text-slate-700 dark:text-[#e6edf3]">
          {name || PROVIDER_NAMES[providerId]}
        </span>
      </div>

      {/* Cost as large number */}
      <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#e6edf3]">
        ${cost.toFixed(2)}
      </p>

      {/* Session count */}
      <p className="text-sm text-slate-500 dark:text-[#8b949e] mt-1">
        {sessions} session{sessions === 1 ? '' : 's'}
      </p>

      {/* Cost source badge */}
      <span className="inline-block mt-2 text-xs rounded px-1.5 py-0.5 bg-slate-100 text-slate-500 dark:bg-[#21262d] dark:text-[#8b949e]">
        {costSourceLabel(costSource)}
      </span>
    </button>
  );
}
