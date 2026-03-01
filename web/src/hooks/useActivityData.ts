import { useQuery } from '@tanstack/react-query';
import type { Activity } from 'react-activity-calendar';

export interface ActivityResponse {
  data: Activity[];
  year: number;
}

export function useActivityData(year: number) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return useQuery<ActivityResponse>({
    queryKey: ['activity', year, tz],
    queryFn: async () => {
      const params = new URLSearchParams({ year: String(year), tz });
      const res = await fetch(`/api/v1/activity?${params}`);
      if (!res.ok) throw new Error('Failed to fetch activity data');
      return res.json() as Promise<ActivityResponse>;
    },
  });
}
