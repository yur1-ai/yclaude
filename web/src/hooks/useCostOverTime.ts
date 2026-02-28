import { useQuery } from '@tanstack/react-query';
import { useDateRangeStore } from '../store/useDateRangeStore';

export type Bucket = 'day' | 'week' | 'month';

export interface CostOverTimeData {
  data: Array<{ date: string; cost: number }>;
  bucket: string;
}

export function useCostOverTime(bucket: Bucket) {
  const { from, to } = useDateRangeStore();
  const params = new URLSearchParams({ bucket });
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());

  return useQuery<CostOverTimeData>({
    queryKey: ['cost-over-time', from?.toISOString(), to?.toISOString(), bucket],
    queryFn: async () => {
      const res = await fetch(`/api/v1/cost-over-time?${params}`);
      if (!res.ok) throw new Error('Failed to fetch cost over time');
      return res.json() as Promise<CostOverTimeData>;
    },
  });
}
