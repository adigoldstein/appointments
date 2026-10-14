import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { API_BASE_URL } from '@app/shared/api';
import {
  CreateMeetingTypeRequest,
  MeetingType,
  OpeningResponse,
  ReplaceWeeklyWindowsRequest,
  ScheduleDay,
  ScheduleSettingsResponse,
  UpdateMeetingTypeRequest,
  UpdateScheduleSettingsRequest,
} from '@app/shared/types';

/**
 * `/schedule/*` (ADR-0009). Every call takes the Provider it works on: `null` for a Provider's own
 * schedule, the selected Provider's id when an Admin acts for them (`providerIdForRequest()`).
 */
@Injectable({ providedIn: 'root' })
export class ScheduleApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly scheduleChanged = new Subject<void>();

  /**
   * Emits after every successful change made through this service, so cached schedule data can
   * be dropped. Every new mutating method must pipe through `announceChange()`.
   */
  readonly scheduleChanged$ = this.scheduleChanged.asObservable();

  getSettings(providerId: string | null): Observable<ScheduleSettingsResponse> {
    return this.http.get<ScheduleSettingsResponse>(this.url('settings'), {
      params: targetParams(providerId),
    });
  }

  updateSettings(
    payload: UpdateScheduleSettingsRequest,
    providerId: string | null,
  ): Observable<ScheduleSettingsResponse> {
    return this.http
      .put<ScheduleSettingsResponse>(this.url('settings'), payload, {
        params: targetParams(providerId),
      })
      .pipe(this.announceChange());
  }

  createMeetingType(
    payload: CreateMeetingTypeRequest,
    providerId: string | null,
  ): Observable<MeetingType> {
    return this.http
      .post<MeetingType>(this.url('meeting-types'), payload, { params: targetParams(providerId) })
      .pipe(this.announceChange());
  }

  updateMeetingType(
    meetingTypeId: string,
    changes: UpdateMeetingTypeRequest,
    providerId: string | null,
  ): Observable<MeetingType> {
    return this.http
      .patch<MeetingType>(this.url(`meeting-types/${meetingTypeId}`), changes, {
        params: targetParams(providerId),
      })
      .pipe(this.announceChange());
  }

  deleteMeetingType(meetingTypeId: string, providerId: string | null): Observable<void> {
    return this.http
      .delete<void>(this.url(`meeting-types/${meetingTypeId}`), {
        params: targetParams(providerId),
      })
      .pipe(this.announceChange());
  }

  replaceWeeklyWindows(
    payload: ReplaceWeeklyWindowsRequest,
    providerId: string | null,
  ): Observable<ScheduleSettingsResponse> {
    return this.http
      .put<ScheduleSettingsResponse>(this.url('weekly-windows'), payload, {
        params: targetParams(providerId),
      })
      .pipe(this.announceChange());
  }

  /** The Provider's days (weekly view): windows, booked appointments, open or not. Both dates included. */
  getDays(from: string, to: string, providerId: string | null): Observable<ScheduleDay[]> {
    return this.http.get<ScheduleDay[]>(this.url('days'), {
      params: targetParams(providerId).set('from', from).set('to', to),
    });
  }

  getOpening(providerId: string | null): Observable<OpeningResponse> {
    return this.http.get<OpeningResponse>(this.url('opening'), { params: targetParams(providerId) });
  }

  private url(path: string): string {
    return `${this.apiBaseUrl}/schedule/${path}`;
  }

  private announceChange<T>() {
    return tap<T>(() => this.scheduleChanged.next());
  }
}

function targetParams(providerId: string | null): HttpParams {
  return providerId ? new HttpParams().set('providerId', providerId) : new HttpParams();
}
