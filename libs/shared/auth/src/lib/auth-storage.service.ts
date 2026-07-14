import { Injectable, computed, signal } from '@angular/core';
import { AuthSession, AuthUser } from '@app/shared/types';

const STORAGE_KEY = 'schedula.auth.session';

function readStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthStorageService {
  private readonly sessionSignal = signal<AuthSession | null>(readStoredSession());

  readonly session = this.sessionSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);

  setSession(session: AuthSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.sessionSignal.set(session);
  }

  clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.sessionSignal.set(null);
  }

  /** Patches in a freshly-issued access token; the refresh token is not rotated by the backend. */
  updateAccessToken(accessToken: string, user: AuthUser): void {
    const current = this.sessionSignal();

    if (!current) {
      return;
    }

    const updated: AuthSession = { ...current, accessToken, user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    this.sessionSignal.set(updated);
  }

  /** Patches the stored user without touching tokens, e.g. after an action that changes server-side user state. */
  updateUser(user: AuthUser): void {
    const current = this.sessionSignal();

    if (!current) {
      return;
    }

    const updated: AuthSession = { ...current, user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    this.sessionSignal.set(updated);
  }
}
