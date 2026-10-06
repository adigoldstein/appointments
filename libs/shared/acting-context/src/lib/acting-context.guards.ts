import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ActingContextService } from './acting-context.service';

/** Provider pages need a Provider: an Admin without a selection goes back to the Admin home. */
export const requireProviderGuard: CanActivateFn = () => {
  const actingContext = inject(ActingContextService);
  return actingContext.providerId() ? true : inject(Router).createUrlTree(['/admin']);
};

/** Client pages need a Client: without a selection, go back to the Provider pages. */
export const requireClientGuard: CanActivateFn = () => {
  const actingContext = inject(ActingContextService);
  return actingContext.clientId()
    ? true
    : inject(Router).createUrlTree([actingContext.providerBaseUrl() ?? '/']);
};
