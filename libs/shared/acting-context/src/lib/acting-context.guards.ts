import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ActingContextStore } from './acting-context.store';

/** Provider pages need a Provider: an Admin without a selection goes back to the Admin home. */
export const requireProviderGuard: CanActivateFn = () => {
  const actingContext = inject(ActingContextStore);
  return actingContext.providerId() ? true : inject(Router).createUrlTree(['/admin']);
};

/** Client pages need a Client: without a selection, go back to the Provider pages. */
export const requireClientGuard: CanActivateFn = () => {
  const actingContext = inject(ActingContextStore);
  return actingContext.clientId()
    ? true
    : inject(Router).createUrlTree([actingContext.providerBaseUrl() ?? '/']);
};
