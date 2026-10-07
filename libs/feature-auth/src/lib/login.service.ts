import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '@app/shared/api';
import { LoginRequest, LoginResponse } from '@app/shared/types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  login(credentials: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, credentials);
  }
}