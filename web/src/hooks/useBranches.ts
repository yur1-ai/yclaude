import { useQuery } from '@tanstack/react-query';

export interface BranchesData {
  branches: string[];
}

export function useBranches() {
  return useQuery<BranchesData>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/v1/branches');
      if (!res.ok) throw new Error('Failed to fetch branches');
      return res.json() as Promise<BranchesData>;
    },
  });
}
