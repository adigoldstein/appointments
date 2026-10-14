import { computed, effect, inject, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { Observable, map, of, tap } from 'rxjs';
import { ActingContextStore } from '@app/shared/acting-context';
import { SessionStore } from '@app/shared/auth';
import { addDays, type OpeningResponse, type ScheduleDay } from '@app/shared/types';
import { ScheduleApiService } from './schedule-api.service';
import type { CachedEntry, ScheduleCacheState } from './schedule.store.types';

/** Cached schedule data expires after this long (changes by others, e.g. Client bookings). */
const TTL_MS = 5 * 60_000;

/** An entry is usable while it's younger than the TTL; older ones are simply loaded again. */
const isFresh = <T>(entry: CachedEntry<T> | undefined): entry is CachedEntry<T> =>
  !!entry && Date.now() - entry.loadedAt < TTL_MS;

/**
 * App-wide cache of the Provider's schedule (docs/plans/slot-management.md, ADR-0007): leaving
 * the weekly view or the home page and coming back costs no request. `providedIn: 'root'` and
 * never in a route's `providers`, or each lazy route would get its own, empty copy.
 *
 * Cleared by any change made through ScheduleApiService in this tab, when the user or the
 * Provider on screen changes, and per entry after 5 minutes. Entries are keyed by that scope too,
 * so a response that arrives after a Provider switch is never shown for the new one.
 *
 * How a page uses it: `rxResource({ stream: () => store.week(weekStart) })`. The store hands back
 * an Observable either way: the cached entry right away (`of(...)`), or the HTTP call, which
 * saves its result on the way through (`tap`). The page doesn't know which one it got.
 *
 * A signalStore is built from features, applied in order; each one can use what the earlier ones
 * added. Members whose name starts with `_` are private to the store: methods and hooks below
 * can use them, components can't.
 */
export const ScheduleStore = signalStore(
  // One instance for the whole app (root injector), so the cache survives route changes.
  { providedIn: 'root' },

  // The state: plain data, each key readable as a signal (`store.weeks()`), changed only through
  // `patchState`. `weeks` maps "scope|Sunday" to that week's days; `openings` maps scope to the
  // opening info; `generation` counts clears (see `clear`).
  withState<ScheduleCacheState>({ weeks: {}, openings: {}, generation: 0 }),

  // Dependencies, injected once. Private (`_`): only the store talks to the API and the
  // other stores.
  withProps(() => ({
    _api: inject(ScheduleApiService),
    _acting: inject(ActingContextStore),
    _session: inject(SessionStore),
  })),

  withComputed(({ _acting, _session }) => ({
    /**
     * Whose data the cache holds right now: the logged-in user and the Provider on screen,
     * e.g. "3c9…|b42…" for an Admin acting for Provider b42…, or "7a1…|self" for a Provider on
     * their own schedule. It prefixes every cache key, and a change of it clears the cache (hooks).
     */
    _scope: computed(() => `${_session.user()?.id ?? '-'}|${_acting.providerIdForRequest() ?? 'self'}`),
  })),

  withMethods((store) => ({
    /** The 7 days from `weekStart` (a Sunday): cached while fresh, otherwise loaded and cached. */
    week(weekStart: string): Observable<CachedEntry<ScheduleDay[]>> {
      const key = `${store._scope()}|${weekStart}`;
      const cached = store.weeks()[key];

      // Cache hit: no request at all.
      if (isFresh(cached)) {
        return of(cached);
      }

      // Cache miss: load, and save the result under the same key. The generation is read now,
      // before the request: if a clear() happens while it's on its way, the response is dropped
      // instead of putting data from before the change back into the cache.
      const generation = store.generation();
      return store._api
        .getDays(weekStart, addDays(weekStart, 6), store._acting.providerIdForRequest())
        .pipe(
          map((value) => ({ value, loadedAt: Date.now() })),
          tap((entry) =>
            patchState(store, (state) =>
              // A new object, never a mutation: signals only notice new references.
              state.generation === generation ? { weeks: { ...state.weeks, [key]: entry } } : {},
            ),
          ),
        );
    },

    /** "Open until" and the opening limit: cached like the weeks (one entry per scope). */
    opening(): Observable<CachedEntry<OpeningResponse>> {
      const key = store._scope();
      const cached = store.openings()[key];

      if (isFresh(cached)) {
        return of(cached);
      }

      const generation = store.generation();
      return store._api.getOpening(store._acting.providerIdForRequest()).pipe(
        map((value) => ({ value, loadedAt: Date.now() })),
        tap((entry) =>
          patchState(store, (state) =>
            state.generation === generation ? { openings: { ...state.openings, [key]: entry } } : {},
          ),
        ),
      );
    },

    /**
     * Drops everything: the next read loads fresh data ("רענון" calls this, then reloads). A
     * response already on its way is not cached: it may predate the change that caused the clear.
     */
    clear(): void {
      patchState(store, (state) => ({ weeks: {}, openings: {}, generation: state.generation + 1 }));
    },
  })),

  // Runs once, when the store is first injected (in an injection context, so takeUntilDestroyed
  // and effect work here).
  withHooks({
    onInit(store) {
      // Anything changed through the API in this tab (hours, meeting types, opening…): the
      // cached schedule may be wrong now, so drop it all.
      store._api.scheduleChanged$.pipe(takeUntilDestroyed()).subscribe(() => store.clear());

      // Another user or another Provider on screen: nothing cached belongs to them. (Entries are
      // keyed by scope as well, so even a late response can never show for the wrong Provider.)
      // The effect re-runs whenever `_scope` changes; `untracked` keeps clear()'s own signal
      // reads from becoming dependencies of the effect.
      effect(() => {
        store._scope();
        untracked(() => store.clear());
      });
    },
  }),
);
