import { toMinutes } from '@app/shared/types';

/**
 * Hebrew labels for the calendar. Dates are `YYYY-MM-DD` read as UTC midnight and formatted in
 * UTC, so the browser's own time zone never shifts a date by a day.
 */
const asUtc = (date: string) => new Date(`${date}T00:00:00Z`);

const weekdayLong = new Intl.DateTimeFormat('he-IL', { weekday: 'long', timeZone: 'UTC' });
const weekdayShort = new Intl.DateTimeFormat('he-IL', { weekday: 'short', timeZone: 'UTC' });
const dayMonth = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'UTC' });
const dayMonthName = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const clock = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Jerusalem',
});

/** "יום רביעי" */
export const weekdayName = (date: string): string => weekdayLong.format(asUtc(date));

/** "יום ד׳" */
export const weekdayShortName = (date: string): string => weekdayShort.format(asUtc(date));

/** "21.10" */
export const shortDate = (date: string): string => dayMonth.format(asUtc(date));

/**
 * "18–24 באוקטובר 2026"; across months "28 בספטמבר – 4 באוקטובר 2026"; across years
 * "27 בדצמבר 2026 – 2 בינואר 2027".
 */
export function weekRangeLabel(weekStart: string, weekEnd: string): string {
  const start = asUtc(weekStart);
  const end = asUtc(weekEnd);

  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    return `${dayMonthName.format(start)} ${start.getUTCFullYear()} – ${dayMonthName.format(end)} ${end.getUTCFullYear()}`;
  }

  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${start.getUTCDate()}–${dayMonthName.format(end)} ${end.getUTCFullYear()}`;
  }

  return `${dayMonthName.format(start)} – ${dayMonthName.format(end)} ${end.getUTCFullYear()}`;
}

/** The local time an epoch-ms instant was loaded at: "10:42". */
export const clockTime = (epochMs: number): string => clock.format(new Date(epochMs));

/** "09:00–10:00", shown left to right in RTL text by the caller (dir="ltr"). */
export const timeRange = (start: string, end: string): string => `${start}–${end}`;

/** Whole hours covering every window and appointment of the week; 08:00–18:00 when there are none. */
export function hourAxis(times: readonly { start: string; end: string }[]): number[] {
  if (times.length === 0) {
    return Array.from({ length: 10 }, (_, index) => 8 + index);
  }

  const first = Math.floor(Math.min(...times.map((time) => toMinutes(time.start))) / 60);
  const last = Math.ceil(Math.max(...times.map((time) => toMinutes(time.end))) / 60);
  return Array.from({ length: Math.max(last - first, 1) }, (_, index) => first + index);
}
