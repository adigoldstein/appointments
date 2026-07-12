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
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { merge } from 'rxjs';
import {
  AUTH_PASSWORD_ERROR_MESSAGES,
  EMAIL_FIELD_ERROR_MESSAGES,
  authPasswordValidators,
  emailFieldValidators,
  getSubmittedFieldError,
} from '@app/shared/utils';
import { AuthStorageService, homeRouteForRole } from '@app/shared/auth';
import { UiButtonComponent } from '@app/ui/button';
import { UiCardComponent } from '@app/ui/card';
import { UiInputComponent } from '@app/ui/input';
import { AuthService } from '../login.service';

const LOGIN_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  401: 'אימייל או סיסמה שגויים.',
  429: 'יותר מדי ניסיונות התחברות. נסו שוב בעוד דקה.',
};
const GENERIC_LOGIN_ERROR = 'אירעה שגיאה. נסו שוב מאוחר יותר.';

@Component({
  selector: 'feature-auth-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    UiButtonComponent,
    UiCardComponent,
    UiInputComponent,
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly authStorage = inject(AuthStorageService);
  private readonly router = inject(Router);

  private submitted = false;

  readonly submitting = signal(false);
  readonly loginError = signal<string | null>(null);

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: emailFieldValidators(),
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: authPasswordValidators(),
    }),
  });

  ngOnInit(): void {
    merge(this.form.statusChanges, this.form.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());
  }

  emailError(): string | null {
    return getSubmittedFieldError(
      this.submitted,
      this.form.controls.email.errors,
      EMAIL_FIELD_ERROR_MESSAGES,
    );
  }

  passwordError(): string | null {
    return getSubmittedFieldError(
      this.submitted,
      this.form.controls.password.errors,
      AUTH_PASSWORD_ERROR_MESSAGES,
    );
  }

  onSubmit(): void {
    this.submitted = true;
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.loginError.set(null);
    this.submitting.set(true);

    this.authService
      .login(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this.authStorage.setSession(session);
          this.router.navigateByUrl(homeRouteForRole(session.user.role));
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.loginError.set(LOGIN_ERROR_MESSAGES[error.status] ?? GENERIC_LOGIN_ERROR);
        },
      });
  }
}
