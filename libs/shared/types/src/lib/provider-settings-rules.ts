/**
 * Business details limits, shared by the backend DTO and the onboarding form so they can't drift
 * apart (ADR-0008). Appointment settings limits are in `schedule-settings-rules.ts`.
 */
export const BUSINESS_NAME_MIN_LENGTH = 2;
export const BUSINESS_NAME_MAX_LENGTH = 150;

export const CLIENT_LABEL_MIN_LENGTH = 2;
export const CLIENT_LABEL_MAX_LENGTH = 50;
