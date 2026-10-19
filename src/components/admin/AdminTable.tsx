import React, { ReactNode } from 'react';

export interface AdminTableColumn<T = any> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => ReactNode;
  hideOn?: 'sm' | 'md' | 'lg';
}

export interface AdminTableProps<T = any> {
  columns: AdminTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  children?: ReactNode;
}

export function AdminTable<T = any>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  rowClassName,
  emptyMessage = 'No records found.',
  className = '',
  children,
}: AdminTableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50/60">
            {columns.map(col => (
              <th
                key={col.key}
                className={`px-4 py-3 text-[11px] font-semibold text-ink-400 uppercase tracking-wide whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.hideOn ? `hidden ${col.hideOn}:table-cell` : ''}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-ink-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={keyExtractor(row)}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-ink-50/60' : 'hover:bg-ink-50/40'} ${rowClassName?.(row) || ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-ink-700 align-top ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.hideOn ? `hidden ${col.hideOn}:table-cell` : ''}`}
                  >
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
          {children}
        </tbody>
      </table>
    </div>
  );
}

export default AdminTable;