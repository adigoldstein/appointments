import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { API_BASE_URL } from '@app/shared/api';
import { AuthUser, PaginatedUsersResponse, Role, UserStatusFilter } from '@app/shared/types';

export interface ListUsersParams {
  page?: number;
  limit?: number;
  /** Admin only; the backend defaults to CLIENT. */
  role?: Role.PROVIDER | Role.CLIENT;
  /** Admin only; restricts a CLIENT listing to one Provider. */
  providerId?: string;
  search?: string;
  /** Omitted = all users. */
  status?: UserStatusFilter;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  /** Admin only, when creating a CLIENT; a Provider's clients are always linked to themselves. */
  providerId?: string;
  phone?: string;
  cityId?: number;
}

/** Body of the 409 returned by create-user when the email belongs to an account the actor may reactivate. */
export interface ReactivatableConflict {
  reactivatable: true;
  existingUserId: string;
  message: string;
}

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

  list(params: ListUsersParams = {}): Observable<PaginatedUsersResponse> {
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

  create(payload: CreateUserPayload): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${this.apiBaseUrl}/auth/create-user`, payload)
      .pipe(this.announceChange());
  }

  setDeactivated(userId: string, deactivate: boolean): Observable<AuthUser> {
    return this.http
      .patch<AuthUser>(`${this.apiBaseUrl}/auth/users/${userId}`, { deactivate })
      .pipe(this.announceChange());
  }

  private announceChange<T>() {
    return tap<T>(() => this.usersChanged.next());
  }
}
