import { WEEKLY_WINDOWS_MAX_PER_DAY } from '@app/shared/types';

/** 0 = Sunday … 6 = Saturday, as the API counts. */
export const WEEKDAY_NAMES: readonly string[] = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/** Cancellation window as hours:minutes, e.g. "24:00". */
export const HOURS_MINUTES_PATTERN = /^\d{1,4}:[0-5]\d$/;

/** A day becomes up to this many windows, so it can have one break fewer. */
export const MAX_BREAKS_PER_DAY = WEEKLY_WINDOWS_MAX_PER_DAY - 1;
