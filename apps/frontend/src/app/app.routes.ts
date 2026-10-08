import { Route } from '@angular/router';
import { ShellComponent } from '@app/feature-shell';
import { requireClientGuard, requireProviderGuard } from '@app/shared/acting-context';
import { authGuard } from '@app/shared/auth';
import { Role } from '@app/shared/types';

// Each area is mounted wherever it can be reached from (ADR-0005). The target Provider/Client is
// state (the context bar), not part of the URL. Acting always happens inside the actor's own
// top-level area, so the exact-role authGuard on each one stays correct.
const providerArea = () =>
  import('@app/feature-provider').then((m) => m.featureProviderRoutes);
const clientArea = () =>
  import('@app/feature-client').then((m) => m.featureClientRoutes);
const userFormPage = () =>
  import('@app/feature-users').then((m) => m.featureUserFormRoutes);
const usersListPage = () =>
  import('@app/feature-users').then((m) => m.featureUsersListRoutes);

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
            path: 'users/new',
            data: { mode: 'admin' },
            loadChildren: userFormPage,
          },
          {
            path: 'providers/:userId/edit',
            data: { mode: 'edit-provider' },
            loadChildren: userFormPage,
          },
          {
            path: 'providers',
            data: { mode: 'providers' },
            loadChildren: usersListPage,
          },
          {
            path: 'provider/clients/new',
            canActivate: [requireProviderGuard],
            data: { mode: 'client' },
            loadChildren: userFormPage,
          },
          {
            path: 'provider/clients/:userId/edit',
            canActivate: [requireProviderGuard],
            data: { mode: 'edit-client' },
            loadChildren: userFormPage,
          },
          {
            path: 'provider/clients',
            canActivate: [requireProviderGuard],
            data: { mode: 'clients' },
            loadChildren: usersListPage,
          },
          {
            path: 'provider',
            canActivate: [requireProviderGuard],
            loadChildren: providerArea,
          },
          {
            path: 'client',
            canActivate: [requireProviderGuard, requireClientGuard],
            loadChildren: clientArea,
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
          {
            path: 'clients/new',
            data: { mode: 'client' },
            loadChildren: userFormPage,
          },
          {
            path: 'clients/:userId/edit',
            data: { mode: 'edit-client' },
            loadChildren: userFormPage,
          },
          { path: 'clients', data: { mode: 'clients' }, loadChildren: usersListPage },
          {
            path: 'client',
            canActivate: [requireClientGuard],
            loadChildren: clientArea,
          },
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
