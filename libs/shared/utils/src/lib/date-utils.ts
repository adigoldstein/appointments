import { format, isValid, parseISO } from 'date-fns';

export function formatDisplayDate(value: string | Date, pattern = 'MMM d, yyyy'): string {
  const date = typeof value === 'string' ? parseISO(value) : value;

  return isValid(date) ? format(date, pattern) : '';
}

export function toDateInputValue(value: string | Date): string {
  return formatDisplayDate(value, 'yyyy-MM-dd');
}
