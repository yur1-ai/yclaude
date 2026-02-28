import { useQuery } from '@tanstack/react-query';
import type { SummaryData } from './useSummary';

export function useAllTimeSummary() {
  return useQuery<SummaryData>({
    queryKey: ['summary', 'all-time'],
    queryFn: async () => {
      const res = await fetch('/api/v1/summary');
      if (!res.ok) throw new Error('Failed to fetch all-time summary');
      return res.json() as Promise<SummaryData>;
    },
  });
}
