/**
 * Availability API shapes (ADR-0009, Epic 4 step 4b). Dates are `YYYY-MM-DD` and times `HH:MM`,
 * all Israel time.
 */

/** An appointment row's state. Cancelling marks it; nothing is deleted (ADR-0009). */
export type AppointmentStatus = 'BOOKED' | 'CANCELLED';

/** A one-off window on a specific date. Never overlaps or touches that date's weekly windows. */
export interface ExtraWindow {
  id: string;
  date: string;
  start: string;
  end: string;
}

/** `POST /schedule/extra-windows` body. Backend: `CreateExtraWindowDto implements CreateExtraWindowRequest`. */
export interface CreateExtraWindowRequest {
  date: string;
  start: string;
  end: string;
}

/** A date range, both ends inclusive. Backend: `ScheduleRangeQueryDto implements ScheduleRangeQuery`. */
export interface ScheduleRangeQuery {
  from: string;
  to: string;
  providerId?: string;
}

/** `GET /schedule/free-times` query. Backend: `FreeTimesQueryDto implements FreeTimesQuery`. */
export interface FreeTimesQuery extends ScheduleRangeQuery {
  meetingTypeId: string;
}

/** One open date and the times a meeting of the asked type can start on it. */
export interface DayFreeTimes {
  date: string;
  starts: string[];
}

/** `GET /schedule/opening` and `POST /schedule/opening` response. */
export interface OpeningResponse {
  /** Last open date; null until a period was opened. */
  openUntil: string | null;
  /** The Provider's opening limit, in weeks. */
  maxOpenWeeks: number;
  /** The furthest date that may be opened today: today + maxOpenWeeks weeks. */
  latestUntil: string;
  /**
   * What the opening dialog proposes: one month past "open until" (or today), within the limit.
   * Null when the limit is reached, so nothing more can be opened today.
   */
  suggestedUntil: string | null;
}

/** `POST /schedule/opening` and `/schedule/opening/preview` body. Backend: `OpenPeriodDto implements OpenPeriodRequest`. */
export interface OpenPeriodRequest {
  until: string;
}

/** `POST /schedule/opening/preview` response: what opening `until` would do. */
export interface OpeningPreviewResponse {
  /** First date that becomes open. */
  from: string;
  until: string;
  /** Dates in the new range that have working hours. */
  workingDays: number;
}

/** A booked appointment as the Provider's schedule shows it. */
export interface ScheduleAppointment {
  id: string;
  date: string;
  start: string;
  end: string;
  client: { id: string; name: string };
  meetingType: { id: string; name: string };
}

/** A stretch of working time on a date; `extra` for a one-off extra window. */
export interface ScheduleWindow {
  start: string;
  end: string;
  extra: boolean;
  /** Set on extra windows only, so the calendar can delete them. */
  extraWindowId?: string;
}

/** `GET /schedule/days`: one date of the Provider's weekly view. */
export interface ScheduleDay {
  date: string;
  /** Clients can book this date (from today up to "open until"). */
  open: boolean;
  windows: ScheduleWindow[];
  appointments: ScheduleAppointment[];
}
