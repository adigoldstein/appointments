import type { AuthUser } from '@app/shared/types';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
