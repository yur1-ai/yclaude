import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import type { Bucket } from '../hooks/useCostOverTime';

interface CostBarChartProps {
  data: Array<{ date: string; cost: number }>;
  bucket: Bucket;
  onBucketChange: (b: Bucket) => void;
  isLoading: boolean;
}

// XAxis label formatter based on bucket
function makeFormatter(bucket: Bucket) {
  return (dateStr: string) => {
    const d = new Date(dateStr);
    if (bucket === 'month') return d.toLocaleString('default', { month: 'short', year: '2-digit' });
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
}

type BucketOption = { key: Bucket; label: string };
const BUCKETS: BucketOption[] = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
];

export function CostBarChart({ data, bucket, onBucketChange, isLoading }: CostBarChartProps) {
  if (isLoading) {
    return (
      <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div>
      {/* Bucket toggle */}
      <div className="flex gap-1 mb-4">
        {BUCKETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onBucketChange(key)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              bucket === key
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-grid)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            interval="preserveStartEnd"
            minTickGap={40}
            tickLine={false}
            axisLine={false}
            tickFormatter={makeFormatter(bucket)}
            tick={{ fontSize: 12, fill: 'oklch(0.55 0 0)' }}
          />
          <YAxis
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            tickLine={false}
            axisLine={false}
            width={60}
            tick={{ fontSize: 12, fill: 'oklch(0.55 0 0)' }}
          />
          <Tooltip
            formatter={(value: number | undefined) => [
              value != null ? `$${value.toFixed(4)} est.` : '—',
              'Cost',
            ]}
            cursor={{ fill: 'var(--color-grid)' }}
          />
          <Bar
            dataKey="cost"
            fill="var(--color-bar)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
