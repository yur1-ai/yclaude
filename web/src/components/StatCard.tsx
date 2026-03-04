interface StatCardProps {
  label: string;
  value: string; // pre-formatted dollar string, e.g. "$14.32 est."
  children?: React.ReactNode; // slot for TrendIndicator
  quip?: string;
  labelSuffix?: React.ReactNode;
}

export function StatCard({ label, value, children, quip, labelSuffix }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-[#30363d] dark:bg-[#161b22]">
      <p className="text-sm font-medium text-slate-500 dark:text-[#8b949e]">{label}{labelSuffix}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-[#e6edf3]">
        {value}
      </p>
      {children && <div className="mt-2">{children}</div>}
      {quip && <p className="mt-2 text-xs text-slate-400 dark:text-[#8b949e] italic">{quip}</p>}
    </div>
  );
}
