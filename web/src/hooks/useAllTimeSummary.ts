import { useQuery } from '@tanstack/react-query';
import { useProviderStore } from '../store/useProviderStore';
import type { SummaryData } from './useSummary';

export function useAllTimeSummary() {
  const { provider } = useProviderStore();
  const params = new URLSearchParams();
  if (provider !== 'all') params.set('provider', provider);

  return useQuery<SummaryData>({
    queryKey: ['summary', 'all-time', provider],
    queryFn: async () => {
      const res = await fetch(`/api/v1/summary?${params}`);
      if (!res.ok) throw new Error('Failed to fetch all-time summary');
      return res.json() as Promise<SummaryData>;
    },
  });
}
