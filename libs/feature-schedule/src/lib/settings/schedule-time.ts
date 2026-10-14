import type { WeeklyWindow } from '@app/shared/types';
import { HOURS_MINUTES_PATTERN, WEEKDAY_NAMES } from './schedule-settings.constants';
import type { DayHours } from './schedule-settings.types';

/** What a day gets when it's switched on. */
const DEFAULT_DAY_START = '09:00';
const DEFAULT_DAY_END = '17:00';

/** A meeting length in Hebrew: "חצי שעה", "שעה", "שעה וחצי", "שעתיים", "3 שעות"… */
export function formatLength(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes !== 0 && minutes !== 30) {
    return `${totalMinutes} דקות`;
  }

  const half = minutes === 30;

  switch (hours) {
    case 0:
      return 'חצי שעה';
    case 1:
      return half ? 'שעה וחצי' : 'שעה';
    case 2:
      return half ? 'שעתיים וחצי' : 'שעתיים';
    default:
      return half ? `${hours}.5 שעות` : `${hours} שעות`;
  }
}

/** Cancellation window as hours:minutes, e.g. 1440 → "24:00". */
export function formatHoursMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  return `${hours}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

/** "24:00" → 1440; null when it isn't hours:minutes. */
export function parseHoursMinutes(value: string): number | null {
  const trimmed = value.trim();

  if (!HOURS_MINUTES_PATTERN.test(trimmed)) {
    return null;
  }

  const [hours, minutes] = trimmed.split(':').map(Number);
  return hours * 60 + minutes;
}

/** The API's windows → seven days of "hours + breaks" (a break is the gap between two windows). */
export function windowsToDays(windows: readonly WeeklyWindow[]): DayHours[] {
  return WEEKDAY_NAMES.map((_, weekday) => {
    const day = windows
      .filter((window) => window.weekday === weekday)
      .sort((a, b) => a.start.localeCompare(b.start));

    if (day.length === 0) {
      return { weekday, working: false, start: DEFAULT_DAY_START, end: DEFAULT_DAY_END, breaks: [] };
    }

    return {
      weekday,
      working: true,
      start: day[0].start,
      end: day[day.length - 1].end,
      // A break is a gap between windows; touching windows (the API allows them) are one stretch.
      breaks: day
        .slice(1)
        .map((window, index) => ({ start: day[index].end, end: window.start }))
        .filter((range) => range.start < range.end),
    };
  });
}

/** Seven days of "hours + breaks" → the API's windows: each working day cut at its breaks. */
export function daysToWindows(days: readonly DayHours[]): WeeklyWindow[] {
  return days
    .filter((day) => day.working)
    .flatMap((day) => {
      const breaks = [...day.breaks].sort((a, b) => a.start.localeCompare(b.start));
      const edges = [day.start, ...breaks.flatMap((range) => [range.start, range.end]), day.end];
      const windows: WeeklyWindow[] = [];

      for (let index = 0; index < edges.length; index += 2) {
        windows.push({ weekday: day.weekday, start: edges[index], end: edges[index + 1] });
      }

      return windows;
    });
}
