/** An extra window the Provider asked to delete from the calendar (grid or agenda). */
export interface ExtraWindowTarget {
  id: string;
  date: string;
  start: string;
  end: string;
}

/** A shortcut in the opening dialog: "+1 week", "until the limit"… */
export interface OpeningShortcut {
  label: string;
  until: string;
}
