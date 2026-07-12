import { ValidatorFn, Validators } from '@angular/forms';
import {
  ALPHANUMERIC_ENGLISH_PATTERN,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from './validation.constants';

export function emailFieldValidators(): ValidatorFn[] {
  return [Validators.required, Validators.email];
}

export function authPasswordValidators(): ValidatorFn[] {
  return [
    Validators.required,
    Validators.minLength(AUTH_PASSWORD_MIN_LENGTH),
    Validators.maxLength(AUTH_PASSWORD_MAX_LENGTH),
    Validators.pattern(ALPHANUMERIC_ENGLISH_PATTERN),
  ];
}
