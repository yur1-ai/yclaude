import { useState, cloneElement } from 'react';
import { ActivityCalendar } from 'react-activity-calendar';
import type { Activity } from 'react-activity-calendar';
import { useActivityData } from '../hooks/useActivityData';
import { useThemeStore } from '../store/useThemeStore';
import { pickQuip, QUIPS } from '../lib/quips';

// Green color scale: level 0 = visible light gray, levels 1-4 = progressively darker green
// MUST use hex values — CSS variables (var(--color-*)) are NOT supported in react-activity-calendar theme prop
const HEATMAP_THEME = {
  light: [
    '#f0f0f0', // level 0: visible empty cell (light gray)
    '#d6f5d6', // level 1: very light green
    '#86d886', // level 2: medium green
    '#3aaa3a', // level 3: dark green
    '#1a6b1a', // level 4: darkest green
  ],
  dark: [
    '#161b22', // level 0: GitHub dark background
    '#0e4429', // level 1: very dark green
    '#006d32', // level 2: medium dark green
    '#26a641', // level 3: bright green
    '#39d353', // level 4: brightest green
  ],
};

function computeP90(data: Activity[]): number {
  const counts = data.filter(d => d.count > 0).map(d => d.count).sort((a, b) => a - b);
  if (counts.length === 0) return Infinity;
  const idx = Math.ceil(0.9 * counts.length) - 1;
  return counts[Math.max(0, idx)]!;
}

export function ActivityHeatmap() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = useActivityData(year);
  const { theme } = useThemeStore();
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && systemDark);
  const colorScheme: 'light' | 'dark' = isDark ? 'dark' : 'light';

  // Year range: last 3 years up to current year
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-[#e6edf3]">Activity</h2>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded border border-slate-200 text-xs px-2 py-1 text-slate-600 bg-white dark:border-[#30363d] dark:text-[#8b949e] dark:bg-[#21262d]"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="h-32 flex items-center justify-center text-slate-400 dark:text-[#8b949e] text-sm">
          Loading activity...
        </div>
      )}

      {!isLoading && data && (
        <div className="overflow-x-auto">
          {(() => {
            const p90 = computeP90(data.data);
            return (
              <ActivityCalendar
                data={data.data}
                theme={HEATMAP_THEME}
                colorScheme={colorScheme}
                showWeekdayLabels
                maxLevel={4}
                renderBlock={(block, activity: Activity) => {
                  const isPeak =
                    activity.count > 0 &&
                    activity.count >= p90 &&
                    activity.count >= 2;
                  if (isPeak) {
                    return cloneElement(
                      block as React.ReactElement<React.HTMLAttributes<SVGRectElement>>,
                      {
                        title: `${activity.date} \u2022 ${activity.count} session${activity.count === 1 ? '' : 's'}\n${pickQuip(QUIPS.heatmap_peak)}`,
                      },
                    );
                  }
                  if (activity.count > 0) {
                    return cloneElement(
                      block as React.ReactElement<React.HTMLAttributes<SVGRectElement>>,
                      {
                        title: `${activity.date} \u2022 ${activity.count} session${activity.count === 1 ? '' : 's'}`,
                      },
                    );
                  }
                  return block;
                }}
              />
            );
          })()}
        </div>
      )}

      {!isLoading && data && data.data.every((d) => d.count === 0) && (
        <p className="text-center text-sm text-slate-400 dark:text-[#8b949e] mt-2">
          No activity recorded for {year}
        </p>
      )}
    </div>
  );
}
