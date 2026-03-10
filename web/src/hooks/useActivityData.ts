import { useQuery } from '@tanstack/react-query';
import type { Activity } from 'react-activity-calendar';
import { useProviderStore } from '../store/useProviderStore';

export interface ActivityResponse {
  data: Activity[];
  year: number;
}

export function useActivityData(year: number) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { provider } = useProviderStore();

  return useQuery<ActivityResponse>({
    queryKey: ['activity', year, tz, provider],
    queryFn: async () => {
      const params = new URLSearchParams({ year: String(year), tz });
      if (provider !== 'all') params.set('provider', provider);
      const res = await fetch(`/api/v1/activity?${params}`);
      if (!res.ok) throw new Error('Failed to fetch activity data');
      return res.json() as Promise<ActivityResponse>;
    },
  });
}
