import { DATE_PATTERN } from './schedule-settings-rules';

/**
 * Calendar dates as `YYYY-MM-DD` strings: pure, no time zones (computed in UTC, where a day is
 * always 24 hours). Shared by the backend's scheduling and the frontend calendar (ADR-0008),
 * so both sides count days the same way. Israel's "today" needs a clock and lives with each side.
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

/** 0 = Sunday … 6 = Saturday, independent of the machine's time zone. */
export function weekdayOf(date: string): number {
  return toUtc(date).getUTCDay();
}

/** The Sunday that starts the date's week (Israeli weeks start on Sunday). */
export function weekStartOf(date: string): string {
  return addDays(date, -weekdayOf(date));
}
