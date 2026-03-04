import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CostInfoTooltip } from '../components/CostInfoTooltip';
import { DateRangePicker } from '../components/DateRangePicker';
import { SortableTable } from '../components/SortableTable';
import type { Column } from '../components/SortableTable';
import { useModels } from '../hooks/useModels';
import type { ModelRow } from '../hooks/useModels';
import { QUIPS, pickQuip } from '../lib/quips';

const DONUT_COLORS = [
  'var(--color-donut-1)',
  'var(--color-donut-2)',
  'var(--color-donut-3)',
  'var(--color-donut-4)',
  'var(--color-donut-5)',
  'var(--color-donut-other)',
];

interface DonutSlice {
  model: string;
  costUsd: number;
}

function toDonutData(rows: ModelRow[]): DonutSlice[] {
  if (rows.length <= 5) return rows.map((r) => ({ model: r.model, costUsd: r.costUsd }));
  const top5 = rows.slice(0, 5);
  const otherCost = rows.slice(5).reduce((s, r) => s + r.costUsd, 0);
  return [
    ...top5.map((r) => ({ model: r.model, costUsd: r.costUsd })),
    { model: 'Other', costUsd: otherCost },
  ];
}

export default function Models() {
  const { data, isLoading } = useModels();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="h-60 flex items-center justify-center text-slate-400 dark:text-[#8b949e] text-sm">
        Loading...
      </div>
    );
  }

  const rows = data?.rows ?? [];
  const totalCost = data?.totalCost ?? 0;
  const donutData = toDonutData(rows);

  const handlePieClick = (entry: DonutSlice) => {
    if (entry.model === 'Other') return;
    setSelectedModel((prev) => (prev === entry.model ? null : entry.model));
  };

  const totalTokensLabel = totalCost > 0 ? `$${totalCost.toFixed(2)} est.` : '$0.00 est.';

  const columns: Column<ModelRow>[] = [
    {
      key: 'model',
      label: 'Model',
      render: (row) => (
        <span className="font-medium text-slate-900 dark:text-[#e6edf3]">{row.model}</span>
      ),
    },
    {
      key: 'costUsd',
      label: <span className="inline-flex items-center gap-1">Cost <CostInfoTooltip /></span>,
      render: (row) => <span>${row.costUsd.toFixed(2)} est.</span>,
    },
    {
      key: 'costUsd',
      label: '% of total',
      sortable: false,
      render: (row) =>
        totalCost > 0 ? `${((row.costUsd / totalCost) * 100).toFixed(1)}%` : '0.0%',
    },
    {
      key: 'eventCount',
      label: 'Events',
    },
    {
      key: 'tokens',
      label: 'Total tokens',
      sortable: false,
      render: (row) => (
        <span className="relative group cursor-help underline decoration-dotted">
          {(
            row.tokens.input +
            row.tokens.output +
            row.tokens.cacheCreation +
            row.tokens.cacheRead
          ).toLocaleString()}
          <span
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block
                         rounded bg-slate-800 text-white text-xs p-2 whitespace-nowrap z-10"
          >
            Input: {row.tokens.input.toLocaleString()}
            <br />
            Output: {row.tokens.output.toLocaleString()}
            <br />
            Cache write: {row.tokens.cacheCreation.toLocaleString()}
            <br />
            Cache read: {row.tokens.cacheRead.toLocaleString()}
          </span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-[#e6edf3]">Models</h1>
        <DateRangePicker />
      </div>

      {/* Donut chart card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
        <div className="flex items-center gap-1 mb-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-[#e6edf3]">
            Spend by model
          </h2>
          <CostInfoTooltip />
        </div>
        {rows.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-slate-400 dark:text-[#8b949e] text-sm italic">
            {pickQuip(QUIPS.empty_models)}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={donutData}
                dataKey="costUsd"
                nameKey="model"
                innerRadius={80}
                outerRadius={120}
                strokeWidth={0}
                onClick={(_data, _index, event) => {
                  event.stopPropagation();
                  handlePieClick(_data as DonutSlice);
                }}
                style={{ cursor: 'pointer' }}
              >
                {donutData.map((entry, index) => (
                  <Cell
                    key={entry.model}
                    fill={DONUT_COLORS[index] ?? DONUT_COLORS[DONUT_COLORS.length - 1]}
                    opacity={selectedModel === null || entry.model === selectedModel ? 1 : 0.4}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | undefined, name: string | undefined) =>
                  value !== undefined ? [`$${value.toFixed(2)} est.`, name ?? ''] : ['', name ?? '']
                }
              />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-900 text-sm font-semibold"
                style={{ fontSize: '14px', fontWeight: 600, fill: 'var(--color-axis-tick)' }}
              >
                {totalTokensLabel}
              </text>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Table card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
        <SortableTable<ModelRow>
          columns={columns}
          rows={rows}
          defaultSortKey="costUsd"
          defaultSortDir="desc"
          highlightKey="model"
          highlightValue={selectedModel}
        />
      </div>
      {data?.unknownModels && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 px-1">
          &#9888; {data.unknownModels.sessionCount} session{data.unknownModels.sessionCount !== 1 ? 's' : ''} used
          unrecognized model{data.unknownModels.models.length !== 1 ? 's' : ''} ({data.unknownModels.models.join(', ')})
          &mdash; costs may be understated
        </p>
      )}
    </div>
  );
}
