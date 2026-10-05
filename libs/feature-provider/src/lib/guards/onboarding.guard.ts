import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { actingParamsFromSnapshot, providerAreaBaseUrl } from '@app/shared/acting-context';
import { AuthStorageService } from '@app/shared/auth';
import { UsersApiService } from '@app/shared/users';
import { OnboardingSkipService } from '../onboarding-skip.service';

/**
 * Sends the Provider area to the settings form until onboarding is done.
 * A Provider is checked from their session; an Admin acting for a Provider is checked
 * against that Provider, and may have skipped it for this tab (ADR-0004).
 */
export const onboardingGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const { providerId: routeProviderId } = actingParamsFromSnapshot(route);
  const settingsUrl = router.createUrlTree([providerAreaBaseUrl(routeProviderId), 'settings']);

  if (!routeProviderId) {
    const hasCompletedOnboarding = inject(AuthStorageService).session()?.user.hasCompletedOnboarding;
    return hasCompletedOnboarding ? true : settingsUrl;
  }

  if (inject(OnboardingSkipService).isSkipped(routeProviderId)) {
    return true;
  }

  return inject(UsersApiService)
    .get(routeProviderId)
    .pipe(
      map((provider) => (provider.hasCompletedOnboarding ? true : settingsUrl)),
      catchError(() => of(router.createUrlTree(['/admin']))),
    );
};
