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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ActingContextStore, OnboardingSkipService } from '@app/shared/acting-context';
import {
  BUSINESS_NAME_MAX_LENGTH,
  BUSINESS_NAME_MIN_LENGTH,
  CLIENT_LABEL_MAX_LENGTH,
  CLIENT_LABEL_MIN_LENGTH,
} from '@app/shared/types';
import { GENERIC_ERROR_MESSAGE, fieldErrors } from '@app/shared/utils';
import { SessionStore } from '@app/shared/auth';
import { UiButtonComponent } from '@app/ui/button';
import { UiCardComponent } from '@app/ui/card';
import { UiInputComponent } from '@app/ui/input';
import { ProviderSettingsService } from '../provider-settings.service';

/**
 * The business details: onboarding the first time, "פרטי העסק" afterwards. Appointment settings
 * (hours, meeting types, cancellation window) are their own page (ADR-0009); first-time onboarding
 * continues straight there.
 */
@Component({
  selector: 'feature-provider-settings-page',
  standalone: true,
  imports: [ReactiveFormsModule, UiButtonComponent, UiCardComponent, UiInputComponent],
  templateUrl: './provider-settings.page.html',
  styleUrl: './provider-settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderSettingsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly providerSettingsService = inject(ProviderSettingsService);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly actingContext = inject(ActingContextStore);
  private readonly onboardingSkip = inject(OnboardingSkipService);

  private readonly submitted = signal(false);

  /** Set when an Admin is acting for this Provider; null when the Provider edits their own settings. */
  protected readonly actingProviderId = this.actingContext.providerIdForRequest;
  protected readonly actingProviderName = this.actingContext.actingProviderName;

  protected readonly isEditing = signal(false);
  readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal(false);

  protected readonly title = computed(() => {
    if (this.isEditing()) {
      return 'פרטי העסק';
    }

    const name = this.actingProviderName();
    return name ? `הגדרת העסק של ${name}` : 'הגדרת העסק שלכם';
  });

  readonly form = new FormGroup({
    businessName: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(BUSINESS_NAME_MIN_LENGTH),
        Validators.maxLength(BUSINESS_NAME_MAX_LENGTH),
      ],
    }),
    clientLabel: new FormControl('לקוח', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(CLIENT_LABEL_MIN_LENGTH),
        Validators.maxLength(CLIENT_LABEL_MAX_LENGTH),
      ],
    }),
  });

  private readonly errors = fieldErrors(this.form, this.submitted);
  protected readonly businessNameError = this.errors('businessName');
  protected readonly clientLabelError = this.errors('clientLabel');

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.providerSettingsService
      .get(this.actingProviderId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.isEditing.set(true);
          this.form.patchValue({
            businessName: settings.businessName,
            clientLabel: settings.clientLabel,
          });
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);

          // Only a 404 means onboarding hasn't happened yet (keep the blank form). Anything else
          // must not offer the create form to a Provider who may well be onboarded already.
          if (!(error instanceof HttpErrorResponse && error.status === 404)) {
            this.loadFailed.set(true);
          }
        },
      });
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitError.set(null);
    this.submitSuccess.set(false);
    this.submitting.set(true);

    const payload = this.form.getRawValue();
    const wasEditing = this.isEditing();
    const providerId = this.actingProviderId();
    const request$ = wasEditing
      ? this.providerSettingsService.update(payload, providerId)
      : this.providerSettingsService.create(payload, providerId);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const user = this.sessionStore.user();

        // Only the Provider's own session carries their onboarding flag; an acting Admin's doesn't.
        if (user && !providerId) {
          this.sessionStore.updateUser({ ...user, hasCompletedOnboarding: true });
        }

        if (wasEditing) {
          this.submitting.set(false);
          this.submitSuccess.set(true);
          return;
        }

        // Next comes what's needed before opening the calendar: hours and meeting types.
        this.navigateInProviderArea('schedule-settings');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.submitError.set(toSubmitErrorMessage(error));
      },
    });
  }

  protected onCancel(): void {
    this.navigateInProviderArea();
  }

  /** Admin only: leave onboarding to the Provider's own first login (ADR-0004). */
  protected onSkip(): void {
    const providerId = this.actingProviderId();

    if (!providerId) {
      return;
    }

    this.onboardingSkip.skip(providerId);
    this.navigateInProviderArea();
  }

  private navigateInProviderArea(path = ''): void {
    const base = this.actingContext.providerBaseUrl() ?? '/provider';
    void this.router.navigateByUrl(path ? `${base}/${path}` : base);
  }
}

/** Backend messages stay English and never reach the user (ADR-0006). */
function toSubmitErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 400) {
    return 'חלק מהפרטים אינם תקינים. בדקו את השדות ונסו שוב.';
  }

  if (error instanceof HttpErrorResponse && error.status === 403) {
    return 'אין לך הרשאה לשנות את פרטי העסק האלה.';
  }

  return GENERIC_ERROR_MESSAGE;
}
