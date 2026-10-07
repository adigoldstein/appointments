/**
 * Provider settings limits, shared by the backend DTO and the settings form so they can't drift
 * apart (ADR-0008). Durations and the cancellation window are in minutes.
 */
export const BUSINESS_NAME_MIN_LENGTH = 2;
export const BUSINESS_NAME_MAX_LENGTH = 150;

export const CLIENT_LABEL_MIN_LENGTH = 2;
export const CLIENT_LABEL_MAX_LENGTH = 50;

/** 7 days. */
export const CANCELLATION_WINDOW_MAX_MINUTES = 10_080;

export const APPOINTMENT_DURATION_MIN_MINUTES = 5;
/** 8 hours. */
export const APPOINTMENT_DURATION_MAX_MINUTES = 480;
export const ALLOWED_DURATIONS_MAX_COUNT = 12;
