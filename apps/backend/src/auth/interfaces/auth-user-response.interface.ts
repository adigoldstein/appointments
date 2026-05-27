import { Role } from '@app/shared/types';

export interface AuthUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  /** Set when role is CLIENT and the user was created under a provider */
  providerId: string | null;
}
