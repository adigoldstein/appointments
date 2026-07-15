import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '@app/shared/api';

export interface CreateProviderSettingsPayload {
  businessName: string;
  clientLabel: string;
  cancellationWindowMinutes: number;
  allowedDurationsMinutes: number[];
}

export interface ProviderSettingsResponse {
  providerId: string;
  businessName: string;
  clientLabel: string;
  cancellationWindowMinutes: number;
  allowedDurationsMinutes: number[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ProviderSettingsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  create(payload: CreateProviderSettingsPayload) {
    return this.http.post<ProviderSettingsResponse>(`${this.apiBaseUrl}/provider-settings`, payload);
  }

  update(payload: CreateProviderSettingsPayload) {
    return this.http.put<ProviderSettingsResponse>(`${this.apiBaseUrl}/provider-settings`, payload);
  }

  getOwn() {
    return this.http.get<ProviderSettingsResponse>(`${this.apiBaseUrl}/provider-settings`);
  }
}
