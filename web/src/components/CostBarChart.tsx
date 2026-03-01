import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Bucket } from '../hooks/useCostOverTime';

interface CostBarChartProps {
  data: Array<{ date: string; cost: number }>;
  bucket: Bucket;
  onBucketChange: (b: Bucket) => void;
  isLoading: boolean;
  from?: Date; // for Hourly disabled guard
  to?: Date; // for Hourly disabled guard
}

// XAxis label formatter based on bucket
function makeFormatter(bucket: Bucket) {
  return (dateStr: string) => {
    if (bucket === 'hour') {
      // dateStr is 'YYYY-MM-DDTHH' — NOT valid ISO, do NOT pass to new Date()
      // Slice the hour digits directly
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
      if (!from || !to) return true; // no range = disabled
      return to.getTime() - from.getTime() > 48 * 60 * 60 * 1000;
    },
  },
];

export function CostBarChart({
  data,
  bucket,
  onBucketChange,
  isLoading,
  from,
  to,
}: CostBarChartProps) {
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

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
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
            formatter={(value: number | undefined) => [
              value != null ? `$${value.toFixed(2)} est.` : '—',
              'Cost',
            ]}
            cursor={{ fill: 'var(--color-grid)' }}
          />
          <Bar dataKey="cost" fill="var(--color-bar)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
