import { useState, cloneElement } from 'react';
import { ActivityCalendar } from 'react-activity-calendar';
import type { Activity } from 'react-activity-calendar';
import { useActivityData } from '../hooks/useActivityData';

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
};

const QUIPS = [
  'Why, Claude?!',
  'The AI bills are mounting...',
  'Claude was working overtime!',
  'This is fine.',
  'Peak productivity achieved',
  'Claude: doing its best',
];

function getQuip(count: number): string {
  return QUIPS[count % QUIPS.length]!;
}

export function ActivityHeatmap() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = useActivityData(year);

  // Year range: last 3 years up to current year
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700">Activity</h2>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded border border-slate-200 text-xs px-2 py-1 text-slate-600 bg-white"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
          Loading activity...
        </div>
      )}

      {!isLoading && data && (
        <div className="overflow-x-auto">
          <ActivityCalendar
            data={data.data}
            theme={HEATMAP_THEME}
            colorScheme="light"
            showWeekdayLabels
            maxLevel={4}
            renderBlock={(block, activity: Activity) => {
              if (activity.count > 0) {
                return cloneElement(
                  block as React.ReactElement<React.HTMLAttributes<SVGRectElement>>,
                  {
                    title: `${activity.count} session${activity.count === 1 ? '' : 's'} \u2014 ${getQuip(activity.count)}`,
                  },
                );
              }
              return block;
            }}
          />
        </div>
      )}

      {!isLoading && data && data.data.every((d) => d.count === 0) && (
        <p className="text-center text-sm text-slate-400 mt-2">
          No activity recorded for {year}
        </p>
      )}
    </div>
  );
}
