import { HttpErrorResponse } from '@angular/common/http';
import { ReactivatableConflictBody } from '@app/shared/types';
import { GENERIC_ERROR_MESSAGE } from '@app/shared/utils';
import type { CreateUserFailure } from './create-user-error.types';

export function toCreateUserFailure(error: unknown): CreateUserFailure {
  if (!(error instanceof HttpErrorResponse)) {
    return { kind: 'unknown' };
  }

  switch (error.status) {
    case 409: {
      // `reactivatable` only reaches someone allowed to reactivate that account (backend, ADR-0002).
      const body = error.error as Partial<ReactivatableConflictBody> | null;
      return body?.reactivatable && typeof body.existingUserId === 'string'
        ? { kind: 'reactivatable', userId: body.existingUserId }
        : { kind: 'email-taken' };
    }
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
  unknown: GENERIC_ERROR_MESSAGE,
};
