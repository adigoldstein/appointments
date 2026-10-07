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

/** The Clients list of the Provider on screen (docs/plans/client-list.md). */
export const featureUsersListRoutes: Route[] = [
  {
    path: '',
    component: UsersListPageComponent,
  },
];
