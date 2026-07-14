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

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
