import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ActingContextStore } from '@app/shared/acting-context';
import { SessionStore } from '@app/shared/auth';
import { UsersApiService } from '@app/shared/users';
import { OnboardingSkipService } from '../onboarding-skip.service';

/**
 * Sends the Provider pages to the settings form until onboarding is done.
 * A Provider is checked from their session; an Admin is checked against the selected Provider,
 * and may have skipped it for this tab (ADR-0004).
 */
export const onboardingGuard: CanActivateFn = () => {
  const router = inject(Router);
  const actingContext = inject(ActingContextStore);
  const settingsUrl = router.createUrlTree([actingContext.providerBaseUrl() ?? '/', 'settings']);
  const providerId = actingContext.providerIdForRequest();

  if (!providerId) {
    const hasCompletedOnboarding = inject(SessionStore).user()?.hasCompletedOnboarding;
    return hasCompletedOnboarding ? true : settingsUrl;
  }

  if (inject(OnboardingSkipService).isSkipped(providerId)) {
    return true;
  }

  return inject(UsersApiService)
    .get(providerId)
    .pipe(
      map((provider) => (provider.hasCompletedOnboarding ? true : settingsUrl)),
      catchError(() => of(router.createUrlTree(['/admin']))),
    );
};
