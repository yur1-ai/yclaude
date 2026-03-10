import { useQuery } from '@tanstack/react-query';
import { useProviderStore } from '../store/useProviderStore';

export interface BranchesData {
  branches: string[];
}

export function useBranches() {
  const { provider } = useProviderStore();

  return useQuery<BranchesData>({
    queryKey: ['branches', provider],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (provider !== 'all') params.set('provider', provider);
      const qs = params.toString();
      const res = await fetch(`/api/v1/branches${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch branches');
      return res.json() as Promise<BranchesData>;
    },
  });
}
