import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_BASE_URL } from '@app/shared/api';
import { RefreshTokenRequest } from '@app/shared/types';
import { SessionStore } from './session.store';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly sessionStore = inject(SessionStore);

  /** Best-effort server-side revoke; the local session always clears, even if the request fails. */
  logout(): Observable<void> {
    const refreshToken = this.sessionStore.refreshToken();

    if (!refreshToken) {
      this.sessionStore.clear();
      return of(void 0);
    }

    return this.http.post(`${this.apiBaseUrl}/auth/logout`, { refreshToken } satisfies RefreshTokenRequest).pipe(
      catchError(() => of(null)),
      map(() => void 0),
      tap(() => this.sessionStore.clear()),
    );
  }
}
