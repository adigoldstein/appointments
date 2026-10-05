import { Route } from '@angular/router';
import { ClientOverviewPageComponent } from './pages/client-overview.page';

export const featureClientRoutes: Route[] = [
  {
    path: '',
    component: ClientOverviewPageComponent,
  },
];
