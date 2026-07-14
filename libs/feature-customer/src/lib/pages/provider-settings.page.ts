import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { merge } from 'rxjs';
import { getSubmittedFieldError } from '@app/shared/utils';
import { AuthStorageService } from '@app/shared/auth';
import { UiButtonComponent } from '@app/ui/button';
import { UiCardComponent } from '@app/ui/card';
import { UiInputComponent } from '@app/ui/input';
import { ProviderSettingsService } from '../provider-settings.service';

const DURATION_OPTIONS_MINUTES = [15, 30, 45, 60, 90, 120] as const;

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
  pattern: 'יש להזין מספר שלם.',
  min: 'הערך לא יכול להיות שלילי.',
  max: 'הערך לא יכול לעלות על 10080 (7 ימים).',
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
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly providerSettingsService = inject(ProviderSettingsService);
  private readonly authStorage = inject(AuthStorageService);
  private readonly router = inject(Router);

  private submitted = false;

  readonly durationOptions = DURATION_OPTIONS_MINUTES;
  readonly selectedDurations = signal<number[]>([]);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly durationsTouched = signal(false);

  readonly form = new FormGroup({
    businessName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(150)],
    }),
    clientLabel: new FormControl('לקוח', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
    }),
    cancellationWindowMinutes: new FormControl('1440', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^\d+$/),
        Validators.min(0),
        Validators.max(10_080),
      ],
    }),
  });

  ngOnInit(): void {
    merge(this.form.statusChanges, this.form.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());
  }

  businessNameError(): string | null {
    return getSubmittedFieldError(
      this.submitted,
      this.form.controls.businessName.errors,
      BUSINESS_NAME_ERROR_MESSAGES,
    );
  }

  clientLabelError(): string | null {
    return getSubmittedFieldError(
      this.submitted,
      this.form.controls.clientLabel.errors,
      CLIENT_LABEL_ERROR_MESSAGES,
    );
  }

  cancellationWindowError(): string | null {
    return getSubmittedFieldError(
      this.submitted,
      this.form.controls.cancellationWindowMinutes.errors,
      CANCELLATION_WINDOW_ERROR_MESSAGES,
    );
  }

  durationsError(): string | null {
    if (!this.durationsTouched() || this.selectedDurations().length > 0) {
      return null;
    }
    return 'יש לבחור לפחות משך תור אחד.';
  }

  isDurationSelected(minutes: number): boolean {
    return this.selectedDurations().includes(minutes);
  }

  toggleDuration(minutes: number): void {
    this.durationsTouched.set(true);
    this.selectedDurations.update((current) =>
      current.includes(minutes)
        ? current.filter((value) => value !== minutes)
        : [...current, minutes].sort((a, b) => a - b),
    );
  }

  onSubmit(): void {
    this.submitted = true;
    this.durationsTouched.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid || this.selectedDurations().length === 0 || this.submitting()) {
      return;
    }

    this.submitError.set(null);
    this.submitting.set(true);

    const { businessName, clientLabel, cancellationWindowMinutes } = this.form.getRawValue();

    this.providerSettingsService
      .create({
        businessName,
        clientLabel,
        cancellationWindowMinutes: Number(cancellationWindowMinutes),
        allowedDurationsMinutes: this.selectedDurations(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const session = this.authStorage.session();

          if (session) {
            this.authStorage.updateUser({ ...session.user, hasCompletedOnboarding: true });
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
}
