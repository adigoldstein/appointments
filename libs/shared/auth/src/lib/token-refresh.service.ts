import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, shareReplay, throwError } from 'rxjs';
import { API_BASE_URL } from '@app/shared/api';
import { RefreshResponse, RefreshTokenRequest } from '@app/shared/types';
import { SessionStore } from './session.store';

@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly sessionStore = inject(SessionStore);

  private refreshInFlight$: Observable<string> | null = null;

  /** De-dupes concurrent refresh attempts: callers arriving while one is in flight share its result. */
  refreshAccessToken(): Observable<string> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const refreshToken = this.sessionStore.refreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    this.refreshInFlight$ = this.http
      .post<RefreshResponse>(`${this.apiBaseUrl}/auth/refresh`, { refreshToken } satisfies RefreshTokenRequest)
      .pipe(
        map((response) => {
          this.sessionStore.updateAccessToken(response.accessToken, response.user);
          return response.accessToken;
        }),
        catchError((error: unknown) => {
          this.sessionStore.clear();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay(1),
      );

    return this.refreshInFlight$;
  }
}
