interface StatCardProps {
  label: string;
  value: string; // pre-formatted dollar string, e.g. "$14.32 est."
  children?: React.ReactNode; // slot for TrendIndicator
}

export function StatCard({ label, value, children }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
