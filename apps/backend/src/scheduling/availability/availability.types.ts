/** A stretch of one day in minutes since midnight, `[start, end)`. Israel time; no time zones here. */
export interface MinuteRange {
  start: number;
  end: number;
}

/** Everything the free-time calculation needs for one day; all minutes since midnight. */
export interface DayAvailabilityInput {
  /** That day's windows: the weekly ones for its weekday plus any extra window on that date. */
  windows: readonly MinuteRange[];
  /** `BOOKED` appointments that day. */
  bookings: readonly MinuteRange[];
  /** The Provider's grid: starts are window start + n × unit. */
  timeUnitMinutes: number;
  /** The meeting type's length; a multiple of the unit (ADR-0009). */
  lengthMinutes: number;
  /**
   * For today: nothing that starts before this minute. The caller rounds the current time UP to
   * the next whole minute, so a meeting that already started is never offered. Omit for other days.
   */
  notBeforeMinute?: number;
}

/**
 * A one-off window on a specific date (`YYYY-MM-DD`), times `HH:MM`. It must not overlap or touch
 * that date's weekly windows (enforced when it's created, 4b): it has its own grid.
 */
export interface ExtraWindowRule {
  date: string;
  start: string;
  end: string;
}
