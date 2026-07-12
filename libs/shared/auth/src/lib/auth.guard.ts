import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '@app/shared/types';
import { AuthStorageService } from './auth-storage.service';
import { homeRouteForRole } from './role-routes';

export const authGuard: CanActivateFn = (route) => {
  const authStorage = inject(AuthStorageService);
  const router = inject(Router);

  const session = authStorage.session();

  if (!session) {
    return router.createUrlTree(['/auth']);
  }

  const requiredRole = route.data['role'] as Role | undefined;

  if (requiredRole && session.user.role !== requiredRole) {
    return router.createUrlTree([homeRouteForRole(session.user.role)]);
  }

  return true;
};
