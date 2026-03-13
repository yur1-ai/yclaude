import { create } from 'zustand';
import type { ProviderFilter, ProviderId } from '../lib/providers';

interface ProviderEntry {
  id: ProviderId;
  name: string;
  eventCount: number;
}

interface ProviderState {
  provider: ProviderFilter;
  providers: ProviderEntry[];
  setProvider: (p: ProviderFilter) => void;
  setProviders: (list: ProviderEntry[]) => void;
}

export const useProviderStore = create<ProviderState>((set) => ({
  provider: 'claude',
  providers: [],
  setProvider: (provider) => set({ provider }),
  setProviders: (providers) => set({ providers }),
}));
