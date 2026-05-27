import { Role } from '@app/shared/types';

export interface JwtPayload {
  sub: string;
  role: Role;
}
