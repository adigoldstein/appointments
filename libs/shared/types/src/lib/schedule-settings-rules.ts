import type { TimeUnitMinutes } from './schedule-settings';

/**
 * Appointment settings limits (ADR-0009), shared by the backend DTOs and the settings screen so
 * they can't drift apart (ADR-0008). Lengths are in minutes.
 */
export const TIME_UNIT_OPTIONS_MINUTES: readonly TimeUnitMinutes[] = [30, 60];

/** 7 days. */
export const CANCELLATION_WINDOW_MAX_MINUTES = 10_080;
/** What a new Provider starts with: 24 hours (also the DB column default). */
export const CANCELLATION_WINDOW_DEFAULT_MINUTES = 1_440;

export const MEETING_TYPE_NAME_MIN_LENGTH = 2;
export const MEETING_TYPE_NAME_MAX_LENGTH = 60;

/** 8 hours. */
export const MEETING_TYPE_MAX_LENGTH_MINUTES = 480;
export const MEETING_TYPES_MAX_COUNT = 12;

export const WEEKLY_WINDOWS_MAX_PER_DAY = 6;

/** `HH:MM`, 00:00-23:59. */
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** How far ahead the calendar may be opened, in weeks (the Provider's opening limit). */
export const MAX_OPEN_WEEKS_DEFAULT = 12;
export const MAX_OPEN_WEEKS_MIN = 1;
export const MAX_OPEN_WEEKS_MAX = 52;

/** `YYYY-MM-DD`. Whether it's a real date is checked separately. */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The longest range one schedule query may cover, in days. */
export const SCHEDULE_RANGE_MAX_DAYS = 62;
