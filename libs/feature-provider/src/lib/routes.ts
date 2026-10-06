import { Route } from '@angular/router';
import { onboardingGuard } from './guards/onboarding.guard';
import { ProviderOverviewPageComponent } from './pages/provider-overview.page';
import { ProviderSettingsPageComponent } from './pages/provider-settings.page';

export const featureProviderRoutes: Route[] = [
  {
    path: 'settings',
    component: ProviderSettingsPageComponent,
  },
  {
    path: '',
    canActivate: [onboardingGuard],
    // Re-check on every navigation, including the same-URL reload an Admin's Provider switch triggers.
    runGuardsAndResolvers: 'always',
    children: [
      {
        path: '',
        component: ProviderOverviewPageComponent,
      },
      // Future onboarding-gated routes (e.g. slot management) go here —
      // onboardingGuard covers them automatically, no per-route canActivate needed.
    ],
  },
];
