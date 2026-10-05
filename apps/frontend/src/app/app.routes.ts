import { Route } from '@angular/router';
import { authGuard } from '@app/shared/auth';
import { Role } from '@app/shared/types';
import { ShellComponent } from './shell/shell.component';

// Each area is mounted wherever it can be reached from (ADR-0005). Acting always happens
// inside the actor's own top-level area, so the exact-role authGuard on each one stays correct.
const providerArea = () =>
  import('@app/feature-provider').then((m) => m.featureProviderRoutes);
const clientArea = () =>
  import('@app/feature-client').then((m) => m.featureClientRoutes);

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
        children: [
          {
            path: 'providers/:providerId',
            children: [
              { path: 'clients/:clientId', loadChildren: clientArea },
              { path: '', loadChildren: providerArea },
            ],
          },
          {
            path: '',
            loadChildren: () =>
              import('@app/feature-admin').then((m) => m.featureAdminRoutes),
          },
        ],
      },
      {
        path: 'provider',
        canActivate: [authGuard],
        data: { role: Role.PROVIDER },
        children: [
          { path: 'clients/:clientId', loadChildren: clientArea },
          { path: '', loadChildren: providerArea },
        ],
      },
      {
        path: 'client',
        canActivate: [authGuard],
        data: { role: Role.CLIENT },
        loadChildren: clientArea,
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'auth',
  },
];
