interface TrendIndicatorProps {
  percent: number | null; // e.g. 12.4 means +12.4% vs prior period
}

export function TrendIndicator({ percent }: TrendIndicatorProps) {
  if (percent === null) return <span className="text-xs text-slate-400">No prior data</span>;
  const isUp = percent >= 0;
  const arrow = isUp ? '↑' : '↓';
  const abs = Math.abs(percent).toFixed(1);
  return (
    <span className="text-sm text-slate-500">
      {arrow} {abs}% vs prior period
    </span>
  );
}
