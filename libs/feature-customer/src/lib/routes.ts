import { Route } from '@angular/router';
import { CustomerOverviewPageComponent } from './pages/customer-overview.page';

export const featureCustomerRoutes: Route[] = [
  {
    path: '',
    component: CustomerOverviewPageComponent,
  },
];
