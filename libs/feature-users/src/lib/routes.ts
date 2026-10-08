import { Route } from '@angular/router';
import { UserFormPageComponent } from './user-form.page';
import { UsersListPageComponent } from './users-list.page';

/**
 * Mounted by the app with route data `{ mode }` (see UserFormMode): `client` / `admin` to add,
 * `edit-client` / `edit-provider` under a `:userId/edit` path to edit.
 */
export const featureUserFormRoutes: Route[] = [
  {
    path: '',
    component: UserFormPageComponent,
  },
];

/**
 * The users list (docs/plans/client-list.md), mounted with route data
 * `{ mode: 'clients' | 'providers' }` (see UsersListMode).
 */
export const featureUsersListRoutes: Route[] = [
  {
    path: '',
    component: UsersListPageComponent,
  },
];
