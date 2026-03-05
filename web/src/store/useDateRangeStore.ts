import { create } from 'zustand';

export type Preset = '24h' | '48h' | '7d' | '30d' | '90d' | 'all' | 'custom';

interface DateRangeState {
  from: Date | undefined;
  to: Date | undefined;
  preset: Preset;
  setPreset: (preset: Preset) => void;
  setCustomRange: (from: Date | undefined, to: Date | undefined) => void;
}

function presetToDates(preset: Preset): { from: Date | undefined; to: Date | undefined } {
  if (preset === 'all') return { from: undefined, to: undefined };
  const to = new Date();
  if (preset === '24h' || preset === '48h') {
    const hours = preset === '24h' ? 24 : 48;
    const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
    return { from, to };
  }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from, to };
}

export const useDateRangeStore = create<DateRangeState>((set) => {
  const { from, to } = presetToDates('7d');
  return {
    from,
    to,
    preset: '7d',
    setPreset: (preset) => set({ preset, ...presetToDates(preset) }),
    setCustomRange: (from, to) => set({ preset: 'custom', from, to }),
  };
});
