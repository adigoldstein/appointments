import { Injectable, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRouteSnapshot,
  NavigationCancel,
  NavigationError,
  ResolveEnd,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { catchError, filter, map, of, switchMap } from 'rxjs';
import { AuthStorageService } from '@app/shared/auth';
import { AuthUser, Role } from '@app/shared/types';
import { UsersApiService } from '@app/shared/users';

export interface ActingRouteParams {
  /** Set only when an Admin is acting for a Provider (`/admin/providers/:providerId/...`). */
  providerId: string | null;
  /** Set only when acting for a Client (`.../clients/:clientId/...`). */
  clientId: string | null;
}

/** Collects the acting ids from a route and all of its ancestors. Usable from guards, which run before the URL changes. */
export function actingParamsFromSnapshot(route: ActivatedRouteSnapshot): ActingRouteParams {
  let providerId: string | null = null;
  let clientId: string | null = null;

  for (const snapshot of route.pathFromRoot) {
    providerId = snapshot.paramMap.get('providerId') ?? providerId;
    clientId = snapshot.paramMap.get('clientId') ?? clientId;
  }

  return { providerId, clientId };
}

/** Base URL of the Provider area: the Admin's acting URL when a Provider id is in the route, otherwise the Provider's own. */
export function providerAreaBaseUrl(routeProviderId: string | null): string {
  return routeProviderId ? `/admin/providers/${routeProviderId}` : '/provider';
}

/**
 * Acting on behalf (ADR-0004, ADR-0005): which Provider/Client the current page operates on.
 * The URL is the only source of the acting target; without one, the logged-in user is the target.
 */
@Injectable({ providedIn: 'root' })
export class ActingContextService {
  private readonly router = inject(Router);
  private readonly authStorage = inject(AuthStorageService);
  private readonly usersApi = inject(UsersApiService);

  // Updated at ResolveEnd — after guards, but before the new page is created — so pages read
  // the new target from their constructor/ngOnInit. A cancelled navigation reverts to the current URL.
  private readonly routeParams = toSignal(
    this.router.events.pipe(
      filter(
        (event) =>
          event instanceof ResolveEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError,
      ),
      map((event) =>
        this.readRouteParams(
          event instanceof ResolveEnd ? event.state : this.router.routerState.snapshot,
        ),
      ),
    ),
    { initialValue: this.readRouteParams(this.router.routerState.snapshot) },
  );

  /** The logged-in user — always the real actor, never the target. */
  readonly actor = computed(() => this.authStorage.session()?.user ?? null);

  /** Provider id from the URL; this is what Admin requests send as `?providerId=`. */
  readonly routeProviderId = computed(() => this.routeParams().providerId);
  readonly routeClientId = computed(() => this.routeParams().clientId);

  readonly isActing = computed(
    () => this.routeProviderId() !== null || this.routeClientId() !== null,
  );

  /** The Provider whose data is shown: the acting target, or the actor's own Provider identity. */
  readonly providerId = computed(() => {
    const actor = this.actor();

    if (this.routeProviderId()) {
      return this.routeProviderId();
    }

    if (actor?.role === Role.PROVIDER) {
      return actor.id;
    }

    return actor?.role === Role.CLIENT ? actor.providerId : null;
  });

  /** The Client whose data is shown, if any. */
  readonly clientId = computed(() => {
    const actor = this.actor();
    return this.routeClientId() ?? (actor?.role === Role.CLIENT ? actor.id : null);
  });

  /** Which area's pages are on screen — drives the nav. */
  readonly area = computed<Role | null>(() => {
    const role = this.actor()?.role;

    if (!role) {
      return null;
    }

    if (role === Role.CLIENT || this.routeClientId()) {
      return Role.CLIENT;
    }

    if (role === Role.PROVIDER || this.routeProviderId()) {
      return Role.PROVIDER;
    }

    return Role.ADMIN;
  });

  readonly providerBaseUrl = computed(() => {
    const role = this.actor()?.role;

    if (role === Role.PROVIDER) {
      return '/provider';
    }

    if (role === Role.ADMIN && this.routeProviderId()) {
      return providerAreaBaseUrl(this.routeProviderId());
    }

    return null;
  });

  readonly clientBaseUrl = computed(() => {
    if (this.actor()?.role === Role.CLIENT) {
      return '/client';
    }

    const providerBaseUrl = this.providerBaseUrl();
    const clientId = this.routeClientId();

    return providerBaseUrl && clientId ? `${providerBaseUrl}/clients/${clientId}` : null;
  });

  /** Base URL of the area on screen; nav items are relative to it. */
  readonly areaBaseUrl = computed(() => {
    switch (this.area()) {
      case Role.ADMIN:
        return '/admin';
      case Role.PROVIDER:
        return this.providerBaseUrl();
      case Role.CLIENT:
        return this.clientBaseUrl();
      default:
        return null;
    }
  });

  /** The Provider an Admin is acting for (name, onboarding status); null when not acting. */
  readonly actingProvider = this.loadUser(this.routeProviderId);

  /** The Client being acted for; null when not acting. */
  readonly actingClient = this.loadUser(this.routeClientId);

  private loadUser(userId: () => string | null) {
    return toSignal(
      toObservable(computed(userId)).pipe(
        switchMap((id) =>
          id ? this.usersApi.get(id).pipe(catchError(() => of(null))) : of(null),
        ),
      ),
      { initialValue: null as AuthUser | null },
    );
  }

  private readRouteParams(state: RouterStateSnapshot): ActingRouteParams {
    let snapshot: ActivatedRouteSnapshot | null = state.root;

    while (snapshot?.firstChild) {
      snapshot = snapshot.firstChild;
    }

    return snapshot
      ? actingParamsFromSnapshot(snapshot)
      : { providerId: null, clientId: null };
  }
}
