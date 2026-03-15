import { useQuery } from '@tanstack/react-query';
import { useProviderStore } from '../store/useProviderStore';

interface ProviderEntry {
  id: string;
  name: string;
  eventCount: number;
}

interface AppConfig {
  version: string;
  showMessages: boolean;
  providers?: ProviderEntry[];
}

export function useConfig() {
  const { provider } = useProviderStore();

  return useQuery<AppConfig>({
    queryKey: ['config', provider],
    queryFn: async () => {
      const res = await fetch('/api/v1/config');
      if (!res.ok) throw new Error('Failed to fetch config');
      return res.json() as Promise<AppConfig>;
    },
    staleTime: Number.POSITIVE_INFINITY, // config never changes during server lifetime
  });
}
