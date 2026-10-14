import { DATE_PATTERN } from '@app/shared/types';

/**
 * Calendar dates as `YYYY-MM-DD` strings: pure, no time zones (computed in UTC, where a day is
 * always 24 hours). Israel's "today" comes from israel-time.ts.
 */

function toUtc(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUtc(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** A real calendar date: matches `YYYY-MM-DD` and exists (no February 30th). */
export function isValidDate(date: string): boolean {
  return DATE_PATTERN.test(date) && fromUtc(toUtc(date)) === date;
}

export function addDays(date: string, days: number): string {
  const value = toUtc(date);
  value.setUTCDate(value.getUTCDate() + days);
  return fromUtc(value);
}

/** One calendar month later; the 31st of a shorter month becomes that month's last day. */
export function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return fromUtc(new Date(Date.UTC(year, month - 1 + months, Math.min(day, lastDay))));
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

/** Every date from `from` to `to`, both included; empty when `to` is before `from`. */
export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];

  for (let date = from; date <= to; date = addDays(date, 1)) {
    dates.push(date);
  }

  return dates;
}

export function earlierOf(a: string, b: string): string {
  return a < b ? a : b;
}
