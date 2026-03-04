import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CostInfoTooltip } from '../components/CostInfoTooltip';
import { DateRangePicker } from '../components/DateRangePicker';
import { type Column, SortableTable } from '../components/SortableTable';
import { SubagentBadge } from '../components/SubagentBadge';
import { useBranches } from '../hooks/useBranches';
import { useProjects } from '../hooks/useProjects';
import { type SessionRow, useSessions } from '../hooks/useSessions';
import { QUIPS, pickQuip } from '../lib/quips';

const columns: Column<SessionRow>[] = [
  {
    key: 'displayName',
    label: 'Project',
    sortable: true,
  },
  {
    key: 'model',
    label: 'Model',
    sortable: true,
    render: (row) => {
      const models = row.models as string[];
      const label = models.length <= 1 ? (row.model as string) : 'Mixed';
      const tooltip = models.length > 1 ? models.join(', ') : null;
      return (
        <span className="flex items-center gap-1.5">
          {tooltip ? (
            <span className="relative group cursor-help underline decoration-dotted">
              {label}
              <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block rounded bg-slate-800 text-white text-xs p-2 whitespace-nowrap z-10">
                {tooltip}
              </span>
            </span>
          ) : (
            <span>{label}</span>
          )}
          {row.hasSubagents && <SubagentBadge />}
        </span>
      );
    },
  },
  {
    key: 'gitBranch',
    label: 'Branch',
    sortable: true,
    render: (row) => (
      <span className="text-slate-500 text-xs font-mono">
        {(row.gitBranch as string | null) ?? '—'}
      </span>
    ),
  },
  {
    key: 'costUsd',
    label: (
      <span className="inline-flex items-center gap-1">
        Cost <CostInfoTooltip />
      </span>
    ),
    sortable: true,
    render: (row) => <span>${(row.costUsd as number).toFixed(2)}</span>,
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

export default function Sessions() {
  const navigate = useNavigate();
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const { data, isLoading, isError, page, setPage } = useSessions(projectFilter, branchFilter);
  const { data: projectsData } = useProjects();
  const { data: branchesData } = useBranches();

  // biome-ignore lint/correctness/useExhaustiveDependencies: setPage is stable (Zustand setter); intentionally omitted from deps array
  useEffect(() => {
    setPage(1);
  }, [projectFilter, branchFilter]);

  const totalPages = Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 50));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-[#e6edf3]">Sessions</h1>
          {data && data.total >= 100 && (
            <p className="text-xs text-slate-400 dark:text-[#8b949e] italic mt-1">
              {pickQuip(QUIPS.milestone_100_sessions)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={projectFilter ?? ''}
            onChange={(e) => setProjectFilter(e.target.value || null)}
            className="rounded border border-slate-200 text-sm px-2 py-1.5 text-slate-600 bg-white dark:border-[#30363d] dark:text-[#8b949e] dark:bg-[#21262d]"
          >
            <option value="">All projects</option>
            {projectsData?.rows.map((p) => (
              <option key={p.cwd ?? 'unknown'} value={p.cwd ?? ''}>
                {p.displayName}
              </option>
            ))}
          </select>
          <select
            value={branchFilter ?? ''}
            onChange={(e) => setBranchFilter(e.target.value || null)}
            className="rounded border border-slate-200 text-sm px-2 py-1.5 text-slate-600 bg-white dark:border-[#30363d] dark:text-[#8b949e] dark:bg-[#21262d]"
          >
            <option value="">All branches</option>
            {branchesData?.branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <DateRangePicker />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
        {isLoading && (
          <p className="text-slate-500 dark:text-[#8b949e] text-sm">Loading sessions…</p>
        )}
        {isError && <p className="text-red-500 text-sm">Failed to load sessions.</p>}
        {!isLoading && !isError && (
          <>
            <SortableTable<SessionRow>
              columns={columns}
              rows={data?.sessions ?? []}
              defaultSortKey="timestamp"
              defaultSortDir="desc"
              emptyMessage={pickQuip(QUIPS.empty_sessions)}
              onRowClick={(row) => navigate(`/sessions/${row.sessionId as string}`)}
            />
            <div className="flex items-center justify-between mt-4 text-sm text-slate-600 dark:text-[#8b949e]">
              <span>
                {data
                  ? `Showing ${(page - 1) * (data.pageSize ?? 50) + 1}–${Math.min(page * (data.pageSize ?? 50), data.total)} of ${data.total}`
                  : ''}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border border-slate-200 dark:border-[#30363d] disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-[#21262d]"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded border border-slate-200 dark:border-[#30363d] disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-[#21262d]"
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
