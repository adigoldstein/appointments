import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '@app/shared/api';
import { AuthSession } from '@app/shared/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  login(credentials: { email: string; password: string }) {
    return this.http.post<AuthSession>(`${this.apiBaseUrl}/auth/login`, credentials);
  }
}