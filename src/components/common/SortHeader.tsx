import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { SortDirection } from '../../utils/sortUtils';

interface SortHeaderProps {
  label: string;
  columnKey: string;
  currentSortKey?: string | null;
  currentDirection?: SortDirection;
  onSort: (columnKey: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
  title?: string;
}

export const SortHeader: React.FC<SortHeaderProps> = ({
  label,
  columnKey,
  currentSortKey,
  currentDirection,
  onSort,
  align = 'left',
  className = '',
  title,
}) => {
  const isActive = currentSortKey === columnKey && currentDirection !== null;

  const alignClass =
    align === 'center'
      ? 'justify-center text-center'
      : align === 'right'
      ? 'justify-end text-right'
      : 'justify-start text-left';

  return (
    <button
      type="button"
      onClick={() => onSort(columnKey)}
      title={title || `Сортировать по: ${label}`}
      className={`group/sort flex items-center gap-1.5 w-full font-inherit cursor-pointer select-none transition-colors hover:text-indigo-600 focus:outline-none ${alignClass} ${
        isActive ? 'text-indigo-600 font-bold' : ''
      } ${className}`}
    >
      <span className="truncate">{label}</span>
      <span
        className={`inline-flex shrink-0 transition-opacity p-0.5 rounded ${
          isActive
            ? 'opacity-100 bg-indigo-50 text-indigo-600'
            : 'opacity-40 group-hover/sort:opacity-80 text-slate-400'
        }`}
      >
        {isActive && currentDirection === 'asc' ? (
          <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
        ) : isActive && currentDirection === 'desc' ? (
          <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5" />
        )}
      </span>
    </button>
  );
};
