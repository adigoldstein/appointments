export interface UiAutocompleteOption {
  readonly id: string;
  readonly label: string;
  /** Secondary line, e.g. an email. */
  readonly description?: string;
}
