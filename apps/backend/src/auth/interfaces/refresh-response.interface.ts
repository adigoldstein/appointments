import type { AuthUser } from '@app/shared/types';

/** Same user shape as login, so clients can refresh profile fields (`phone`, `city`, etc.) without an extra call. */
export interface RefreshResponse {
  accessToken: string;
  user: AuthUser;
}
