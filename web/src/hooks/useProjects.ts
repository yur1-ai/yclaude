import { useQuery } from '@tanstack/react-query';
import { useDateRangeStore } from '../store/useDateRangeStore';
import { useProviderStore } from '../store/useProviderStore';

export interface ProjectRow extends Record<string, unknown> {
  displayName: string;
  cwd: string | null;
  costUsd: number;
  eventCount: number;
  tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
}

export interface ProjectsData {
  rows: ProjectRow[];
  totalCost: number;
}

export function useProjects() {
  const { from, to } = useDateRangeStore();
  const { provider } = useProviderStore();
  const params = new URLSearchParams();
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());
  if (provider !== 'all') params.set('provider', provider);

  return useQuery<ProjectsData>({
    queryKey: ['projects', from?.toISOString(), to?.toISOString(), provider],
    queryFn: async () => {
      const res = await fetch(`/api/v1/projects?${params}`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json() as Promise<ProjectsData>;
    },
  });
}
