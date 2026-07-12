import { ValidationErrors } from '@angular/forms';
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from './validation.constants';

export const EMAIL_FIELD_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  required: 'שדה האימייל הוא שדה חובה.',
  email: 'יש להזין כתובת אימייל תקינה.',
};

export const AUTH_PASSWORD_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  required: 'שדה הסיסמה הוא שדה חובה.',
  minlength: `הסיסמה חייבת להכיל לפחות ${AUTH_PASSWORD_MIN_LENGTH} תווים.`,
  maxlength: `הסיסמה יכולה להכיל לכל היותר ${AUTH_PASSWORD_MAX_LENGTH} תווים.`,
  pattern: 'הסיסמה יכולה להכיל רק אותיות באנגלית וספרות.',
};

export function resolveFieldErrorMessage(
  errors: ValidationErrors | null | undefined,
  messages: Readonly<Record<string, string>>,
  fallback = 'ערך לא תקין.',
): string | null {
  if (!errors) {
    return null;
  }

  for (const key of Object.keys(errors)) {
    if (messages[key]) {
      return messages[key];
    }
  }

  return fallback;
}

export function getSubmittedFieldError(
  submitted: boolean,
  errors: ValidationErrors | null | undefined,
  messages: Readonly<Record<string, string>>,
): string | null {
  if (!submitted) {
    return null;
  }

  return resolveFieldErrorMessage(errors, messages);
}
