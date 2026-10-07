/** A message for one validation rule; a function gets that rule's error details (e.g. `requiredLength`). */
export type FieldErrorMessage = string | ((details: Readonly<Record<string, unknown>>) => string);

export type FieldErrorMessages = Readonly<Record<string, FieldErrorMessage>>;
