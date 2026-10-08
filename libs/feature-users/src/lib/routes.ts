import { Route } from '@angular/router';
import { AddUserPageComponent } from './add-user.page';
import { UsersListPageComponent } from './users-list.page';

/** Mounted by the app with route data `{ mode: 'client' | 'admin' }` (see AddUserMode). */
export const featureUsersRoutes: Route[] = [
  {
    path: '',
    component: AddUserPageComponent,
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
