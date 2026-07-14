import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '@app/shared/api';

export interface CreateProviderSettingsPayload {
  businessName: string;
  clientLabel: string;
  cancellationWindowMinutes: number;
  allowedDurationsMinutes: number[];
}

@Injectable({ providedIn: 'root' })
export class ProviderSettingsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  create(payload: CreateProviderSettingsPayload) {
    return this.http.post<void>(`${this.apiBaseUrl}/provider-settings`, payload);
  }
}
