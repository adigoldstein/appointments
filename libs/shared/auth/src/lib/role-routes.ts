import { Role } from '@app/shared/types';

export const ROLE_HOME_ROUTE: Readonly<Record<Role, string>> = {
  [Role.ADMIN]: '/admin',
  [Role.PROVIDER]: '/customer',
  [Role.CLIENT]: '/client-portal',
};

export function homeRouteForRole(role: Role): string {
  return ROLE_HOME_ROUTE[role];
}
