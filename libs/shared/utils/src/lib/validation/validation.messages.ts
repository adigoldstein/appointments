import { Signal, computed } from '@angular/core';
import { FormGroup, ValidationErrors } from '@angular/forms';
import { formChangeTick } from '../form-change-tick';
import type { FieldErrorMessages } from './validation.types';

/**
 * One Hebrew message per validation rule, shared by every form (ADR-0006). Keyed by the
 * validator's error key — not by field — so "required" reads the same everywhere and lengths
 * come from the error itself.
 */
export const DEFAULT_FIELD_ERROR_MESSAGES: FieldErrorMessages = {
  required: 'שדה חובה.',
  minlength: (details) => `יש להזין לפחות ${details['requiredLength']} תווים.`,
  maxlength: (details) => `אפשר להזין לכל היותר ${details['requiredLength']} תווים.`,
  email: 'יש להזין כתובת אימייל תקינה.',
  pattern: 'הערך שהוזן אינו תקין.',
  israeliMobile: 'יש להזין מספר נייד ישראלי, לדוגמה 050-1234567.',
};

const FALLBACK_MESSAGE = 'ערך לא תקין.';

/** Override for password fields: the generic `pattern` message wouldn't say what's wrong. */
export const PASSWORD_FIELD_ERROR_MESSAGES: FieldErrorMessages = {
  pattern:
    'הסיסמה חייבת לכלול לפחות אות אחת באנגלית וספרה אחת, ויכולה להכיל רק אותיות באנגלית, ספרות וסימנים (ללא רווחים).',
};

/** The message for a control's first failing rule: the field's override if any, else the default. */
export function fieldErrorMessage(
  errors: ValidationErrors | null | undefined,
  overrides: FieldErrorMessages = {},
): string | null {
  if (!errors) {
    return null;
  }

  const [rule, details] = Object.entries(errors)[0];
  const message = overrides[rule] ?? DEFAULT_FIELD_ERROR_MESSAGES[rule] ?? FALLBACK_MESSAGE;

  return typeof message === 'function' ? message(details as Record<string, unknown>) : message;
}

/**
 * Error signals for a form's fields, shown only after a submit attempt:
 *
 *   private readonly errors = fieldErrors(this.form, this.submitted);
 *   protected readonly emailError = this.errors('email');
 *   protected readonly passwordError = this.errors('password', PASSWORD_FIELD_ERROR_MESSAGES);
 *
 * Must be called in an injection context (a field initializer or constructor).
 */
export function fieldErrors<T extends FormGroup>(form: T, submitted: Signal<boolean>) {
  const formChanged = formChangeTick(form);

  return (
    name: keyof T['controls'] & string,
    overrides?: FieldErrorMessages,
  ): Signal<string | null> =>
    computed(() => {
      formChanged();
      return submitted() ? fieldErrorMessage(form.controls[name].errors, overrides) : null;
    });
}
