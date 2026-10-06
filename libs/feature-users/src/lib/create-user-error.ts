import { HttpErrorResponse } from '@angular/common/http';

/** What a failed create-user means to the page; raw backend messages never reach the user (ADR-0006). */
export type CreateUserFailure =
  | { kind: 'reactivatable'; userId: string }
  | { kind: 'email-taken' }
  | { kind: 'forbidden' }
  | { kind: 'invalid' }
  | { kind: 'unknown' };

export function toCreateUserFailure(error: unknown): CreateUserFailure {
  if (!(error instanceof HttpErrorResponse)) {
    return { kind: 'unknown' };
  }

  switch (error.status) {
    case 409:
      // Only returned to someone allowed to reactivate that account (backend, ADR-0002).
      return error.error?.reactivatable && typeof error.error.existingUserId === 'string'
        ? { kind: 'reactivatable', userId: error.error.existingUserId }
        : { kind: 'email-taken' };
    case 403:
      return { kind: 'forbidden' };
    case 400:
      return { kind: 'invalid' };
    default:
      return { kind: 'unknown' };
  }
}

export const CREATE_USER_FAILURE_MESSAGES: Readonly<
  Record<Exclude<CreateUserFailure['kind'], 'reactivatable'>, string>
> = {
  'email-taken': 'כתובת האימייל כבר רשומה במערכת.',
  forbidden: 'אין לך הרשאה להוסיף משתמש כזה.',
  invalid: 'חלק מהפרטים אינם תקינים. בדקו את השדות ונסו שוב.',
  unknown: 'אירעה שגיאה. נסו שוב מאוחר יותר.',
};
