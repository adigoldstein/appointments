/** What the context bar needs to show a selection without a request (also what survives a refresh). */
export interface ActingSelection {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

export interface ActingContextState {
  /** Admin only: the Provider picked in the context bar. */
  selectedProvider: ActingSelection | null;
  /** Admin/Provider: the Client picked in the context bar. */
  selectedClient: ActingSelection | null;
}

export interface StoredSelection extends ActingContextState {
  actorId: string;
}
