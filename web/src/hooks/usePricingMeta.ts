import { useQuery } from '@tanstack/react-query';
import { useProviderStore } from '../store/useProviderStore';

interface PricingMeta {
  lastUpdated: string;
  source: string;
}

export function usePricingMeta() {
  const { provider } = useProviderStore();

  return useQuery<PricingMeta>({
    queryKey: ['pricing-meta', provider],
    queryFn: async () => {
      const res = await fetch('/api/v1/pricing-meta');
      if (!res.ok) throw new Error('Failed to fetch pricing meta');
      return res.json() as Promise<PricingMeta>;
    },
    staleTime: Number.POSITIVE_INFINITY, // static for server lifetime, never refetch
  });
}
