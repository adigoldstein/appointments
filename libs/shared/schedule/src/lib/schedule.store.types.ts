import type { OpeningResponse, ScheduleDay } from '@app/shared/types';

/** A cached response and when it was loaded (epoch ms), for "עודכן ב-…" and expiry. */
export interface CachedEntry<T> {
  value: T;
  loadedAt: number;
}

/** Keys are `scope|…`: the logged-in user and the Provider on screen, then the week's Sunday. */
export interface ScheduleCacheState {
  weeks: Record<string, CachedEntry<ScheduleDay[]>>;
  openings: Record<string, CachedEntry<OpeningResponse>>;
  /** Bumped by every clear: a response from an earlier generation is not cached. */
  generation: number;
}
