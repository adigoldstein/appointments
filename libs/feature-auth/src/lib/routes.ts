import { Route } from '@angular/router';
import { AuthOverviewPageComponent } from './pages/auth-overview.page';

export const featureAuthRoutes: Route[] = [
  {
    path: '',
    component: AuthOverviewPageComponent,
  },
];
