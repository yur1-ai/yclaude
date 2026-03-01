import { useState } from 'react';
import { useSummary } from '../hooks/useSummary';
import { usePriorSummary } from '../hooks/usePriorSummary';
import { useDateRangeStore } from '../store/useDateRangeStore';
import { TrendIndicator } from './TrendIndicator';

type CacheMode = 'inputCoverage' | 'cacheHitRate';

export function CacheEfficiencyCard() {
  const [mode, setMode] = useState<CacheMode>('inputCoverage');
  const { from, to, preset } = useDateRangeStore();
  const { data: current } = useSummary();
  const { data: prior } = usePriorSummary(from, to);

  function computeScore(
    data: ReturnType<typeof useSummary>['data'],
    m: CacheMode,
  ): number | null {
    if (!data) return null;
    const { input, cacheCreation, cacheRead } = data.totalTokens;
    if (m === 'inputCoverage') {
      return input + cacheRead > 0 ? (cacheRead / (input + cacheRead)) * 100 : null;
    }
    return cacheCreation + cacheRead > 0
      ? (cacheRead / (cacheCreation + cacheRead)) * 100
      : null;
  }

  const currentScore = computeScore(current, mode);
  const priorScore = computeScore(prior, mode);

  // Trend: % change from prior to current
  // Positive = cache efficiency improved (shown as up in TrendIndicator)
  const trendPercent: number | null = (() => {
    if (preset === 'all' || preset === 'custom') return null;
    if (currentScore === null || priorScore === null || priorScore === 0) return null;
    return ((currentScore - priorScore) / priorScore) * 100;
  })();

  const valueStr = currentScore !== null ? `${currentScore.toFixed(1)}%` : '—';

  const MODES: { key: CacheMode; label: string }[] = [
    { key: 'inputCoverage', label: 'Input Coverage' },
    { key: 'cacheHitRate', label: 'Hit Rate' },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-500">Cache Efficiency</p>
        <div className="flex gap-1">
          {MODES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                mode === key
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight text-slate-900">{valueStr}</p>
      <div className="mt-2">
        <TrendIndicator percent={trendPercent} />
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {mode === 'inputCoverage'
          ? 'Cache reads \u00f7 (input + cache reads)'
          : 'Cache reads \u00f7 (cache reads + cache writes)'}
      </p>
    </div>
  );
}
