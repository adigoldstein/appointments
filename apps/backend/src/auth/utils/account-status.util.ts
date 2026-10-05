import { Role } from '@app/shared/types';
import { User } from '../entities/user.entity';

/**
 * Whether the account may log in / use its tokens.
 * A Client is also blocked while their owning Provider is deactivated — derived at
 * check time, never written onto the Client row, so reactivating the Provider restores
 * exactly the Clients who weren't individually deactivated.
 *
 * Requires the `provider` relation to be loaded for Clients.
 */
export function isAccountActive(user: User): boolean {
  if (user.deactivatedAt) {
    return false;
  }

  if (user.role === Role.CLIENT && user.provider?.deactivatedAt) {
    return false;
  }

  return true;
}
