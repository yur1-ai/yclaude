import { useState } from 'react';

type SortDir = 'asc' | 'desc';

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface SortableTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  rows: T[];
  defaultSortKey: keyof T;
  defaultSortDir?: SortDir;
  highlightKey?: keyof T;
  highlightValue?: string | null;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function SortableTable<T extends Record<string, unknown>>({
  columns,
  rows,
  defaultSortKey,
  defaultSortDir = 'desc',
  highlightKey,
  highlightValue,
  emptyMessage = 'No data for this period',
  onRowClick,
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T>(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  const handleSort = (key: keyof T, isSortable: boolean) => {
    if (!isSortable) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    // Nulls always sort to bottom regardless of direction
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((col, colIdx) => {
              const isSortable = col.sortable !== false;
              const isActive = sortKey === col.key;
              return (
                <th
                  key={`${String(col.key)}-${colIdx}`}
                  onClick={() => handleSort(col.key, isSortable)}
                  className={`py-2 px-3 text-left font-semibold text-slate-600 select-none ${
                    isSortable ? 'cursor-pointer hover:text-slate-900' : ''
                  } ${isActive ? 'text-slate-900' : ''}`}
                >
                  {col.label}
                  {isSortable && isActive && (
                    <span className="ml-1 text-xs">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => {
              const isHighlighted =
                highlightKey !== undefined &&
                highlightValue !== undefined &&
                highlightValue !== null &&
                row[highlightKey] === highlightValue;
              return (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-slate-100 transition-colors ${
                    isHighlighted ? 'bg-slate-100' : 'hover:bg-slate-50'
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col, colIdx) => (
                    <td key={`${String(col.key)}-${colIdx}`} className="py-2 px-3 text-slate-700">
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
