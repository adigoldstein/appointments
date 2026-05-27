import { Role } from '@app/shared/types';

export interface AuthenticatedUserPayload {
  userId: string;
  role: Role;
}
