import { Injectable } from '@angular/core';

const STORAGE_KEY = 'schedula.onboarding.skipped';

/**
 * Providers an Admin chose to skip onboarding for (ADR-0004). Per browser tab only:
 * the Provider still has to complete onboarding on their own first login.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingSkipService {
  private readonly skipped = new Set<string>(this.read());

  isSkipped(providerId: string): boolean {
    return this.skipped.has(providerId);
  }

  skip(providerId: string): void {
    this.skipped.add(providerId);

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...this.skipped]));
    } catch {
      // Storage unavailable (e.g. private mode) — the skip still holds until reload.
    }
  }

  private read(): string[] {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }
}
