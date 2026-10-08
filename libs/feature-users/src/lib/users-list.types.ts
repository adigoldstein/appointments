import type { UserStatusFilter } from '@app/shared/types';

export type StatusFilter = 'all' | UserStatusFilter;

/** A failed deactivate / reactivate, shown on that user's row. */
export interface RowActionError {
  userId: string;
  message: string;
}
