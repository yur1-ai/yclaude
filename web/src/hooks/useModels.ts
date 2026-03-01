import { useQuery } from '@tanstack/react-query';
import { useDateRangeStore } from '../store/useDateRangeStore';

export interface ModelRow {
  model: string;
  costUsd: number;
  eventCount: number;
  tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
}

export interface ModelsData {
  rows: ModelRow[];
  totalCost: number;
}

export function useModels() {
  const { from, to } = useDateRangeStore();
  const params = new URLSearchParams();
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());

  return useQuery<ModelsData>({
    queryKey: ['models', from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/v1/models?${params}`);
      if (!res.ok) throw new Error('Failed to fetch models');
      return res.json() as Promise<ModelsData>;
    },
  });
}
