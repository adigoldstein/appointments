import { computed, effect } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { AuthSession, AuthUser } from '@app/shared/types';

const STORAGE_KEY = 'schedula.auth.session';

interface SessionState {
  session: AuthSession | null;
}

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: AuthSession | null): void {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable — the session still works until reload.
  }
}

/**
 * The logged-in session (ADR-0007): tokens and the user. Persisted to localStorage, so it
 * survives reloads and is shared across tabs; methods only patch state and one effect persists it.
 */
export const SessionStore = signalStore(
  { providedIn: 'root' },
  withState<SessionState>(() => ({ session: readStoredSession() })),
  withComputed(({ session }) => ({
    user: computed(() => session()?.user ?? null),
    accessToken: computed(() => session()?.accessToken ?? null),
    refreshToken: computed(() => session()?.refreshToken ?? null),
    isAuthenticated: computed(() => session() !== null),
    displayName: computed(() => {
      const user = session()?.user;
      return user ? `${user.firstName} ${user.lastName}` : '';
    }),
  })),
  withMethods((store) => ({
    setSession(session: AuthSession): void {
      patchState(store, { session });
    },

    clear(): void {
      patchState(store, { session: null });
    },

    /** Patches in a freshly-issued access token; the refresh token is not rotated by the backend. */
    updateAccessToken(accessToken: string, user: AuthUser): void {
      const session = store.session();

      if (session) {
        patchState(store, { session: { ...session, accessToken, user } });
      }
    },

    /** Patches the stored user without touching tokens, e.g. after an action that changes server-side user state. */
    updateUser(user: AuthUser): void {
      const session = store.session();

      if (session) {
        patchState(store, { session: { ...session, user } });
      }
    },
  })),
  withHooks({
    onInit(store) {
      effect(() => writeStoredSession(store.session()));
    },
  }),
);
