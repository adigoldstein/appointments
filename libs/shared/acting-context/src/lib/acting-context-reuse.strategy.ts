import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';
import { actingParamsFromSnapshot } from './acting-context.service';

/**
 * Angular reuses a page when only a route param changes, which would leave a page showing the
 * previous Provider/Client after switching in the context bar. Recreating the subtree whenever the
 * acting target changes lets every page simply read the context once on creation (ADR-0005).
 */
@Injectable()
export class ActingContextReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    current: ActivatedRouteSnapshot,
  ): boolean {
    if (!super.shouldReuseRoute(future, current)) {
      return false;
    }

    const futureParams = actingParamsFromSnapshot(future);
    const currentParams = actingParamsFromSnapshot(current);

    return (
      futureParams.providerId === currentParams.providerId &&
      futureParams.clientId === currentParams.clientId
    );
  }
}
