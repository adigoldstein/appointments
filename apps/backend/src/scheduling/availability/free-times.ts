import { toMinutes, weekdayOf, type ScheduleWindow, type WeeklyWindow } from '@app/shared/types';
import type { DayAvailabilityInput, ExtraWindowRule, MinuteRange } from './availability.types';

/**
 * The free-time calculation (ADR-0009): pure functions, no database, no clock, no time zones.
 * Dates are `YYYY-MM-DD` and times are minutes since midnight, all Israel time; the caller
 * (the availability service, step 4b) supplies "today", "now" and the stored rules.
 */

/**
 * Sorted, with overlapping or touching ranges joined: a continuous stretch of work is one window.
 * An empty or invalid range (end not after start, NaN) is dropped rather than corrupting the rest.
 */
export function mergeRanges(ranges: readonly MinuteRange[]): MinuteRange[] {
  const sorted = ranges.filter((range) => range.start < range.end).sort((a, b) => a.start - b.start);
  const merged: MinuteRange[] = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];

    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  return merged;
}

/** A date's windows as stored and shown: the weekly ones for its weekday plus its extra windows, by start. */
export function windowsOnDate(
  date: string,
  weekly: readonly WeeklyWindow[],
  extra: readonly ExtraWindowRule[],
): ScheduleWindow[] {
  const weekday = weekdayOf(date);

  return [
    ...weekly
      .filter((window) => window.weekday === weekday)
      .map((window) => ({ start: window.start, end: window.end, extra: false })),
    ...extra
      .filter((window) => window.date === date)
      .map((window) => ({ start: window.start, end: window.end, extra: true })),
  ].sort((a, b) => a.start.localeCompare(b.start));
}

/** The same windows in minutes, for the calculation. Not merged; `freeStartTimes` does that. */
export function windowsForDate(
  date: string,
  weekly: readonly WeeklyWindow[],
  extra: readonly ExtraWindowRule[],
): MinuteRange[] {
  return windowsOnDate(date, weekly, extra).map((window) => ({
    start: toMinutes(window.start),
    end: toMinutes(window.end),
  }));
}

/** Overlapping or touching: an extra window must stay apart from the weekly hours (ADR-0009). */
export function overlapsOrTouches(a: MinuteRange, b: MinuteRange): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/**
 * Whether a Client may book on `date`: from today up to "open until" (inclusive). Nothing is open
 * before a period was ever opened (`openUntil` null). The Provider's own bookings beyond
 * "open until" (Epic 5) don't go through this.
 */
export function isOpenForBooking(date: string, today: string, openUntil: string | null): boolean {
  return openUntil !== null && date >= today && date <= openUntil;
}

/**
 * The start times a meeting of `lengthMinutes` can take on one day: for every window, the grid
 * `window start + n × unit`, where the whole meeting fits inside the window, doesn't overlap a
 * booking, and (today) doesn't start before now. Windows are merged first, so a stretch made of
 * touching windows has one grid. (Extra windows never overlap or touch weekly ones, 4b; merging
 * them is only a fallback.)
 */
export function freeStartTimes(input: DayAvailabilityInput): number[] {
  const { timeUnitMinutes: unit, lengthMinutes: length, bookings } = input;

  if (unit <= 0 || length <= 0) {
    throw new RangeError('Time unit and meeting length must be positive');
  }

  const notBefore = input.notBeforeMinute ?? 0;
  const starts: number[] = [];

  for (const window of mergeRanges(input.windows)) {
    for (let start = window.start; start + length <= window.end; start += unit) {
      const end = start + length;
      const clashes = bookings.some((booking) => booking.start < end && start < booking.end);

      if (start >= notBefore && !clashes) {
        starts.push(start);
      }
    }
  }

  return starts;
}
