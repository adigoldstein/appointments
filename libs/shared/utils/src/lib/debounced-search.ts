import { Signal, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  merge,
  of,
  switchMap,
} from 'rxjs';

const DEFAULT_DEBOUNCE_MS = 250;

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

/**
 * Search-as-you-type for autocompletes: signal in, signals out. Waits for typing to pause,
 * skips repeats of the same text, and cancels a stale request when a newer one starts
 * (debounce → distinct → switchMap). `search` may return null for "don't search now".
 *
 * Must be called in an injection context (a field initializer or constructor).
 */
export function debouncedSearch<T>(
  query: Signal<string>,
  search: (text: string) => Observable<readonly T[]> | null,
  options: DebouncedSearchOptions = {},
): DebouncedSearch<T> {
  const loading = signal(false);
  const request = computed(() => ({ text: query().trim(), dependency: options.dependsOn?.() }));

  const typed$ = toObservable(request).pipe(
    debounceTime(options.debounceMs ?? DEFAULT_DEBOUNCE_MS),
    distinctUntilChanged(
      (previous, current) =>
        previous.text === current.text && previous.dependency === current.dependency,
    ),
  );
  const refreshed$ = options.refresh ? options.refresh.pipe(map(() => request())) : EMPTY;

  const results = toSignal(
    merge(typed$, refreshed$).pipe(
      switchMap(({ text }) => {
        const request$ = search(text);

        if (!request$) {
          return of([] as readonly T[]);
        }

        loading.set(true);
        return request$.pipe(
          catchError(() => of([] as readonly T[])),
          finalize(() => loading.set(false)),
        );
      }),
    ),
    { initialValue: [] as readonly T[] },
  );

  return { results, loading: loading.asReadonly() };
}
