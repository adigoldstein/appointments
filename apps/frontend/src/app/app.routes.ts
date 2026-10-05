import { Route } from '@angular/router';
import { authGuard } from '@app/shared/auth';
import { Role } from '@app/shared/types';
import { ShellComponent } from './shell/shell.component';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth',
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('@app/feature-auth').then((m) => m.featureAuthRoutes),
  },
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: 'admin',
        canActivate: [authGuard],
        data: { role: Role.ADMIN },
        loadChildren: () =>
          import('@app/feature-admin').then((m) => m.featureAdminRoutes),
      },
      {
        path: 'provider',
        canActivate: [authGuard],
        data: { role: Role.PROVIDER },
        loadChildren: () =>
          import('@app/feature-provider').then((m) => m.featureProviderRoutes),
      },
      {
        path: 'client',
        canActivate: [authGuard],
        data: { role: Role.CLIENT },
        loadChildren: () =>
          import('@app/feature-client').then(
            (m) => m.featureClientRoutes,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'auth',
  },
];
