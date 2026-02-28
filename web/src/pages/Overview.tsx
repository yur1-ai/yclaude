import { useState } from 'react';
import { useSummary } from '../hooks/useSummary';
import { useAllTimeSummary } from '../hooks/useAllTimeSummary';
import { useCostOverTime, type Bucket } from '../hooks/useCostOverTime';
import { useDateRangeStore } from '../store/useDateRangeStore';
import { StatCard } from '../components/StatCard';
import { TrendIndicator } from '../components/TrendIndicator';
import { TokenBreakdown } from '../components/TokenBreakdown';
import { CostBarChart } from '../components/CostBarChart';
import { DateRangePicker } from '../components/DateRangePicker';

export default function Overview() {
  const [bucket, setBucket] = useState<Bucket>('day');
  const { preset } = useDateRangeStore();

  const { data: periodSummary, isPending: periodPending } = useSummary();
  const { data: allTimeSummary, isPending: allTimePending } = useAllTimeSummary();
  const { data: costOverTime, isPending: chartPending } = useCostOverTime(bucket);

  // Trend: compute % change vs prior equivalent period.
  // Prior period requires a second API call with shifted date bounds — deferred to Phase 5+.
  // For now, TrendIndicator renders its null state ("No prior data") for all presets.
  const trendPercent: number | null = (() => {
    if (!periodSummary || !allTimeSummary) return null;
    // For 'all' or 'custom' preset, no trend shown
    if (preset === 'all' || preset === 'custom') return null;
    // Phase 4 defers prior-period query — return null to show "No prior data".
    // Phase 5+ can add a usePriorSummary hook for exact trend calculation.
    return null;
  })();

  const periodLabel =
    preset === 'all'
      ? 'All time est.'
      : preset === 'custom'
        ? 'Selected period est.'
        : `Last ${preset} est.`;
  const periodValue = periodPending
    ? '...'
    : `$${(periodSummary?.totalCost ?? 0).toFixed(4)} est.`;
  const allTimeValue = allTimePending
    ? '...'
    : `$${(allTimeSummary?.totalCost ?? 0).toFixed(4)} est.`;

  return (
    <div className="space-y-6">
      {/* Header row: title + date range picker */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Your estimated AI coding spend</p>
        </div>
        <DateRangePicker />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="All-time est." value={allTimeValue} />
        <StatCard label={periodLabel} value={periodValue}>
          <TrendIndicator percent={trendPercent} />
        </StatCard>
      </div>

      {/* Token breakdown */}
      {periodSummary && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Token breakdown</h2>
          <TokenBreakdown
            tokens={periodSummary.totalTokens}
            totalCost={periodSummary.totalCost}
          />
        </div>
      )}
      {periodPending && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm h-40 flex items-center justify-center text-slate-400 text-sm">
          Loading...
        </div>
      )}

      {/* Cost over time chart */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Cost over time</h2>
        <CostBarChart
          data={costOverTime?.data ?? []}
          bucket={bucket}
          onBucketChange={setBucket}
          isLoading={chartPending}
        />
      </div>
    </div>
  );
}
