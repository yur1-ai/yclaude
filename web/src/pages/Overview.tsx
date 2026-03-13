import { useEffect, useState } from 'react';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { CacheEfficiencyCard } from '../components/CacheEfficiencyCard';
import { CostAreaChart } from '../components/CostAreaChart';
import { CostBarChart } from '../components/CostBarChart';
import { CostInfoTooltip } from '../components/CostInfoTooltip';
import { DateRangePicker } from '../components/DateRangePicker';
import { ProviderCard } from '../components/ProviderCard';
import { StatCard } from '../components/StatCard';
import { TokenBreakdown } from '../components/TokenBreakdown';
import { TrendIndicator } from '../components/TrendIndicator';
import { useAllTimeSummary } from '../hooks/useAllTimeSummary';
import { type Bucket, useCostOverTime } from '../hooks/useCostOverTime';
import { usePriorSummary } from '../hooks/usePriorSummary';
import { useSummary } from '../hooks/useSummary';
import type { ProviderId } from '../lib/providers';
import { PROVIDER_COLORS, PROVIDER_NAMES } from '../lib/providers';
import { QUIPS, pickProviderQuip, pickQuip, pickSpendQuip } from '../lib/quips';
import { useDateRangeStore } from '../store/useDateRangeStore';
import { useProviderStore } from '../store/useProviderStore';
import { useThemeStore } from '../store/useThemeStore';

/** Provider breakdown from /summary when no ?provider= filter is active. */
interface ProviderBreakdownEntry {
  cost: number;
  sessions: number;
  costSource: string;
}

/** Extended SummaryData with optional providerBreakdown for All-view. */
interface SummaryWithBreakdown {
  totalCost: number;
  totalTokens: {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
  };
  eventCount: number;
  subagentCostUsd?: number;
  mainCostUsd?: number;
  providerBreakdown?: Record<string, ProviderBreakdownEntry>;
}

