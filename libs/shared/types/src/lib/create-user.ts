import { Role } from './user-role';

/**
 * Body of the 409 from `POST /auth/create-user` when the email belongs to a deactivated account
 * the caller may reactivate (Admin, or that Client's own Provider). Anyone else gets a plain 409
 * without `reactivatable`, so another Provider's Client is never revealed (ADR-0002).
 */
export interface ReactivatableConflictBody {
  statusCode: 409;
  error: 'Conflict';
  message: string;
  reactivatable: true;
  existingUserId: string;
}

/** `POST /auth/create-user` body. Backend: `CreateUserDto implements CreateUserRequest`. */
export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  /** Admin only, when creating a CLIENT; a Provider's Clients are always linked to themselves. */
  providerId?: string;
  /** Israeli mobile, `05XXXXXXXX` (spaces and dashes allowed). */
  phone?: string;
  cityId?: number;
}

/** `PATCH /auth/users/:userId` body; at least one field. Backend: `UpdateUserDto implements UpdateUserRequest`. */
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
  cityId?: number | null;
  /** true = deactivate now, false = reactivate. */
  deactivate?: boolean;
}
