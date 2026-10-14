import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { ActingContextStore } from '@app/shared/acting-context';
import { ScheduleApiService } from '@app/shared/schedule';
import { ScheduleSettingsResponse, WeeklyWindow, toMinutes, toTimeOfDay } from '@app/shared/types';
import { GENERIC_ERROR_MESSAGE } from '@app/shared/utils';
import { UiButtonComponent } from '@app/ui/button';
import { UiCardComponent } from '@app/ui/card';
import { UiIconComponent } from '@app/ui/icons';
import { createBreakForm, createDayForm } from './day-hours';
import { MAX_BREAKS_PER_DAY, WEEKDAY_NAMES } from './schedule-settings.constants';
import type { DayForm, DayHours, DayNotice } from './schedule-settings.types';
import { daysToWindows, windowsToDays } from './schedule-time';

/**
 * The working week as "hours + breaks" per day (ADR-0009: underneath, windows). The whole week is
 * saved at once, the way the screen edits it.
 */
@Component({
  selector: 'feature-schedule-weekly-hours-section',
  standalone: true,
  imports: [ReactiveFormsModule, UiButtonComponent, UiCardComponent, UiIconComponent],
  templateUrl: './weekly-hours-section.component.html',
  styleUrl: './weekly-hours-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyHoursSectionComponent implements OnInit {
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly actingContext = inject(ActingContextStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly weeklyWindows = input.required<readonly WeeklyWindow[]>();
  /** The saved time unit: a new break is one unit long. */
  readonly timeUnitMinutes = input.required<number>();
  readonly saved = output<ScheduleSettingsResponse>();

  protected readonly weekdayNames = WEEKDAY_NAMES;
  protected readonly maxBreaks = MAX_BREAKS_PER_DAY;

  readonly form = new FormGroup({ days: new FormArray<DayForm>([]) });
  protected readonly days = this.form.controls.days;

  /** Every form event, including pristine/dirty (markAsPristine after a save emits no value change). */
  private readonly changed = toSignal(this.form.events.pipe(map((_, index) => index + 1)), {
    initialValue: 0,
  });
  private readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saveSuccess = signal(false);
  /** "No room for another break" on one day, until the next edit. */
  protected readonly breakNotice = signal<DayNotice | null>(null);

  /** Per day, shown once the day was edited or a save was tried. */
  protected readonly dayErrors = computed(() => {
    this.changed();
    const submitted = this.submitted();
    return this.days.controls.map((day) =>
      submitted || day.dirty ? ((day.errors?.['dayHours'] as string | undefined) ?? null) : null,
    );
  });

  protected readonly dirty = computed(() => {
    this.changed();
    return this.form.dirty;
  });

  ngOnInit(): void {
    for (const day of windowsToDays(this.weeklyWindows())) {
      this.days.push(createDayForm(day));
    }
  }

  /** A new break, one time unit long: mid-day for the first, after the last one otherwise. */
  protected onAddBreak(dayIndex: number): void {
    const day = this.days.at(dayIndex);
    const { start, end, breaks } = day.getRawValue();

    // A cleared time input is '': there's nothing to place a break against yet.
    if ([start, end, ...breaks.flatMap((range) => [range.start, range.end])].some((time) => !time)) {
      this.breakNotice.set({ weekday: dayIndex, message: 'מלאו קודם את כל השעות של היום הזה.' });
      return;
    }

    const unit = this.timeUnitMinutes();
    const dayStart = toMinutes(start);
    const dayEnd = toMinutes(end);
    const lastBreakEnd = Math.max(...breaks.map((range) => toMinutes(range.end)), -1);
    const breakStart =
      lastBreakEnd < 0
        ? dayStart + Math.max(1, Math.floor((dayEnd - dayStart) / unit / 2)) * unit
        : lastBreakEnd + unit;

    if (breakStart + unit >= dayEnd) {
      this.breakNotice.set({
        weekday: dayIndex,
        message: 'אין מקום להפסקה נוספת. האריכו את שעות הפעילות או קצרו הפסקה קיימת.',
      });
      return;
    }

    this.breakNotice.set(null);
    day.markAsDirty();
    day.controls.breaks.push(
      createBreakForm({ start: toTimeOfDay(breakStart), end: toTimeOfDay(breakStart + unit) }),
    );
  }

  protected onRemoveBreak(dayIndex: number, breakIndex: number): void {
    const day = this.days.at(dayIndex);
    this.breakNotice.set(null);
    day.markAsDirty();
    day.controls.breaks.removeAt(breakIndex);
  }

  protected onSave(): void {
    this.submitted.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    if (this.form.invalid || this.submitting()) {
      return;
    }

    const days: DayHours[] = this.days.getRawValue().map((day, weekday) => ({ ...day, weekday }));
    this.submitting.set(true);
    this.scheduleApi
      .replaceWeeklyWindows({ windows: daysToWindows(days) }, this.actingContext.providerIdForRequest())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.submitting.set(false);
          this.saveSuccess.set(true);
          this.submitted.set(false);
          this.form.markAsPristine();
          this.saved.emit(settings);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.saveError.set(
            error instanceof HttpErrorResponse && error.status === 400
              ? 'לא ניתן לשמור: בדקו את השעות וההפסקות.'
              : GENERIC_ERROR_MESSAGE,
          );
        },
      });
  }
}
