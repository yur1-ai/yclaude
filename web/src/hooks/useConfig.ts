import { useQuery } from '@tanstack/react-query';

interface AppConfig {
  showMessages: boolean;
}

export function useConfig() {
  return useQuery<AppConfig>({
    queryKey: ['config'],
    queryFn: async () => {
      const res = await fetch('/api/v1/config');
      if (!res.ok) throw new Error('Failed to fetch config');
      return res.json() as Promise<AppConfig>;
    },
    staleTime: Number.POSITIVE_INFINITY, // config never changes during server lifetime
  });
}
