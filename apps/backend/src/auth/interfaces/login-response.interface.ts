import { AuthUserResponse } from './auth-user-response.interface';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
}
