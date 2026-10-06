import { Signal, computed, effect, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { catchError, filter, map, of, switchMap } from 'rxjs';
import { SessionStore } from '@app/shared/auth';
import { AuthUser, Role } from '@app/shared/types';
import { UsersApiService } from '@app/shared/users';

/** What the context bar needs to show a selection without a request (also what survives a refresh). */
export interface ActingSelection {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

interface ActingContextState {
  /** Admin only: the Provider picked in the context bar. */
  selectedProvider: ActingSelection | null;
  /** Admin/Provider: the Client picked in the context bar. */
  selectedClient: ActingSelection | null;
}

interface StoredSelection extends ActingContextState {
  actorId: string;
}

const STORAGE_KEY = 'schedula.acting.selection';

function readStoredSelection(): StoredSelection | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSelection) : null;
  } catch {
    return null;
  }
}

function writeStoredSelection(value: StoredSelection | null): void {
  try {
    if (value) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable — the selection still works until reload.
  }
}

const pathOf = (url: string) => url.split(/[?#]/)[0];
const isUnder = (path: string, baseUrl: string | null) =>
  !!baseUrl && (path === baseUrl || path.startsWith(`${baseUrl}/`));

/**
 * Acting on behalf (ADR-0004, ADR-0005, ADR-0007): which Provider/Client the screen works on.
 * The selection is state, not URL — picking never navigates. It is kept per browser tab
 * (sessionStorage) so a refresh keeps it, and dropped when the actor changes or logs out.
 */
export const ActingContextStore = signalStore(
  { providedIn: 'root' },
  withState<ActingContextState>({ selectedProvider: null, selectedClient: null }),
  withProps(() => {
    const router = inject(Router);

    return {
      _router: router,
      _usersApi: inject(UsersApiService),
      _session: inject(SessionStore),
      _currentPath: toSignal(
        router.events.pipe(
          filter((event) => event instanceof NavigationEnd),
          map(() => pathOf(router.url)),
        ),
        { initialValue: pathOf(router.url) },
      ),
    };
  }),
  withComputed(({ selectedProvider, selectedClient, _session }) => {
    /** The logged-in user — always the real actor, never the target. */
    const actor = computed(() => _session.user());
    const role = computed(() => actor()?.role ?? null);

    return {
      actor,

      /** The Provider whose data is shown: the selection for an Admin, otherwise the actor's own Provider identity. */
      providerId: computed(() => {
        const user = actor();

        switch (user?.role) {
          case Role.ADMIN:
            return selectedProvider()?.id ?? null;
          case Role.PROVIDER:
            return user.id;
          case Role.CLIENT:
            return user.providerId;
          default:
            return null;
        }
      }),

      /** The Client whose data is shown: the selection, or the Client themselves. */
      clientId: computed(() => {
        const user = actor();
        return user?.role === Role.CLIENT ? user.id : (selectedClient()?.id ?? null);
      }),

      /**
       * The `providerId` to send to the API: only an Admin names the Provider; for everyone else the
       * backend derives it from the token, and sending it would be rejected.
       */
      providerIdForRequest: computed(() =>
        role() === Role.ADMIN ? (selectedProvider()?.id ?? null) : null,
      ),

      /** Where the Provider pages are mounted for this actor; null if they can't reach them. */
      providerBaseUrl: computed(() => {
        switch (role()) {
          case Role.ADMIN:
            return '/admin/provider';
          case Role.PROVIDER:
            return '/provider';
          default:
            return null;
        }
      }),

      /** Where the Client pages are mounted for this actor. */
      clientBaseUrl: computed(() => {
        switch (role()) {
          case Role.ADMIN:
            return '/admin/client';
          case Role.PROVIDER:
            return '/provider/client';
          case Role.CLIENT:
            return '/client';
          default:
            return null;
        }
      }),
    };
  }),
  withComputed(({ actor, providerId, clientId, providerBaseUrl, clientBaseUrl, _currentPath }) => {
    const isOnClientArea = computed(
      () => actor()?.role !== Role.CLIENT && isUnder(_currentPath(), clientBaseUrl()),
    );

    return {
      _isOnClientArea: isOnClientArea,

      /** On pages that work for a selected target (not the actor's own pages)? */
      _isOnActingArea: computed(
        () =>
          isOnClientArea() ||
          (actor()?.role === Role.ADMIN && isUnder(_currentPath(), providerBaseUrl())),
      ),

      /**
       * Identifies the target the page on screen depends on. The shell re-creates the page when it
       * changes, so pages read the context once and still follow a switch. Provider pages ignore the
       * Client selection, so picking a Client never wipes, say, a half-filled Provider form.
       */
      pageKey: computed(() => {
        const providerKey = providerId() ?? '-';
        return isOnClientArea() ? `${providerKey}|${clientId() ?? '-'}` : providerKey;
      }),
    };
  }),
  withProps(({ selectedProvider, selectedClient, _usersApi }) => {
    const loadUser = (userId: Signal<string | null>) =>
      toSignal(
        toObservable(userId).pipe(
          switchMap((id) => (id ? _usersApi.get(id).pipe(catchError(() => of(null))) : of(null))),
        ),
        { initialValue: null as AuthUser | null },
      );

    return {
      /** Full user of the selected Provider (onboarding status etc.); null when none is selected. */
      actingProvider: loadUser(computed(() => selectedProvider()?.id ?? null)),
      /** Full user of the selected Client. */
      actingClient: loadUser(computed(() => selectedClient()?.id ?? null)),
    };
  }),
  withMethods((store) => {
    /** Re-runs the current route's guards (e.g. onboarding) for the new target, staying on the same page. */
    const reloadCurrentRoute = () =>
      store._router.navigateByUrl(store._router.url, { onSameUrlNavigation: 'reload' });

    return {
      /** Admin only. Switching Provider drops the Client, who belonged to the previous one. */
      selectProvider(selection: ActingSelection): void {
        if (store.selectedProvider()?.id === selection.id) {
          return;
        }

        patchState(store, { selectedProvider: selection, selectedClient: null });

        if (store._isOnActingArea()) {
          reloadCurrentRoute();
        }
      },

      /** Admin only. Pages acting for a Provider can't stay without one, so step back to the Admin home. */
      clearProvider(): void {
        const wasOnActingArea = store._isOnActingArea();
        patchState(store, { selectedProvider: null, selectedClient: null });

        if (wasOnActingArea) {
          store._router.navigateByUrl('/admin');
        }
      },

      selectClient(selection: ActingSelection): void {
        if (store.selectedClient()?.id === selection.id) {
          return;
        }

        patchState(store, { selectedClient: selection });

        if (store._isOnClientArea()) {
          reloadCurrentRoute();
        }
      },

      /** Client pages can't stay without a Client, so step back to the Provider pages. */
      clearClient(): void {
        const wasOnClientArea = store._isOnClientArea();
        patchState(store, { selectedClient: null });

        if (wasOnClientArea) {
          store._router.navigateByUrl(store.providerBaseUrl() ?? '/');
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Restore this tab's selection, but only for the actor who made it.
      const stored = readStoredSelection();

      if (stored && stored.actorId === store.actor()?.id) {
        patchState(store, {
          selectedProvider: stored.selectedProvider,
          selectedClient: stored.selectedClient,
        });
      }

      // Persist per tab; a different (or no) actor never inherits someone else's selection.
      effect(() => {
        const actor = store.actor();

        if (!actor) {
          patchState(store, { selectedProvider: null, selectedClient: null });
          writeStoredSelection(null);
          return;
        }

        writeStoredSelection({
          actorId: actor.id,
          selectedProvider: store.selectedProvider(),
          selectedClient: store.selectedClient(),
        });
      });
    },
  }),
);
