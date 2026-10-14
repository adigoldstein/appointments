import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import type { BreakForm, BreakRange, DayForm, DayHours } from './schedule-settings.types';
import { toMinutes } from '@app/shared/types';

export function createBreakForm(range: BreakRange): BreakForm {
  return new FormGroup({
    start: new FormControl(range.start, { nonNullable: true }),
    end: new FormControl(range.end, { nonNullable: true }),
  });
}

export function createDayForm(day: DayHours): DayForm {
  return new FormGroup(
    {
      working: new FormControl(day.working, { nonNullable: true }),
      start: new FormControl(day.start, { nonNullable: true }),
      end: new FormControl(day.end, { nonNullable: true }),
      breaks: new FormArray(day.breaks.map(createBreakForm)),
    },
    { validators: dayHoursValidator },
  );
}

/**
 * One message per day, the first problem found: the day ends after it starts, every break is
 * inside the day and ends after it starts, and breaks don't overlap (ADR-0009 windows).
 */
export function dayHoursValidator(control: AbstractControl): ValidationErrors | null {
  const day = control.value as Omit<DayHours, 'weekday'>;

  if (!day.working) {
    return null;
  }

  if (!day.start || !day.end) {
    return { dayHours: 'יש למלא שעת התחלה ושעת סיום.' };
  }

  const start = toMinutes(day.start);
  const end = toMinutes(day.end);

  if (end <= start) {
    return { dayHours: 'שעת הסיום חייבת להיות אחרי שעת ההתחלה.' };
  }

  const breaks = [...day.breaks].sort((a, b) => a.start.localeCompare(b.start));

  for (const [index, range] of breaks.entries()) {
    if (!range.start || !range.end) {
      return { dayHours: 'יש למלא את שעות ההפסקה.' };
    }

    if (toMinutes(range.end) <= toMinutes(range.start)) {
      return { dayHours: 'הפסקה צריכה להסתיים אחרי שהיא מתחילה.' };
    }

    if (toMinutes(range.start) <= start || toMinutes(range.end) >= end) {
      return { dayHours: 'הפסקה צריכה להיות בתוך שעות הפעילות.' };
    }

    const previous = breaks[index - 1];

    // Touching breaks would leave a zero-length stretch of work between them: merge them instead.
    if (previous && toMinutes(range.start) <= toMinutes(previous.end)) {
      return { dayHours: 'הפסקות באותו יום לא יכולות לחפוף או להיצמד זו לזו. אחדו אותן להפסקה אחת.' };
    }
  }

  return null;
}
