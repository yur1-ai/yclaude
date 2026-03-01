import { useQuery } from '@tanstack/react-query';
import { useDateRangeStore } from '../store/useDateRangeStore';

export interface SummaryData {
  totalCost: number;
  totalTokens: {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
  };
  eventCount: number;
  subagentCostUsd?: number;
  mainCostUsd?: number;
}

export function useSummary() {
  const { from, to } = useDateRangeStore();
  const params = new URLSearchParams();
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());

  return useQuery<SummaryData>({
    queryKey: ['summary', from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/v1/summary?${params}`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json() as Promise<SummaryData>;
    },
  });
}
