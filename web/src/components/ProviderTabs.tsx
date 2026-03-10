import { PROVIDER_COLORS } from '../lib/providers';
import type { ProviderFilter } from '../lib/providers';
import { useProviderStore } from '../store/useProviderStore';

/** Provider tab bar rendered in the sidebar when 2+ providers are loaded. */
export function ProviderTabs() {
  const { provider, setProvider, providers } = useProviderStore();

  // Single-provider users see NO tabs (identical to v1.1)
  if (providers.length < 2) return null;

  const tabs: Array<{ id: ProviderFilter; label: string }> = [
    { id: 'all', label: 'All' },
    ...providers.map((p) => ({ id: p.id as ProviderFilter, label: p.name })),
  ];

  return (
    <div className="px-3 py-2 border-b border-slate-200 dark:border-[#30363d] flex gap-1">
      {tabs.map((tab) => {
        const isActive = provider === tab.id;
        const color = PROVIDER_COLORS[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setProvider(tab.id)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              isActive
                ? 'bg-slate-100 text-slate-900 dark:bg-[#21262d] dark:text-[#e6edf3]'
                : 'text-slate-500 hover:text-slate-700 dark:text-[#8b949e] dark:hover:text-[#e6edf3]'
            }`}
            style={{
              borderLeft: isActive ? `3px solid ${color.light}` : '3px solid transparent',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
