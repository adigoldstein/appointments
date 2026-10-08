import type { Role } from '@app/shared/types';

/**
 * Create: `client` (the role is fixed to Client), `admin` (the Admin chooses Provider or Client).
 * Edit (route has `:userId`): `edit-client`, `edit-provider`.
 */
export type UserFormMode = 'client' | 'admin' | 'edit-client' | 'edit-provider';

export type NewUserRole = Role.PROVIDER | Role.CLIENT;

/** Edit mode, before the form can be shown. Create mode is always `ready`. */
export type UserFormLoadState = 'loading' | 'ready' | 'not-found' | 'error';
