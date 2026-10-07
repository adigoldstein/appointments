import type { Signal } from '@angular/core';
import type { Observable } from 'rxjs';

export interface DebouncedSearchOptions {
  debounceMs?: number;
  /** Re-runs the search when this changes too, even if the text didn't (e.g. the selected Provider). */
  dependsOn?: () => unknown;
  /**
   * Re-runs the current search immediately on every emission — no debounce, no "same text" skip.
   * Use it to refresh after the underlying data changed (e.g. `UsersApiService.usersChanged$`).
   */
  refresh?: Observable<unknown>;
}

export interface DebouncedSearch<T> {
  readonly results: Signal<readonly T[]>;
  readonly loading: Signal<boolean>;
}
