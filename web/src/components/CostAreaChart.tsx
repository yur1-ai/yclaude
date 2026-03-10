import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Bucket } from '../hooks/useCostOverTime';
import type { ProviderId } from '../lib/providers';
import { PROVIDER_COLORS, PROVIDER_NAMES } from '../lib/providers';
import { useThemeStore } from '../store/useThemeStore';

interface CostAreaChartProps {
  data: Array<{ date: string; cost: number; [providerKey: string]: number | string }>;
  providers: ProviderId[];
  bucket: Bucket;
  onBucketChange: (b: Bucket) => void;
  isLoading: boolean;
  from?: Date;
  to?: Date;
}

// XAxis label formatter based on bucket (same logic as CostBarChart)
function makeFormatter(bucket: Bucket) {
  return (dateStr: string) => {
    if (bucket === 'hour') {
      const hour = dateStr.slice(11, 13);
      return `${hour}:00`;
    }
    const d = new Date(dateStr);
    if (bucket === 'month') return d.toLocaleString('default', { month: 'short', year: '2-digit' });
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
}

type BucketOption = {
  key: Bucket;
  label: string;
  disabledWhen?: (from: Date | undefined, to: Date | undefined) => boolean;
};

const BUCKETS: BucketOption[] = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
  {
    key: 'hour',
    label: 'Hourly',
    disabledWhen: (from, to) => {
      if (!from || !to) return true;
      return to.getTime() - from.getTime() > 48 * 60 * 60 * 1000;
    },
  },
];

/**
 * Custom tooltip for stacked area chart showing per-provider breakdown.
 */
function AreaTooltipContent({
  active,
  payload,
  label,
  providers,
  isDark,
}: {
  active?: boolean;
  // biome-ignore lint/suspicious/noExplicitAny: recharts Tooltip payload type
  payload?: any[];
  label?: string;
  providers: ProviderId[];
  isDark: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const total = providers.reduce((sum, p) => {
    const entry = payload.find((e) => e.dataKey === p);
    return sum + (entry?.value ?? 0);
  }, 0);

  return (
    <div className="rounded border border-slate-200 bg-white p-3 shadow-lg text-sm dark:border-[#30363d] dark:bg-[#1c2128]">
      <p className="text-xs text-slate-500 dark:text-[#8b949e] mb-1.5">{label}</p>
      {providers.map((p) => {
        const entry = payload.find((e) => e.dataKey === p);
        const value: number = entry?.value ?? 0;
        const color = isDark ? PROVIDER_COLORS[p].dark : PROVIDER_COLORS[p].light;
        return (
          <div key={p} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-slate-600 dark:text-[#8b949e]">{PROVIDER_NAMES[p]}</span>
            </span>
            <span className="text-slate-900 dark:text-[#e6edf3] font-medium tabular-nums">
              ${value.toFixed(2)}
            </span>
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-4 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-[#30363d]">
        <span className="text-slate-600 dark:text-[#8b949e] font-medium">Total</span>
        <span className="text-slate-900 dark:text-[#e6edf3] font-bold tabular-nums">
          ${total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

/**
 * Stacked area chart for All-view cost-over-time, with one area per provider.
 */
export function CostAreaChart({
  data,
  providers,
  bucket,
  onBucketChange,
  isLoading,
  from,
  to,
}: CostAreaChartProps) {
  const { theme } = useThemeStore();
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  if (isLoading) {
    return (
      <div className="h-60 flex items-center justify-center text-slate-400 dark:text-[#8b949e] text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div>
      {/* Bucket toggle */}
      <div className="flex gap-1 mb-4">
        {BUCKETS.map(({ key, label, disabledWhen }) => {
          const isDisabled = disabledWhen ? disabledWhen(from, to) : false;
          return (
            <div key={key} className="relative group">
              <button
                type="button"
                onClick={() => !isDisabled && onBucketChange(key)}
                disabled={isDisabled}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  bucket === key && !isDisabled
                    ? 'bg-slate-100 text-slate-900 dark:bg-[#21262d] dark:text-[#e6edf3]'
                    : isDisabled
                      ? 'text-slate-300 dark:text-[#30363d] cursor-not-allowed'
                      : 'text-slate-500 hover:text-slate-700 dark:text-[#8b949e] dark:hover:text-[#e6edf3]'
                }`}
              >
                {label}
              </button>
              {isDisabled && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block rounded bg-slate-800 text-white text-xs p-2 whitespace-nowrap z-10 pointer-events-none">
                  Select a range of 48h or less for hourly view
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Stacked area chart */}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid)" vertical={false} />
          <XAxis
            dataKey="date"
            interval="preserveStartEnd"
            minTickGap={40}
            tickLine={false}
            axisLine={false}
            tickFormatter={makeFormatter(bucket)}
            tick={{ fontSize: 12, fill: 'var(--color-axis-tick)' }}
          />
          <YAxis
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            tickLine={false}
            axisLine={false}
            width={60}
            tick={{ fontSize: 12, fill: 'var(--color-axis-tick)' }}
          />
          <Tooltip
            content={
              <AreaTooltipContent providers={providers} isDark={isDark} />
            }
            cursor={{ stroke: 'var(--color-grid)' }}
          />
          {providers.map((providerId) => {
            const color = isDark
              ? PROVIDER_COLORS[providerId].dark
              : PROVIDER_COLORS[providerId].light;
            return (
              <Area
                key={providerId}
                type="monotone"
                dataKey={providerId}
                stackId="1"
                fill={color}
                stroke={color}
                fillOpacity={0.6}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
