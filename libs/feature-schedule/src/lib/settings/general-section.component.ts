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
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActingContextStore } from '@app/shared/acting-context';
import { ScheduleApiService } from '@app/shared/schedule';
import {
  CANCELLATION_WINDOW_MAX_MINUTES,
  MeetingType,
  ScheduleSettingsResponse,
  TIME_UNIT_OPTIONS_MINUTES,
  TimeUnitMinutes,
} from '@app/shared/types';
import { FieldErrorMessages, GENERIC_ERROR_MESSAGE, fieldErrors } from '@app/shared/utils';
import { UiButtonComponent } from '@app/ui/button';
import { UiCardComponent } from '@app/ui/card';
import { UiInputComponent } from '@app/ui/input';
import { HOURS_MINUTES_PATTERN } from './schedule-settings.constants';
import {
  formatHoursMinutes,
  formatLength,
  parseHoursMinutes,
} from './schedule-time';

function maxCancellationWindow(control: AbstractControl<string>): ValidationErrors | null {
  const minutes = parseHoursMinutes(control.value ?? '');
  return minutes !== null && minutes > CANCELLATION_WINDOW_MAX_MINUTES ? { max: true } : null;
}

/** Only the rules whose shared default wouldn't explain the hours:minutes format. */
const CANCELLATION_WINDOW_ERROR_MESSAGES: FieldErrorMessages = {
  pattern: 'יש להזין בפורמט שעות:דקות, לדוגמה 24:00.',
  max: 'הערך לא יכול לעלות על 168:00 (7 ימים).',
};

/** Time unit + cancellation window. Saved on their own; meeting types and hours save separately. */
@Component({
  selector: 'feature-schedule-general-section',
  standalone: true,
  imports: [ReactiveFormsModule, UiButtonComponent, UiCardComponent, UiInputComponent],
  templateUrl: './general-section.component.html',
  styleUrl: './general-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSectionComponent implements OnInit {
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly actingContext = inject(ActingContextStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly settings = input.required<ScheduleSettingsResponse>();
  /** The current meeting types: a unit that doesn't divide one of them can't be saved. */
  readonly meetingTypes = input.required<readonly MeetingType[]>();
  readonly saved = output<ScheduleSettingsResponse>();

  protected readonly unitOptions = TIME_UNIT_OPTIONS_MINUTES.map((minutes) => ({
    value: minutes,
    label: formatLength(minutes),
  }));

  readonly form = new FormGroup({
    timeUnitMinutes: new FormControl<TimeUnitMinutes>(60, { nonNullable: true }),
    cancellationWindow: new FormControl('24:00', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(HOURS_MINUTES_PATTERN),
        maxCancellationWindow,
      ],
    }),
  });

  protected readonly unit = toSignal(this.form.controls.timeUnitMinutes.valueChanges, {
    initialValue: this.form.controls.timeUnitMinutes.value,
  });

  protected readonly unitLabel = computed(() => formatLength(this.unit()));

  /** Types whose length isn't a multiple of the chosen unit, named so the Provider knows what to change. */
  protected readonly offGridMessage = computed(() => {
    const unit = this.unit();
    const offGrid = this.meetingTypes().filter((type) => type.lengthMinutes % unit !== 0);

    return offGrid.length === 0
      ? null
      : `יחידת זמן של ${formatLength(unit)} לא מתאימה ל: ${offGrid
          .map((type) => `${type.name} (${formatLength(type.lengthMinutes)})`)
          .join(', ')}. שנו או מחקו אותם קודם.`;
  });

  private readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saveSuccess = signal(false);
  protected readonly cancellationWindowError = fieldErrors(this.form, this.submitted)(
    'cancellationWindow',
    CANCELLATION_WINDOW_ERROR_MESSAGES,
  );

  ngOnInit(): void {
    const settings = this.settings();
    this.form.reset({
      timeUnitMinutes: settings.timeUnitMinutes,
      cancellationWindow: formatHoursMinutes(settings.cancellationWindowMinutes),
    });
  }

  protected onSave(): void {
    this.submitted.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    if (this.form.invalid || this.offGridMessage() || this.submitting()) {
      return;
    }

    const { timeUnitMinutes, cancellationWindow } = this.form.getRawValue();
    this.submitting.set(true);
    this.scheduleApi
      .updateSettings(
        {
          timeUnitMinutes,
          cancellationWindowMinutes: parseHoursMinutes(cancellationWindow) ?? 0,
        },
        this.actingContext.providerIdForRequest(),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.submitting.set(false);
          this.saveSuccess.set(true);
          this.form.markAsPristine();
          this.saved.emit(settings);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.saveError.set(
            error instanceof HttpErrorResponse && error.status === 400
              ? 'לא ניתן לשמור: בדקו שיחידת הזמן מתאימה לכל סוגי הפגישות.'
              : GENERIC_ERROR_MESSAGE,
          );
        },
      });
  }
}
