/** What a failed create-user means to the page; raw backend messages never reach the user (ADR-0006). */
export type CreateUserFailure =
  | { kind: 'reactivatable'; userId: string }
  | { kind: 'email-taken' }
  | { kind: 'forbidden' }
  | { kind: 'invalid' }
  | { kind: 'unknown' };
