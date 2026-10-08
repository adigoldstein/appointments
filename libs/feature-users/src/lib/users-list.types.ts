import type { UserStatusFilter } from '@app/shared/types';

export type StatusFilter = 'all' | UserStatusFilter;

/** `clients`: a Provider's Clients (Provider, or Admin with a Provider selected). `providers`: Admin's list. */
export type UsersListMode = 'clients' | 'providers';

/** Everything that reads differently between the two modes. */
export interface UsersListTexts {
  title: string;
  count: (total: number) => string;
  found: (total: number) => string;
  addLabel: string;
  loading: string;
  loadError: string;
  emptyTitle: string;
  emptyBody: string;
  noResultsTitle: string;
  noResultsBody: string;
  paginationLabel: string;
  /** Extra sentence in the deactivate confirmation, or null. */
  deactivateWarning: string | null;
}

/** A failed deactivate / reactivate, shown on that user's row. */
export interface RowActionError {
  userId: string;
  message: string;
}

/** Router navigation state the list reads on arrival, e.g. the notice after saving an edit. */
export interface UsersListNavigationState {
  notice?: string;
}
