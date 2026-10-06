/**
 * The one password rule, shared by backend DTOs and frontend forms so they can't drift apart:
 * 6–72 characters, English letters, digits and symbols (printable ASCII, no spaces, no Hebrew),
 * with at least one letter and one digit. 72 is bcrypt's input limit.
 */
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[\x21-\x7E]+$/;
