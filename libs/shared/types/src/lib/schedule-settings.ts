/** A Provider's scheduling grid (ADR-0009): meeting lengths are multiples of it, starts are on it. */
export type TimeUnitMinutes = 30 | 60;

/** A kind of meeting a Provider offers. Archived types are never returned. */
export interface MeetingType {
  id: string;
  name: string;
  lengthMinutes: number;
  /** Added to every new Client's bookable types (and to existing Clients when the type is created). */
  defaultForClients: boolean;
}

/**
 * One stretch of a weekly working day. Several per day; a break is the gap between two.
 * `weekday`: 0 = Sunday … 6 = Saturday. Times are `HH:MM`, Israel time.
 */
export interface WeeklyWindow {
  weekday: number;
  start: string;
  end: string;
}

/** `GET /schedule/settings` response: everything the appointment settings screen shows. */
export interface ScheduleSettingsResponse {
  timeUnitMinutes: TimeUnitMinutes;
  cancellationWindowMinutes: number;
  /** The opening limit: how many weeks ahead the calendar may be opened. */
  maxOpenWeeks: number;
  /** Last open date (`YYYY-MM-DD`); null until a period was opened. */
  openUntil: string | null;
  /** Active types, shortest first. */
  meetingTypes: MeetingType[];
  /** By weekday, then start. */
  weeklyWindows: WeeklyWindow[];
}

/** `PUT /schedule/settings` body. Backend: `UpdateScheduleSettingsDto implements UpdateScheduleSettingsRequest`. */
export interface UpdateScheduleSettingsRequest {
  timeUnitMinutes: TimeUnitMinutes;
  cancellationWindowMinutes: number;
  /** Optional: left unchanged when omitted. */
  maxOpenWeeks?: number;
}

/** `POST /schedule/meeting-types` body. Backend: `CreateMeetingTypeDto implements CreateMeetingTypeRequest`. */
export interface CreateMeetingTypeRequest {
  name: string;
  lengthMinutes: number;
  defaultForClients: boolean;
}

/** `PATCH /schedule/meeting-types/:id` body; at least one field. Backend: `UpdateMeetingTypeDto implements UpdateMeetingTypeRequest`. */
export interface UpdateMeetingTypeRequest {
  name?: string;
  lengthMinutes?: number;
  defaultForClients?: boolean;
}

/** `PUT /schedule/weekly-windows` body: replaces the whole week. Backend: `ReplaceWeeklyWindowsDto implements ReplaceWeeklyWindowsRequest`. */
export interface ReplaceWeeklyWindowsRequest {
  windows: WeeklyWindow[];
}
