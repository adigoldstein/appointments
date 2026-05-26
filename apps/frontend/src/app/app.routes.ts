import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth',
  },
  {
    path: 'auth',
    loadChildren: () => import('@app/feature-auth').then((m) => m.featureAuthRoutes),
  },
  {
    path: 'admin',
    loadChildren: () => import('@app/feature-admin').then((m) => m.featureAdminRoutes),
  },
  {
    path: 'customer',
    loadChildren: () => import('@app/feature-customer').then((m) => m.featureCustomerRoutes),
  },
  {
    path: 'client-portal',
    loadChildren: () =>
      import('@app/feature-client-portal').then((m) => m.featureClientPortalRoutes),
  },
  {
    path: '**',
    redirectTo: 'auth',
  },
];
