import { IsraelLocality } from './israel-locality';

/** Row shape for the user-listing endpoint (a Provider's Clients, or Admin's Provider/Client lists). */
export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  city: IsraelLocality | null;
  /** null means active */
  deactivatedAt: string | null;
}

/** Status filter for user listings; omitted = all users. */
export type UserStatusFilter = 'active' | 'inactive';

export const USER_STATUS_FILTERS: readonly UserStatusFilter[] = ['active', 'inactive'];

export interface PaginatedUsersResponse {
  items: UserListItem[];
  page: number;
  limit: number;
  total: number;
}
