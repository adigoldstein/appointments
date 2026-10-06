import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, filter, map, of, switchMap } from 'rxjs';
import { AuthStorageService } from '@app/shared/auth';
import { AuthUser, Role } from '@app/shared/types';
import { UsersApiService } from '@app/shared/users';

/** What the context bar needs to show a selection without a request (also what survives a refresh). */
export interface ActingSelection {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

interface StoredSelection {
  actorId: string;
  provider: ActingSelection | null;
  client: ActingSelection | null;
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

/**
 * Acting on behalf (ADR-0004, ADR-0005): which Provider/Client the screen works on.
 * The selection is state, not URL — picking in the context bar never navigates. It is kept
 * per browser tab (sessionStorage) so a refresh keeps it, and dropped when the actor changes.
 */
@Injectable({ providedIn: 'root' })
export class ActingContextService {
  private readonly router = inject(Router);
  private readonly authStorage = inject(AuthStorageService);
  private readonly usersApi = inject(UsersApiService);

  /** The logged-in user — always the real actor, never the target. */
  readonly actor = computed(() => this.authStorage.session()?.user ?? null);

  private readonly stored = readStoredSelection();
  private readonly selectedProviderSignal = signal<ActingSelection | null>(
    this.storedFor('provider'),
  );
  private readonly selectedClientSignal = signal<ActingSelection | null>(
    this.storedFor('client'),
  );

  /** Admin only: the Provider picked in the context bar. */
  readonly selectedProvider = this.selectedProviderSignal.asReadonly();
  /** Admin/Provider: the Client picked in the context bar. */
  readonly selectedClient = this.selectedClientSignal.asReadonly();

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.pathOf(this.router.url)),
    ),
    { initialValue: this.pathOf(this.router.url) },
  );

  /**
   * Identifies the target the page on screen depends on. The shell re-creates the page when it
   * changes, so pages read the context once and still follow a switch. Provider pages ignore the
   * Client selection, so picking a Client never wipes, say, a half-filled Provider form.
   */
  readonly pageKey = computed(() => {
    const providerKey = this.providerId() ?? '-';
    return this.isOnClientArea(this.currentPath())
      ? `${providerKey}|${this.clientId() ?? '-'}`
      : providerKey;
  });

  /** The Provider whose data is shown: the selection for an Admin, otherwise the actor's own Provider identity. */
  readonly providerId = computed(() => {
    const actor = this.actor();

    switch (actor?.role) {
      case Role.ADMIN:
        return this.selectedProvider()?.id ?? null;
      case Role.PROVIDER:
        return actor.id;
      case Role.CLIENT:
        return actor.providerId;
      default:
        return null;
    }
  });

  /** The Client whose data is shown: the selection, or the Client themselves. */
  readonly clientId = computed(() => {
    const actor = this.actor();
    return actor?.role === Role.CLIENT ? actor.id : (this.selectedClient()?.id ?? null);
  });

  /**
   * The `providerId` to send to the API: only an Admin names the Provider; for everyone else the
   * backend derives it from the token, and sending it would be rejected.
   */
  readonly providerIdForRequest = computed(() =>
    this.actor()?.role === Role.ADMIN ? (this.selectedProvider()?.id ?? null) : null,
  );

  /** Where the Provider pages are mounted for this actor; null if they can't reach them. */
  readonly providerBaseUrl = computed(() => {
    switch (this.actor()?.role) {
      case Role.ADMIN:
        return '/admin/provider';
      case Role.PROVIDER:
        return '/provider';
      default:
        return null;
    }
  });

  /** Where the Client pages are mounted for this actor. */
  readonly clientBaseUrl = computed(() => {
    switch (this.actor()?.role) {
      case Role.ADMIN:
        return '/admin/client';
      case Role.PROVIDER:
        return '/provider/client';
      case Role.CLIENT:
        return '/client';
      default:
        return null;
    }
  });

  /** Full user of the selected Provider (onboarding status etc.); null when none is selected. */
  readonly actingProvider = this.loadUser(computed(() => this.selectedProvider()?.id ?? null));

  /** Full user of the selected Client. */
  readonly actingClient = this.loadUser(computed(() => this.selectedClient()?.id ?? null));

  constructor() {
    // Persist per tab; a different (or no) actor never inherits someone else's selection.
    effect(() => {
      const actor = this.actor();

      if (!actor) {
        this.selectedProviderSignal.set(null);
        this.selectedClientSignal.set(null);
        this.writeStorage(null);
        return;
      }

      this.writeStorage({
        actorId: actor.id,
        provider: this.selectedProvider(),
        client: this.selectedClient(),
      });
    });
  }

  /** Admin only. Switching Provider drops the Client, who belonged to the previous one. */
  selectProvider(selection: ActingSelection): void {
    if (this.selectedProvider()?.id === selection.id) {
      return;
    }

    this.selectedClientSignal.set(null);
    this.selectedProviderSignal.set(selection);

    if (this.isOnActingArea()) {
      this.reloadCurrentRoute();
    }
  }

  /** Admin only. Pages acting for a Provider can't stay without one, so step back to the Admin home. */
  clearProvider(): void {
    this.selectedClientSignal.set(null);
    this.selectedProviderSignal.set(null);

    if (this.isOnActingArea()) {
      this.router.navigateByUrl('/admin');
    }
  }

  selectClient(selection: ActingSelection): void {
    if (this.selectedClient()?.id === selection.id) {
      return;
    }

    this.selectedClientSignal.set(selection);

    if (this.isOnClientArea(this.currentPath())) {
      this.reloadCurrentRoute();
    }
  }

  /** Client pages can't stay without a Client, so step back to the Provider pages. */
  clearClient(): void {
    this.selectedClientSignal.set(null);

    if (this.isOnClientArea(this.currentPath())) {
      this.router.navigateByUrl(this.providerBaseUrl() ?? '/');
    }
  }

  /** Re-runs the current route's guards (e.g. onboarding) for the new target, staying on the same page. */
  private reloadCurrentRoute(): void {
    this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
  }

  /** On pages that work for a selected target (not the actor's own pages)? */
  private isOnActingArea(): boolean {
    const path = this.currentPath();
    return (
      this.isOnClientArea(path) ||
      (this.actor()?.role === Role.ADMIN && this.isUnder(path, this.providerBaseUrl()))
    );
  }

  private isOnClientArea(path: string): boolean {
    return this.actor()?.role !== Role.CLIENT && this.isUnder(path, this.clientBaseUrl());
  }

  private isUnder(path: string, baseUrl: string | null): boolean {
    return !!baseUrl && (path === baseUrl || path.startsWith(`${baseUrl}/`));
  }

  private pathOf(url: string): string {
    return url.split(/[?#]/)[0];
  }

  private storedFor(kind: 'provider' | 'client'): ActingSelection | null {
    const actorId = this.authStorage.session()?.user.id;
    return this.stored && this.stored.actorId === actorId ? this.stored[kind] : null;
  }

  private writeStorage(value: StoredSelection | null): void {
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
}
