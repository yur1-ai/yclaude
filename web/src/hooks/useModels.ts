import { useQuery } from '@tanstack/react-query';
import { useDateRangeStore } from '../store/useDateRangeStore';
import { useProviderStore } from '../store/useProviderStore';

export interface ModelRow extends Record<string, unknown> {
  model: string;
  costUsd: number;
  eventCount: number;
  tokens: { input: number; output: number; cacheCreation: number; cacheRead: number };
}

export interface ModelsData {
  rows: ModelRow[];
  totalCost: number;
  unknownModels?: { models: string[]; sessionCount: number } | null;
}

export function useModels() {
  const { from, to } = useDateRangeStore();
  const { provider } = useProviderStore();
  const params = new URLSearchParams();
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());
  if (provider !== 'all') params.set('provider', provider);

  return useQuery<ModelsData>({
    queryKey: ['models', from?.toISOString(), to?.toISOString(), provider],
    queryFn: async () => {
      const res = await fetch(`/api/v1/models?${params}`);
      if (!res.ok) throw new Error('Failed to fetch models');
      return res.json() as Promise<ModelsData>;
    },
  });
}
