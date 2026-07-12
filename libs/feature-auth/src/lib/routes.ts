import { Route } from '@angular/router';
import { LoginPage } from './pages/login.page';

export const featureAuthRoutes: Route[] = [
  {
    path: '',
    component: LoginPage,
  },
];
