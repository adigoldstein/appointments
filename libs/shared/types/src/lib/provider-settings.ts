/**
 * `GET / POST / PUT /provider-settings` response: the business details set at onboarding.
 * Appointment settings (cancellation window, time unit, meeting types, hours) are `/schedule/settings`.
 * Dates are ISO strings (as sent over JSON).
 */
export interface ProviderSettingsResponse {
  providerId: string;
  businessName: string;
  clientLabel: string;
  createdAt: string;
  updatedAt: string;
}

/** `POST / PUT /provider-settings` body. Backend: `CreateProviderSettingsDto implements ProviderSettingsRequest`. */
export interface ProviderSettingsRequest {
  businessName: string;
  clientLabel: string;
}

/** Query of the provider-settings endpoints: required for an Admin acting for a Provider, omitted otherwise. */
export interface ProviderTargetQuery {
  providerId?: string;
}
