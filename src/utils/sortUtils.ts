export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
  accessor?: (item: T) => any;
}

/**
 * Parses date string in format "DD.MM.YYYY" or "DD.MM.YYYY HH:mm:ss" or ISO string
 */
export function parseDateValue(val: any): number {
  if (!val) return -Infinity;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (!s || s === '—' || s === '-') return -Infinity;

  // DD.MM.YYYY or DD.MM.YYYY HH:mm:ss
  const dotParts = s.split(' ');
  const datePart = dotParts[0];
  const timePart = dotParts[1] || '00:00:00';

  if (datePart && datePart.includes('.')) {
    const [d, m, y] = datePart.split('.');
    if (d && m && y) {
      const [hh, mm, ss] = timePart.split(':');
      const year = parseInt(y, 10);
      const month = parseInt(m, 10) - 1;
      const day = parseInt(d, 10);
      const hours = parseInt(hh || '0', 10);
      const minutes = parseInt(mm || '0', 10);
      const seconds = parseInt(ss || '0', 10);
      const date = new Date(year, month, day, hours, minutes, seconds);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
    }
  }

  // Try standard parse
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) {
    return parsed;
  }

  return -Infinity;
}

/**
 * Checks if a value is numeric or can be parsed as a number
 */
export function parseNumericValue(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const s = String(val).replace(/\s+/g, '').replace(',', '.');
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const num = parseFloat(s);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Universal compare function for two values
 */
export function compareValues(a: any, b: any): number {
  // Empty values handling
  const aEmpty = a === null || a === undefined || a === '' || a === '—' || a === '-';
  const bEmpty = b === null || b === undefined || b === '' || b === '—' || b === '-';

  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1; // Put empties at end
  if (bEmpty) return -1;

  // Check if both are dates (contains DD.MM.YYYY)
  const aStr = String(a).trim();
  const bStr = String(b).trim();
  const isDatePattern = /^\d{2}\.\d{2}\.\d{4}/;

  if (isDatePattern.test(aStr) && isDatePattern.test(bStr)) {
    const timeA = parseDateValue(aStr);
    const timeB = parseDateValue(bStr);
    return timeA - timeB;
  }

  // Check if numbers
  const numA = parseNumericValue(a);
  const numB = parseNumericValue(b);
  if (numA !== null && numB !== null) {
    return numA - numB;
  }

  // String comparison
  return aStr.localeCompare(bStr, 'ru', { numeric: true, sensitivity: 'base' });
}

/**
 * Sorts an array using a SortConfig
 */
export function sortData<T>(
  data: T[],
  sortConfig: SortConfig<T> | null,
  customAccessor?: (item: T, key: string) => any
): T[] {
  if (!sortConfig || !sortConfig.direction || !sortConfig.key) {
    return data;
  }

  const { key, direction, accessor } = sortConfig;

  return [...data].sort((itemA, itemB) => {
    let valA = accessor ? accessor(itemA) : customAccessor ? customAccessor(itemA, key as string) : (itemA as any)[key];
    let valB = accessor ? accessor(itemB) : customAccessor ? customAccessor(itemB, key as string) : (itemB as any)[key];

    const result = compareValues(valA, valB);
    return direction === 'asc' ? result : -result;
  });
}
