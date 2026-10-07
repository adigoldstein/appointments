export interface NavLink {
  readonly label: string;
  readonly path: string;
}

export interface NavSection {
  /** null for the actor's own section; otherwise the selected target's name. */
  readonly title: string | null;
  readonly items: readonly NavLink[];
}
