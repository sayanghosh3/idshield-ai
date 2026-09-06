import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  clickable?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  className,
  striped = true,
  hoverable = true,
  clickable = false,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
  sortBy,
  sortDirection,
  onSort,
}: TableProps<T>) {
  const sortableColumns = columns.filter(c => onSort);

  return (
    <div className={cn('table-container', className)}>
      {loading ? (
        <div className="p-8 text-center text-muted-text">
          <div className="animate-pulse-soft flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading...</span>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="p-8 text-center text-muted-text">{emptyMessage}</div>
      ) : (
        <table className="table" role="table">
          <thead>
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={cn('px-4 py-3 text-left font-medium text-muted-text border-b border-border', column.className)}
                  style={{ width: column.width }}
                  scope="col"
                >
                  {onSort && (
                    <button
                      onClick={() => onSort(column.key)}
                      className={cn('flex items-center gap-1.5 hover:text-text', sortableColumns.some(c => c.key === column.key) && 'cursor-pointer')}
                    >
                      {column.header}
                      {sortBy === column.key && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                        </svg>
                      )}
                    </button>
                  ) || (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={keyExtractor(row)}
                className={cn(
                  'transition-colors duration-150',
                  striped && rowIndex % 2 === 1 && 'bg-panel-secondary/30',
                  hoverable && 'hover:bg-panel-secondary/50',
                  clickable && onRowClick && 'cursor-pointer clickable'
                )}
                onClick={() => clickable && onRowClick?.(row)}
              >
                {columns.map(column => (
                  <td key={column.key} className={cn('px-4 py-3 border-b border-border/50', column.className)}>
                    {column.render ? column.render(row, rowIndex) : String((row as Record<string, unknown>)[column.key] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

interface SimpleTableProps {
  headers: string[];
  rows: (string | number)[][];
  className?: string;
  striped?: boolean;
}

export function SimpleTable({ headers, rows, className, striped = true }: SimpleTableProps) {
  return (
    <div className={cn('table-container', className)}>
      <table className="table">
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="px-4 py-3 text-left font-medium text-muted-text border-b border-border">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={cn('transition-colors duration-150', striped && rowIndex % 2 === 1 && 'bg-panel-secondary/30')}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 border-b border-border/50 text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}