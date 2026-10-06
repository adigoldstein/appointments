import { Route } from '@angular/router';
import { AddUserPageComponent } from './add-user.page';

/** Mounted by the app with route data `{ mode: 'client' | 'admin' }` (see AddUserMode). */
export const featureUsersRoutes: Route[] = [
  {
    path: '',
    component: AddUserPageComponent,
  },
];
