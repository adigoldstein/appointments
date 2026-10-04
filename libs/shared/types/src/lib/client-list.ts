import { IsraelLocality } from './israel-locality';

/** Row shape for a Provider's (or Admin's) client-listing endpoint. */
export interface ClientListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  city: IsraelLocality | null;
  /** null means active */
  deactivatedAt: string | null;
}

export interface PaginatedUsersResponse {
  items: ClientListItem[];
  page: number;
  limit: number;
  total: number;
}