export default function Overview() {
  const [bucket, setBucket] = useState<Bucket>('day');
  const { preset, from, to } = useDateRangeStore();
  const { provider, setProvider } = useProviderStore();
  const isAllView = provider === 'all';

  const { theme } = useThemeStore();
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  const { data: rawPeriodSummary, isPending: periodPending } = useSummary();
  const { data: rawAllTimeSummary, isPending: allTimePending } = useAllTimeSummary();
  const { data: costOverTime, isPending: chartPending } = useCostOverTime(bucket);
  const { data: priorSummary } = usePriorSummary(from, to);

  // Cast to extended type that includes providerBreakdown
  const periodSummary = rawPeriodSummary as SummaryWithBreakdown | undefined;
  const allTimeSummary = rawAllTimeSummary as SummaryWithBreakdown | undefined;

  // Auto-switch bucket based on date range
  useEffect(() => {
    if (!from || !to) return;
    const rangeMs = to.getTime() - from.getTime();
    if (bucket === 'hour' && rangeMs > 48 * 60 * 60 * 1000) {
      // Range too wide for hourly -- revert to day
      setBucket('day');
    } else if (
      bucket !== 'hour' &&
      rangeMs <= 48 * 60 * 60 * 1000 &&
      (preset === '24h' || preset === '48h')
    ) {
      // 24h/48h preset selected -- auto-switch to hourly
      setBucket('hour');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setBucket is a stable Zustand setter
  }, [from, to, bucket, preset]);

  // Trend: compute % change vs prior equivalent period
  const trendPercent: number | null = (() => {
    if (!periodSummary || !priorSummary) return null;
    if (preset === 'all' || preset === 'custom') return null;
    if (priorSummary.totalCost === 0) return null;
    const pct = ((periodSummary.totalCost - priorSummary.totalCost) / priorSummary.totalCost) * 100;
    // Suppress micro-fluctuations below 1%
    if (Math.abs(pct) < 1) return null;
    return pct;
  })();

  const periodLabel =
    preset === 'all'
      ? 'All time est.'
      : preset === 'custom'
        ? 'Selected period est.'
        : `Last ${preset} est.`;
  const periodValue = periodPending ? '...' : `$${(periodSummary?.totalCost ?? 0).toFixed(2)} est.`;
  const allTimeValue = allTimePending
    ? '...'
    : `$${(allTimeSummary?.totalCost ?? 0).toFixed(2)} est.`;

  // Provider-specific subtitle
  const subtitle = isAllView
    ? 'Your AI coding spend across all tools'
    : `Your ${PROVIDER_NAMES[provider as ProviderId] ?? provider} spend`;

  // Determine accent color for stat cards
  const accentColor = isAllView
    ? undefined
    : isDark
      ? PROVIDER_COLORS[provider as ProviderId]?.dark
      : PROVIDER_COLORS[provider as ProviderId]?.light;

  // Determine empty state quip
  const emptyQuip = isAllView
    ? (pickProviderQuip('all', 'empty_overview') ?? pickQuip(QUIPS.empty_overview))
    : (pickProviderQuip(provider, 'empty_overview') ?? pickQuip(QUIPS.empty_overview));

  // Determine spend quip
  const spendQuip =
    !allTimePending && allTimeSummary
      ? (pickSpendQuip(allTimeSummary.totalCost, provider) ?? undefined)
      : undefined;

  // Extract provider IDs from cost-over-time data for the area chart
  const costProviders: ProviderId[] = (() => {
    if (!costOverTime?.data || costOverTime.data.length === 0) return [];
    const firstRow = costOverTime.data[0];
    if (!firstRow) return [];
    const knownKeys = new Set(['date', 'cost']);
    return Object.keys(firstRow).filter((k) => !knownKeys.has(k)) as ProviderId[];
  })();

  // Check if Claude is among loaded providers (for conditional sections)
  const hasClaudeData = isAllView
    ? Boolean(periodSummary?.providerBreakdown?.claude)
    : provider === 'claude';

  return (
    <div className="space-y-6">
      {/* Header row: title + date range picker */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-[#e6edf3]">Overview</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8b949e]">{subtitle}</p>
        </div>
        <DateRangePicker />
      </div>

      {/* Empty state */}
      {!allTimePending && !allTimeSummary?.totalCost && (
        <p className="text-sm text-slate-400 dark:text-[#8b949e] italic">{emptyQuip}</p>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="All-time est."
          value={allTimeValue}
          labelSuffix={<CostInfoTooltip />}
          quip={spendQuip}
          accentColor={accentColor}
        />
        <StatCard
          label={periodLabel}
          value={periodValue}
          labelSuffix={<CostInfoTooltip />}
          accentColor={accentColor}
        >
          <TrendIndicator percent={trendPercent} />
        </StatCard>
      </div>

      {/* Provider breakdown cards (All-view only) */}
      {isAllView && periodSummary?.providerBreakdown && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-[#e6edf3] mb-3">
            By provider
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Object.entries(periodSummary.providerBreakdown).map(([id, data]) => (
              <ProviderCard
                key={id}
                providerId={id as ProviderId}
                name={PROVIDER_NAMES[id as ProviderId] ?? id}
                cost={data.cost}
                sessions={data.sessions}
                costSource={data.costSource}
                onClick={() => setProvider(id as ProviderId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Token breakdown */}
      {periodSummary && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-[#e6edf3] mb-4">
            Token breakdown
          </h2>
          <TokenBreakdown tokens={periodSummary.totalTokens} totalCost={periodSummary.totalCost} />
        </div>
      )}
      {periodPending && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm h-40 flex items-center justify-center text-slate-400 dark:text-[#8b949e] text-sm dark:border-[#30363d] dark:bg-[#161b22]">
          Loading...
        </div>
      )}

      {/* Cost over time chart */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-[#e6edf3] mb-4">
          Cost over time
        </h2>
        {isAllView && costProviders.length > 0 ? (
          <CostAreaChart
            data={costOverTime?.data ?? []}
            providers={costProviders}
            bucket={bucket}
            onBucketChange={setBucket}
            isLoading={chartPending}
            from={from}
            to={to}
          />
        ) : (
          <CostBarChart
            data={costOverTime?.data ?? []}
            bucket={bucket}
            onBucketChange={setBucket}
            isLoading={chartPending}
            from={from}
            to={to}
          />
        )}
      </div>

      {/* Cache efficiency card (only for Claude) */}
      {hasClaudeData && <CacheEfficiencyCard />}

      {/* Subagent share stat card -- only shown when subagent activity exists */}
      {hasClaudeData &&
        periodSummary &&
        periodSummary.subagentCostUsd !== undefined &&
        periodSummary.subagentCostUsd > 0 && (
          <StatCard
            label="Subagent share"
            value={
              periodSummary.totalCost > 0
                ? `${((periodSummary.subagentCostUsd / periodSummary.totalCost) * 100).toFixed(1)}%`
                : '0.0%'
            }
            accentColor={accentColor}
          />
        )}

      {/* Activity heatmap */}
      <ActivityHeatmap />
    </div>
  );
}
