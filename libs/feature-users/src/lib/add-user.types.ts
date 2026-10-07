import type { Role } from '@app/shared/types';

/** `client`: the role is fixed to Client. `admin`: the Admin chooses Provider or Client. */
export type AddUserMode = 'client' | 'admin';

export type NewUserRole = Role.PROVIDER | Role.CLIENT;
