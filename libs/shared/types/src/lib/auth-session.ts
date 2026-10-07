import { IsraelLocality } from './israel-locality';
import { Role } from './user-role';

/** User shape returned by the auth API; shared between frontend and backend. */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  /** Set when role is CLIENT and the user was created under a provider */
  providerId: string | null;
  phone: string | null;
  /** Resolved from `cityId` using `israel-localities.json`; null if unset or unknown id */
  city: IsraelLocality | null;
  /** Whether a ProviderSettings row exists for this user; only meaningful when role is PROVIDER, always false otherwise */
  hasCompletedOnboarding: boolean;
}

/** `POST /auth/login` body. Backend: `LoginDto implements LoginRequest`. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** `POST /auth/refresh` and `POST /auth/logout` body. Backend: `RefreshTokenDto implements RefreshTokenRequest`. */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** `POST /auth/login` response. */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** `POST /auth/refresh` response: same user shape as login, so profile fields stay current without an extra call. */
export interface RefreshResponse {
  accessToken: string;
  user: AuthUser;
}

/** `POST /auth/logout` response. */
export interface LogoutResponse {
  message: string;
}

/** What the frontend keeps for the logged-in user: exactly the login response. */
export type AuthSession = LoginResponse;
