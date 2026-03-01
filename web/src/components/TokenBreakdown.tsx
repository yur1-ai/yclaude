import type { SummaryData } from '../hooks/useSummary';

interface TokenBreakdownProps {
  tokens: SummaryData['totalTokens'];
  totalCost: number;
}

interface TokenRow {
  label: string;
  count: number;
  color: string;
}

export function TokenBreakdown({ tokens, totalCost }: TokenBreakdownProps) {
  const { input, output, cacheCreation, cacheRead } = tokens;
  const totalTokens = input + output + cacheCreation + cacheRead;

  const rows: TokenRow[] = [
    { label: 'Input', count: input, color: 'var(--color-token-input)' },
    { label: 'Output', count: output, color: 'var(--color-token-output)' },
    { label: 'Cache write', count: cacheCreation, color: 'var(--color-token-cache-write)' },
    { label: 'Cache read', count: cacheRead, color: 'var(--color-token-cache-read)' },
  ];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-400 dark:text-[#6e7681] uppercase">
          <th className="text-left font-medium pb-2 w-28">Type</th>
          <th className="text-left font-medium pb-2">Share</th>
          <th className="text-right font-medium pb-2 w-16">%</th>
          <th className="text-right font-medium pb-2 w-24">Tokens</th>
          <th className="text-right font-medium pb-2 w-28">Est. cost</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ label, count, color }) => {
          const share = totalTokens > 0 ? (count / totalTokens) * 100 : 0;
          // Proportional cost allocation: approximate since different token types have different rates.
          // Actual rates would require per-type pricing data from the server (deferred to Phase 5+).
          const typeCost = totalTokens > 0 ? totalCost * (count / totalTokens) : 0;

          return (
            <tr key={label} className="border-t border-slate-100 dark:border-[#30363d]">
              <td className="py-2 pr-4 text-slate-700 dark:text-[#e6edf3] font-medium">{label}</td>
              <td className="py-2 pr-4">
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[#21262d]">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${share}%`, backgroundColor: color }}
                  />
                </div>
              </td>
              <td className="py-2 pl-2 text-right text-slate-600 dark:text-[#8b949e] tabular-nums">
                {share.toFixed(1)}%
              </td>
              <td className="py-2 pl-2 text-right text-slate-600 dark:text-[#8b949e] tabular-nums">
                {count.toLocaleString()}
              </td>
              <td className="py-2 pl-2 text-right text-slate-600 dark:text-[#8b949e] tabular-nums">
                ~${typeCost.toFixed(2)} est.
              </td>
            </tr>
          );
        })}
        {/* Footer row: totals */}
        <tr className="border-t border-slate-200 dark:border-[#30363d] font-semibold text-slate-700 dark:text-[#e6edf3]">
          <td className="pt-3 pr-4">Total</td>
          <td className="pt-3 pr-4">—</td>
          <td className="pt-3 pl-2 text-right tabular-nums">100%</td>
          <td className="pt-3 pl-2 text-right tabular-nums">{totalTokens.toLocaleString()}</td>
          <td className="pt-3 pl-2 text-right tabular-nums">${totalCost.toFixed(2)} est.</td>
        </tr>
      </tbody>
    </table>
  );
}
