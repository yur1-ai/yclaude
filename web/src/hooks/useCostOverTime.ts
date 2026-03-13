import { useQuery } from '@tanstack/react-query';
import { useDateRangeStore } from '../store/useDateRangeStore';
import { useProviderStore } from '../store/useProviderStore';

export type Bucket = 'day' | 'week' | 'month' | 'hour';

export interface CostOverTimeData {
  data: Array<{ date: string; cost: number }>;
  bucket: string;
}

// Compute once at module load — no need to recompute on every render
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function useCostOverTime(bucket: Bucket) {
  const { from, to } = useDateRangeStore();
  const { provider } = useProviderStore();
  const params = new URLSearchParams({ bucket });
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());
  params.set('tz', LOCAL_TZ);
  if (provider !== 'all') params.set('provider', provider);

  return useQuery<CostOverTimeData>({
    queryKey: [
      'cost-over-time',
      from?.toISOString(),
      to?.toISOString(),
      bucket,
      LOCAL_TZ,
      provider,
    ],
    queryFn: async () => {
      const res = await fetch(`/api/v1/cost-over-time?${params}`);
      if (!res.ok) throw new Error('Failed to fetch cost over time');
      return res.json() as Promise<CostOverTimeData>;
    },
  });
}
