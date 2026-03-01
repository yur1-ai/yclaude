import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDateRangeStore } from '../store/useDateRangeStore';

export interface SessionRow extends Record<string, unknown> {
  sessionId: string;
  displayName: string;
  cwd: string | null;
  model: string;
  models: string[];
  costUsd: number;
  mainCostUsd: number;
  subagentCostUsd: number;
  hasSubagents: boolean;
  gitBranch: string | null;
  tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
  timestamp: string;
  durationMs: number | null;
}

export interface SessionsData {
  sessions: SessionRow[];
  total: number;
  page: number;
  pageSize: number;
}

export function useSessions(projectFilter: string | null = null, branchFilter: string | null = null) {
  const { from, to } = useDateRangeStore();
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());
  if (projectFilter) params.set('project', projectFilter);
  if (branchFilter) params.set('branch', branchFilter);
  params.set('page', String(page));

  const query = useQuery<SessionsData>({
    queryKey: ['sessions', from?.toISOString(), to?.toISOString(), projectFilter, branchFilter, page],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sessions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch sessions');
      return res.json() as Promise<SessionsData>;
    },
  });

  return { ...query, page, setPage };
}
