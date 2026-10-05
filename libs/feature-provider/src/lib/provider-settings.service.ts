import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  /** `providerId` is only sent when an Admin acts for a Provider; a Provider always targets themselves. */
  create(payload: CreateProviderSettingsPayload, providerId: string | null = null) {
    return this.http.post<ProviderSettingsResponse>(
      `${this.apiBaseUrl}/provider-settings`,
      payload,
      { params: this.targetParams(providerId) },
    );
  }

  update(payload: CreateProviderSettingsPayload, providerId: string | null = null) {
    return this.http.put<ProviderSettingsResponse>(
      `${this.apiBaseUrl}/provider-settings`,
      payload,
      { params: this.targetParams(providerId) },
    );
  }

  get(providerId: string | null = null) {
    return this.http.get<ProviderSettingsResponse>(
      `${this.apiBaseUrl}/provider-settings`,
      { params: this.targetParams(providerId) },
    );
  }

  private targetParams(providerId: string | null): HttpParams {
    return providerId ? new HttpParams().set('providerId', providerId) : new HttpParams();
  }
}
