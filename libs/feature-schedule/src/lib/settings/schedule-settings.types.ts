import type { FormArray, FormControl, FormGroup } from '@angular/forms';

/** A break inside a working day, `HH:MM`. */
export interface BreakRange {
  start: string;
  end: string;
}

/**
 * One weekday as the settings screen shows it: working hours plus breaks. Underneath it's one or
 * more windows (ADR-0009); `windowsToDays` / `daysToWindows` convert.
 */
export interface DayHours {
  weekday: number;
  working: boolean;
  start: string;
  end: string;
  breaks: BreakRange[];
}

/** `'new'` while adding a meeting type, the type's id while editing it, null otherwise. */
export type MeetingTypeEditTarget = 'new' | string | null;

export type BreakForm = FormGroup<{ start: FormControl<string>; end: FormControl<string> }>;

export type DayForm = FormGroup<{
  working: FormControl<boolean>;
  start: FormControl<string>;
  end: FormControl<string>;
  breaks: FormArray<BreakForm>;
}>;

/** A message for one day of the week editor (e.g. no room for another break). */
export interface DayNotice {
  weekday: number;
  message: string;
}
