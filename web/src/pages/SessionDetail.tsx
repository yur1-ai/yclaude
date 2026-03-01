import { useParams, useNavigate } from 'react-router';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { useSessionDetail, TurnRow } from '../hooks/useSessionDetail';
import { SortableTable } from '../components/SortableTable';
import type { Column } from '../components/SortableTable';

const columns: Column<TurnRow>[] = [
  { key: 'turn', label: '#', sortable: true },
  { key: 'model', label: 'Model', sortable: true },
  {
    key: 'tokens',
    label: 'Input',
    sortable: false,
    render: (row) => row.tokens.input.toLocaleString(),
  },
  {
    key: 'tokens',
    label: 'Output',
    sortable: false,
    render: (row) => row.tokens.output.toLocaleString(),
  },
  {
    key: 'tokens',
    label: 'Cache Write',
    sortable: false,
    render: (row) => row.tokens.cacheCreation.toLocaleString(),
  },
  {
    key: 'tokens',
    label: 'Cache Read',
    sortable: false,
    render: (row) => row.tokens.cacheRead.toLocaleString(),
  },
  {
    key: 'costUsd',
    label: 'Cost',
    sortable: true,
    render: (row) => `$${row.costUsd.toFixed(2)}`,
  },
];

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useSessionDetail(id);

  if (isLoading) {
    return <p className="text-slate-500 text-sm p-8">Loading session…</p>;
  }

  if (isError) {
    const is404 = error instanceof Error && error.message === 'Session not found';
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          {is404 ? 'Session Not Found' : 'Error'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {is404
            ? 'This session does not exist or has no recorded events.'
            : 'Failed to load session details.'}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          ← Back to sessions
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, turns } = data;

  const stats: { label: string; value: string }[] = [
    ...(summary.hasSubagents
      ? [
          { label: 'Total Cost', value: `$${summary.totalCost.toFixed(2)} est.` },
          { label: 'Main Thread', value: `$${(summary.mainCostUsd ?? 0).toFixed(2)} est.` },
          { label: 'Subagents', value: `$${(summary.subagentCostUsd ?? 0).toFixed(2)} est.` },
        ]
      : [{ label: 'Total Cost', value: `$${summary.totalCost.toFixed(2)} est.` }]),
    {
      label: 'Model',
      value:
        summary.model === 'Mixed'
          ? `Mixed (${summary.models.join(', ')})`
          : summary.model,
    },
    { label: 'Project', value: summary.displayName },
    {
      label: 'Duration',
      value:
        summary.durationMs != null
          ? `${(summary.durationMs / 1000).toFixed(1)}s`
          : '—',
    },
    { label: 'Started', value: new Date(summary.timestamp).toLocaleString() },
    { label: 'Git Branch', value: summary.gitBranch ?? '—' },
    { label: 'Input Tokens', value: summary.totalTokens.input.toLocaleString() },
    { label: 'Output Tokens', value: summary.totalTokens.output.toLocaleString() },
    {
      label: 'Cache Creation',
      value: summary.totalTokens.cacheCreation.toLocaleString(),
    },
    { label: 'Cache Read', value: summary.totalTokens.cacheRead.toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Sessions
        </button>
        <h1 className="text-2xl font-semibold text-slate-900">
          {summary.displayName}
        </h1>
      </div>

      {/* Summary card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {stats.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cumulative cost chart card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Cumulative Cost</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={turns} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-grid)"
              vertical={false}
            />
            <XAxis
              dataKey="turn"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'oklch(0.55 0 0)' }}
              label={{ value: 'Turn', position: 'insideBottom', offset: -2 }}
            />
            <YAxis
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              tickLine={false}
              axisLine={false}
              width={68}
              tick={{ fontSize: 12, fill: 'oklch(0.55 0 0)' }}
            />
            <Tooltip
              formatter={(value: number | undefined) =>
                value != null
                  ? [`$${value.toFixed(2)} est.`, 'Cumulative cost']
                  : ['—', 'Cumulative cost']
              }
            />
            <Line
              type="monotone"
              dataKey="cumulativeCost"
              stroke="var(--color-bar)"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-turn table card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Per-Turn Breakdown</h2>
        <SortableTable<TurnRow>
          columns={columns}
          rows={turns}
          defaultSortKey="turn"
          defaultSortDir="asc"
        />
      </div>
    </div>
  );
}
