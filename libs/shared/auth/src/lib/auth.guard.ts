import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '@app/shared/types';
import { SessionStore } from './session.store';
import { homeRouteForRole } from './role-routes';

export const authGuard: CanActivateFn = (route) => {
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  const session = sessionStore.session();

  if (!session) {
    return router.createUrlTree(['/auth']);
  }

  const requiredRole = route.data['role'] as Role | undefined;

  if (requiredRole && session.user.role !== requiredRole) {
    return router.createUrlTree([homeRouteForRole(session.user.role)]);
  }

  return true;
};
