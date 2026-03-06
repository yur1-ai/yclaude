import { useEffect, useState } from 'react';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { CacheEfficiencyCard } from '../components/CacheEfficiencyCard';
import { CostBarChart } from '../components/CostBarChart';
import { CostInfoTooltip } from '../components/CostInfoTooltip';
import { DateRangePicker } from '../components/DateRangePicker';
import { StatCard } from '../components/StatCard';
import { TokenBreakdown } from '../components/TokenBreakdown';
import { TrendIndicator } from '../components/TrendIndicator';
import { useAllTimeSummary } from '../hooks/useAllTimeSummary';
import { type Bucket, useCostOverTime } from '../hooks/useCostOverTime';
import { usePriorSummary } from '../hooks/usePriorSummary';
import { useSummary } from '../hooks/useSummary';
import { QUIPS, pickQuip, pickSpendQuip } from '../lib/quips';
import { useDateRangeStore } from '../store/useDateRangeStore';

export default function Overview() {
  const [bucket, setBucket] = useState<Bucket>('day');
  const { preset, from, to } = useDateRangeStore();

  const { data: periodSummary, isPending: periodPending } = useSummary();
  const { data: allTimeSummary, isPending: allTimePending } = useAllTimeSummary();
  const { data: costOverTime, isPending: chartPending } = useCostOverTime(bucket);
  const { data: priorSummary } = usePriorSummary(from, to);

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

  return (
    <div className="space-y-6">
      {/* Header row: title + date range picker */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-[#e6edf3]">Overview</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8b949e]">
            Your estimated AI coding spend
          </p>
        </div>
        <DateRangePicker />
      </div>

      {/* Empty state */}
      {!allTimePending && !allTimeSummary?.totalCost && (
        <p className="text-sm text-slate-400 dark:text-[#8b949e] italic">
          {pickQuip(QUIPS.empty_overview)}
        </p>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="All-time est."
          value={allTimeValue}
          labelSuffix={<CostInfoTooltip />}
          quip={
            !allTimePending && allTimeSummary
              ? (pickSpendQuip(allTimeSummary.totalCost) ?? undefined)
              : undefined
          }
        />
        <StatCard label={periodLabel} value={periodValue} labelSuffix={<CostInfoTooltip />}>
          <TrendIndicator percent={trendPercent} />
        </StatCard>
      </div>

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
        <CostBarChart
          data={costOverTime?.data ?? []}
          bucket={bucket}
          onBucketChange={setBucket}
          isLoading={chartPending}
          from={from}
          to={to}
        />
      </div>

      {/* Cache efficiency card */}
      <CacheEfficiencyCard />

      {/* Subagent share stat card — only shown when subagent activity exists */}
      {periodSummary &&
        periodSummary.subagentCostUsd !== undefined &&
        periodSummary.subagentCostUsd > 0 && (
          <StatCard
            label="Subagent share"
            value={
              periodSummary.totalCost > 0
                ? `${((periodSummary.subagentCostUsd / periodSummary.totalCost) * 100).toFixed(1)}%`
                : '0.0%'
            }
          />
        )}

      {/* Activity heatmap */}
      <ActivityHeatmap />
    </div>
  );
}
