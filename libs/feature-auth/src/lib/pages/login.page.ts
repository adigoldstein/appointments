import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  GENERIC_ERROR_MESSAGE,
  PASSWORD_FIELD_ERROR_MESSAGES,
  authPasswordValidators,
  emailFieldValidators,
  fieldErrors,
} from '@app/shared/utils';
import { SessionStore, homeRouteForRole } from '@app/shared/auth';
import { UiButtonComponent } from '@app/ui/button';
import { UiCardComponent } from '@app/ui/card';
import { UiInputComponent } from '@app/ui/input';
import { AuthService } from '../login.service';

const LOGIN_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  401: 'אימייל או סיסמה שגויים.',
  429: 'יותר מדי ניסיונות התחברות. נסו שוב בעוד דקה.',
};

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
export class LoginPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  private readonly submitted = signal(false);

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

  private readonly errors = fieldErrors(this.form, this.submitted);
  readonly emailError = this.errors('email');
  readonly passwordError = this.errors('password', PASSWORD_FIELD_ERROR_MESSAGES);

  onSubmit(): void {
    this.submitted.set(true);
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
          this.sessionStore.setSession(session);
          this.router.navigateByUrl(homeRouteForRole(session.user.role));
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.loginError.set(LOGIN_ERROR_MESSAGES[error.status] ?? GENERIC_ERROR_MESSAGE);
        },
      });
  }
}
