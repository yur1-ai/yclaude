import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSessions, SessionRow } from '../hooks/useSessions';
import { useProjects } from '../hooks/useProjects';
import { SortableTable, Column } from '../components/SortableTable';
import { DateRangePicker } from '../components/DateRangePicker';

const columns: Column<SessionRow>[] = [
  {
    key: 'displayName',
    label: 'Project',
    sortable: true,
    render: (row) => <ProjectLink row={row} />,
  },
  {
    key: 'model',
    label: 'Model',
    sortable: true,
    render: (row) => {
      const models = row.models as string[];
      if (models.length <= 1) return <span>{row.model as string}</span>;
      return (
        <span className="relative group cursor-help underline decoration-dotted">
          Mixed
          <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block rounded bg-slate-800 text-white text-xs p-2 whitespace-nowrap z-10">
            {models.join(', ')}
          </span>
        </span>
      );
    },
  },
  {
    key: 'costUsd',
    label: 'Cost',
    sortable: true,
    render: (row) => <span>${(row.costUsd as number).toFixed(6)}</span>,
  },
  {
    key: 'timestamp',
    label: 'Time',
    sortable: true,
    render: (row) => <span>{new Date(row.timestamp as string).toLocaleString()}</span>,
  },
  {
    key: 'durationMs',
    label: 'Duration',
    sortable: true,
    render: (row) =>
      row.durationMs != null ? (
        <span>{((row.durationMs as number) / 1000).toFixed(1)}s</span>
      ) : (
        <span>&mdash;</span>
      ),
  },
];

function ProjectLink({ row }: { row: SessionRow }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/sessions/${row.sessionId}`)}
      className="text-left text-slate-700 hover:text-slate-900 hover:underline"
    >
      {row.displayName}
    </button>
  );
}

export default function Sessions() {
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const { data, isLoading, isError, page, setPage } = useSessions(projectFilter);
  const { data: projectsData } = useProjects();

  useEffect(() => {
    setPage(1);
  }, [projectFilter, setPage]);

  const totalPages = Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 50));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Sessions</h1>
        <div className="flex items-center gap-3">
          <select
            value={projectFilter ?? ''}
            onChange={(e) => setProjectFilter(e.target.value || null)}
            className="rounded border border-slate-200 text-sm px-2 py-1.5 text-slate-600 bg-white"
          >
            <option value="">All projects</option>
            {projectsData?.rows.map((p) => (
              <option key={p.cwd ?? 'unknown'} value={p.cwd ?? ''}>
                {p.displayName}
              </option>
            ))}
          </select>
          <DateRangePicker />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {isLoading && <p className="text-slate-500 text-sm">Loading sessions…</p>}
        {isError && <p className="text-red-500 text-sm">Failed to load sessions.</p>}
        {!isLoading && !isError && (
          <>
            <SortableTable<SessionRow>
              columns={columns}
              rows={data?.sessions ?? []}
              defaultSortKey="timestamp"
              defaultSortDir="desc"
              emptyMessage="No sessions for this period"
            />
            <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
              <span>
                {data
                  ? `Showing ${((page - 1) * (data.pageSize ?? 50)) + 1}–${Math.min(page * (data.pageSize ?? 50), data.total)} of ${data.total}`
                  : ''}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
