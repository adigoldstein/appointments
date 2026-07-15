import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
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
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { merge } from 'rxjs';
import { getSubmittedFieldError } from '@app/shared/utils';
import { AuthStorageService } from '@app/shared/auth';
import { UiButtonComponent } from '@app/ui/button';
import { UiCardComponent } from '@app/ui/card';
import { UiInputComponent } from '@app/ui/input';
import { ProviderSettingsService } from '../provider-settings.service';

const HOURS_MINUTES_PATTERN = /^\d{1,4}:[0-5]\d$/;
const MIN_DURATION_MINUTES = 5;
const MAX_DURATION_MINUTES = 480;
const MAX_CANCELLATION_MINUTES = 10_080;

function parseHoursMinutes(value: string): number | null {
  const trimmed = value.trim();

  if (!HOURS_MINUTES_PATTERN.test(trimmed)) {
    return null;
  }

  const [hoursPart, minutesPart] = trimmed.split(':');
  return Number(hoursPart) * 60 + Number(minutesPart);
}

function formatHoursMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

function maxHoursMinutesValidator(maxMinutes: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const minutes = parseHoursMinutes(control.value ?? '');
    return minutes !== null && minutes > maxMinutes ? { max: true } : null;
  };
}

const BUSINESS_NAME_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  required: 'שם העסק הוא שדה חובה.',
  minlength: 'שם העסק חייב להכיל לפחות 2 תווים.',
  maxlength: 'שם העסק יכול להכיל לכל היותר 150 תווים.',
};

const CLIENT_LABEL_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  required: 'שדה חובה.',
  minlength: 'הכינוי חייב להכיל לפחות 2 תווים.',
  maxlength: 'הכינוי יכול להכיל לכל היותר 50 תווים.',
};

const CANCELLATION_WINDOW_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  required: 'שדה חובה.',
  pattern: 'יש להזין בפורמט שעות:דקות, לדוגמה 24:00.',
  max: 'הערך לא יכול לעלות על 168:00 (7 ימים).',
};

const GENERIC_SUBMIT_ERROR = 'אירעה שגיאה. נסו שוב מאוחר יותר.';

@Component({
  selector: 'feature-customer-provider-settings-page',
  standalone: true,
  imports: [ReactiveFormsModule, UiButtonComponent, UiCardComponent, UiInputComponent],
  templateUrl: './provider-settings.page.html',
  styleUrl: './provider-settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderSettingsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly providerSettingsService = inject(ProviderSettingsService);
  private readonly authStorage = inject(AuthStorageService);
  private readonly router = inject(Router);

  private readonly submitted = signal(false);

  protected readonly isEditing = signal(false);
  readonly loading = signal(true);
  readonly selectedDurations = signal<number[]>([]);
  readonly durationsTouched = signal(false);
  readonly durationInputError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal(false);

  readonly form = new FormGroup({
    businessName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(150)],
    }),
    clientLabel: new FormControl('לקוח', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
    }),
    cancellationWindow: new FormControl('24:00', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(HOURS_MINUTES_PATTERN),
        maxHoursMinutesValidator(MAX_CANCELLATION_MINUTES),
      ],
    }),
  });

  readonly durationInputControl = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.providerSettingsService
      .getOwn()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.isEditing.set(true);
          this.form.patchValue({
            businessName: settings.businessName,
            clientLabel: settings.clientLabel,
            cancellationWindow: formatHoursMinutes(settings.cancellationWindowMinutes),
          });
          this.selectedDurations.set(
            [...settings.allowedDurationsMinutes].sort((a, b) => a - b),
          );
          this.loading.set(false);
        },
        error: () => {
          // 404 means onboarding hasn't happened yet; keep the blank/default form.
          this.loading.set(false);
        },
      });
  }

  /** Bridges the form's RxJS streams into a signal so every error below is a computed(), with no manual change detection. */
  private readonly formTick = toSignal(merge(this.form.statusChanges, this.form.valueChanges), {
    initialValue: null,
  });

  protected readonly businessNameError = computed(() => {
    this.formTick();
    return getSubmittedFieldError(
      this.submitted(),
      this.form.controls.businessName.errors,
      BUSINESS_NAME_ERROR_MESSAGES,
    );
  });

  protected readonly clientLabelError = computed(() => {
    this.formTick();
    return getSubmittedFieldError(
      this.submitted(),
      this.form.controls.clientLabel.errors,
      CLIENT_LABEL_ERROR_MESSAGES,
    );
  });

  protected readonly cancellationWindowError = computed(() => {
    this.formTick();
    return getSubmittedFieldError(
      this.submitted(),
      this.form.controls.cancellationWindow.errors,
      CANCELLATION_WINDOW_ERROR_MESSAGES,
    );
  });

  protected readonly durationsError = computed(() => {
    const inputError = this.durationInputError();

    if (inputError) {
      return inputError;
    }

    if (this.durationsTouched() && this.selectedDurations().length === 0) {
      return 'יש להוסיף לפחות משך תור אחד.';
    }

    return null;
  });

  protected formatDuration(minutes: number): string {
    return formatHoursMinutes(minutes);
  }

  protected addDuration(): void {
    const minutes = parseHoursMinutes(this.durationInputControl.value);

    if (minutes === null) {
      this.durationInputError.set('יש להזין בפורמט שעות:דקות, לדוגמה 1:00.');
      return;
    }

    if (minutes < MIN_DURATION_MINUTES || minutes > MAX_DURATION_MINUTES) {
      this.durationInputError.set(
        `המשך חייב להיות בין ${formatHoursMinutes(MIN_DURATION_MINUTES)} ל-${formatHoursMinutes(MAX_DURATION_MINUTES)}.`,
      );
      return;
    }

    if (this.selectedDurations().includes(minutes)) {
      this.durationInputError.set('משך זה כבר נוסף.');
      return;
    }

    this.selectedDurations.update((current) => [...current, minutes].sort((a, b) => a - b));
    this.durationInputControl.setValue('');
    this.durationInputError.set(null);
    this.durationsTouched.set(true);
  }

  protected removeDuration(minutes: number): void {
    this.selectedDurations.update((current) => current.filter((value) => value !== minutes));
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    this.durationsTouched.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid || this.selectedDurations().length === 0 || this.submitting()) {
      return;
    }

    this.submitError.set(null);
    this.submitSuccess.set(false);
    this.submitting.set(true);

    const { businessName, clientLabel, cancellationWindow } = this.form.getRawValue();
    const cancellationWindowMinutes = parseHoursMinutes(cancellationWindow) ?? 0;
    const payload = {
      businessName,
      clientLabel,
      cancellationWindowMinutes,
      allowedDurationsMinutes: this.selectedDurations(),
    };
    const wasEditing = this.isEditing();
    const request$ = wasEditing
      ? this.providerSettingsService.update(payload)
      : this.providerSettingsService.create(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const session = this.authStorage.session();

        if (session) {
          this.authStorage.updateUser({ ...session.user, hasCompletedOnboarding: true });
        }

        if (wasEditing) {
          this.submitting.set(false);
          this.submitSuccess.set(true);
          return;
        }

        this.router.navigateByUrl('/customer');
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.submitError.set(
          Array.isArray(error.error?.message)
            ? error.error.message.join(' ')
            : (error.error?.message ?? GENERIC_SUBMIT_ERROR),
        );
      },
    });
  }

  protected onCancel(): void {
    this.router.navigateByUrl('/customer');
  }
}
