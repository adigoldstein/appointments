import { Route } from '@angular/router';
import { onboardingGuard } from './guards/onboarding.guard';
import { CustomerOverviewPageComponent } from './pages/customer-overview.page';
import { ProviderSettingsPageComponent } from './pages/provider-settings.page';

export const featureCustomerRoutes: Route[] = [
  {
    path: 'settings',
    component: ProviderSettingsPageComponent,
  },
  {
    path: '',
    canActivate: [onboardingGuard],
    children: [
      {
        path: '',
        component: CustomerOverviewPageComponent,
      },
      // Future onboarding-gated routes (e.g. slot management) go here —
      // onboardingGuard covers them automatically, no per-route canActivate needed.
    ],
  },
];
