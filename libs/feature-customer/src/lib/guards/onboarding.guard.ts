import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStorageService } from '@app/shared/auth';

/** Assumes the parent route already enforced an authenticated PROVIDER session. */
export const onboardingGuard: CanActivateFn = () => {
  const authStorage = inject(AuthStorageService);
  const router = inject(Router);

  const hasCompletedOnboarding = authStorage.session()?.user.hasCompletedOnboarding;

  return hasCompletedOnboarding ? true : router.createUrlTree(['/customer/settings']);
};
