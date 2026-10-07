/** `GET / POST / PUT /provider-settings` response. Dates are ISO strings (as sent over JSON). */
export interface ProviderSettingsResponse {
  providerId: string;
  businessName: string;
  clientLabel: string;
  cancellationWindowMinutes: number;
  allowedDurationsMinutes: number[];
  createdAt: string;
  updatedAt: string;
}

/** `POST / PUT /provider-settings` body. Backend: `CreateProviderSettingsDto implements ProviderSettingsRequest`. */
export interface ProviderSettingsRequest {
  businessName: string;
  clientLabel: string;
  cancellationWindowMinutes: number;
  allowedDurationsMinutes: number[];
}

/** Query of the provider-settings endpoints: required for an Admin acting for a Provider, omitted otherwise. */
export interface ProviderTargetQuery {
  providerId?: string;
}
