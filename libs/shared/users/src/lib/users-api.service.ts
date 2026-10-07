import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { API_BASE_URL } from '@app/shared/api';
import {
  AuthUser,
  CreateUserRequest,
  ListUsersQuery,
  PaginatedUsersResponse,
  UpdateUserRequest,
} from '@app/shared/types';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly usersChanged = new Subject<void>();

  /**
   * Emits after every successful change to users made through this service, so lists showing
   * users can refresh (e.g. `debouncedSearch(…, { refresh: usersApi.usersChanged$ })`).
   * Every new mutating method must pipe through `announceChange()`.
   */
  readonly usersChanged$ = this.usersChanged.asObservable();

  list(params: ListUsersQuery = {}): Observable<PaginatedUsersResponse> {
    let httpParams = new HttpParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return this.http.get<PaginatedUsersResponse>(`${this.apiBaseUrl}/auth/users`, {
      params: httpParams,
    });
  }

  get(userId: string): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.apiBaseUrl}/auth/users/${userId}`);
  }

  create(payload: CreateUserRequest): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${this.apiBaseUrl}/auth/create-user`, payload)
      .pipe(this.announceChange());
  }

  setDeactivated(userId: string, deactivate: boolean): Observable<AuthUser> {
    return this.http
      .patch<AuthUser>(`${this.apiBaseUrl}/auth/users/${userId}`, { deactivate } satisfies UpdateUserRequest)
      .pipe(this.announceChange());
  }

  private announceChange<T>() {
    return tap<T>(() => this.usersChanged.next());
  }
}
