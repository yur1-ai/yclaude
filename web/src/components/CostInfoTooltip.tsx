import { usePricingMeta } from '../hooks/usePricingMeta';
import { useProviderStore } from '../store/useProviderStore';

/**
 * Provider-aware cost information tooltip.
 * - All-view: explains mixed cost sources across providers
 * - Claude: API token pricing explanation
 * - Cursor: provider-reported costs explanation
 * - Other: generic fallback
 *
 * Info icon links to the Anthropic pricing source, with a CSS-only hover tooltip.
 */
export function CostInfoTooltip() {
  const { data } = usePricingMeta();
  const { provider } = useProviderStore();

  const formattedDate = data
    ? new Date(`${data.lastUpdated}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // Select tooltip text based on current provider context
  const tooltipText = (() => {
    if (provider === 'all') {
      return 'Costs combine multiple estimation methods. Claude Code uses API token pricing (estimated). Cursor uses provider-reported costs. Totals may mix methodologies.';
    }
    if (provider === 'cursor') {
      return 'Costs reported by Cursor from usage data. Note: recent Cursor versions may report $0.00 due to empty usage data.';
    }
    if (provider === 'claude') {
      return "Based on API token pricing. If you're on Claude Pro or Max, your actual spend is your subscription fee -- not these numbers.";
    }
    // Generic fallback for opencode or other providers
    return 'Cost estimates based on available usage data. Accuracy depends on provider reporting.';
  })();

  return (
    <span className="relative group inline-flex items-center ml-1">
      <a
        href={data?.source ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-pointer text-slate-400 hover:text-slate-600 dark:text-[#6e7681] dark:hover:text-[#8b949e] transition-colors"
        aria-label="View pricing source"
      >
        <span className="sr-only">View pricing source</span>
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clipRule="evenodd"
          />
        </svg>
      </a>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block rounded bg-slate-800 dark:bg-slate-700 text-white text-xs p-2 w-64 text-left z-10">
        {tooltipText}
        {formattedDate && provider === 'claude' && (
          <>
            <br />
            <br />
            Pricing last verified: {formattedDate}. Click the icon to view source.
          </>
        )}
      </span>
    </span>
  );
}
