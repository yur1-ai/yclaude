import { useQuery } from '@tanstack/react-query';
import type { SummaryData } from './useSummary';

/**
 * Fetches summary for the prior equivalent period.
 * If current period is [from, to], prior period is [from - duration, from].
 * Returns null data (not an error) if from/to are undefined (no range selected).
 */
export function usePriorSummary(from: Date | undefined, to: Date | undefined) {
  const enabled = Boolean(from && to);

  const priorFrom =
    from && to ? new Date(from.getTime() - (to.getTime() - from.getTime())) : undefined;
  const priorTo = from ? new Date(from.getTime()) : undefined;

  const params = new URLSearchParams();
  if (priorFrom) params.set('from', priorFrom.toISOString());
  if (priorTo) params.set('to', priorTo.toISOString());

  return useQuery<SummaryData>({
    queryKey: ['summary-prior', priorFrom?.toISOString(), priorTo?.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/v1/summary?${params}`);
      if (!res.ok) throw new Error('Failed to fetch prior summary');
      return res.json() as Promise<SummaryData>;
    },
    enabled,
  });
}
