import { useProjects } from '../hooks/useProjects';
import type { ProjectRow } from '../hooks/useProjects';
import { SortableTable } from '../components/SortableTable';
import type { Column } from '../components/SortableTable';
import { DateRangePicker } from '../components/DateRangePicker';

export default function Projects() {
  const { data, isLoading } = useProjects();
  const totalCost = data?.totalCost ?? 0;

  const columns: Column<ProjectRow>[] = [
    {
      key: 'displayName',
      label: 'Project',
      render: (row) => <span className="font-medium text-slate-900">{row.displayName}</span>,
    },
    {
      key: 'costUsd',
      label: 'Cost',
      render: (row) => <span>${row.costUsd.toFixed(4)} est.</span>,
    },
    {
      // Use displayName key with sortable: false so the sort key is unused
      key: 'cwd',
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

  if (isLoading) {
    return (
      <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
        <DateRangePicker />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <SortableTable<ProjectRow>
          columns={columns}
          rows={data?.rows ?? []}
          defaultSortKey="costUsd"
          defaultSortDir="desc"
        />
      </div>
    </div>
  );
}
