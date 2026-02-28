import { useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
// Import react-day-picker styles in this file only to avoid global CSS pollution
import 'react-day-picker/style.css';
import { useDateRangeStore, type Preset } from '../store/useDateRangeStore';

type PresetButton = { key: Preset; label: string };
const PRESETS: PresetButton[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: 'all', label: 'All time' },
];

function formatDate(d: Date): string {
  return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

function getActiveLabel(preset: Preset, from: Date | undefined, to: Date | undefined): string {
  switch (preset) {
    case '7d':
      return 'Last 7d';
    case '30d':
      return 'Last 30d';
    case '90d':
      return 'Last 90d';
    case 'all':
      return 'All time';
    case 'custom':
      if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
      return 'Custom';
  }
}

export function DateRangePicker() {
  const { preset, from, to, setPreset, setCustomRange } = useDateRangeStore();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selected, setSelected] = useState<DateRange | undefined>(
    from && to ? { from, to } : undefined,
  );

  const handlePresetClick = (key: Preset) => {
    setPreset(key);
    setCalendarOpen(false);
  };

  const handleCustomClick = () => {
    setCalendarOpen((open) => !open);
  };

  return (
    <div className="relative flex flex-col items-end">
      {/* Preset buttons row */}
      <div className="flex items-center gap-1">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handlePresetClick(key)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              preset === key
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={handleCustomClick}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            preset === 'custom'
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {preset === 'custom' ? getActiveLabel('custom', from, to) : 'Custom'}
        </button>
      </div>

      {/* Calendar popover */}
      {calendarOpen && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setCalendarOpen(false)}
          />
          {/* Calendar container */}
          <div className="absolute top-10 right-0 z-20 rounded-lg border border-slate-200 bg-white shadow-lg p-2">
            <DayPicker
              mode="range"
              selected={selected}
              onSelect={(range) => {
                setSelected(range ?? undefined);
                if (range?.from && range?.to) {
                  setCustomRange(range.from, range.to);
                  setCalendarOpen(false);
                }
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
