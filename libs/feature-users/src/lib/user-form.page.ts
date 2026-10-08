import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { ActingContextStore } from '@app/shared/acting-context';
import { LocalitiesApiService } from '@app/shared/api';
import {
  CreateUserRequest,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  Role,
} from '@app/shared/types';
import { UsersApiService } from '@app/shared/users';
import { PASSWORD_FIELD_ERROR_MESSAGES, debouncedSearch, fieldErrors } from '@app/shared/utils';
import { UiAutocompleteComponent, UiAutocompleteOption } from '@app/ui/autocomplete';
import { UiButtonComponent } from '@app/ui/button';
import { UiCardComponent } from '@app/ui/card';
import { UiInputComponent } from '@app/ui/input';
import { CREATE_USER_FAILURE_MESSAGES, toCreateUserFailure } from './create-user-error';
import type { CreateUserFailure } from './create-user-error.types';
import type { NewUserRole, UserFormMode } from './user-form.types';

/** Optional; same rule as the backend: `05XXXXXXXX`, spaces and dashes allowed between digits. */
function israeliMobileValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value?.trim() ?? '';
  return value === '' || /^05\d{8}$/.test(value.replace(/[\s-]/g, ''))
    ? null
    : { israeliMobile: true };
}

/**
 * Adds a Provider or a Client (ADR-0004/0005). Mounted at `/provider/clients/new`,
 * `/admin/provider/clients/new` (both `client` mode) and `/admin/users/new` (`admin` mode).
 * A new Client always belongs to the Provider the screen works on: the Provider themselves,
 * or the one selected in the context bar.
 */
@Component({
  selector: 'feature-user-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    UiAutocompleteComponent,
    UiButtonComponent,
    UiCardComponent,
    UiInputComponent,
  ],
  templateUrl: './user-form.page.html',
  styleUrl: './user-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly usersApi = inject(UsersApiService);
  private readonly localitiesApi = inject(LocalitiesApiService);
  private readonly actingContext = inject(ActingContextStore);

  protected readonly Role = Role;
  protected readonly mode: UserFormMode =
    inject(ActivatedRoute).snapshot.data['mode'] === 'admin' ? 'admin' : 'client';

  protected readonly roleControl = new FormControl<NewUserRole>(
    this.mode === 'admin' ? Role.PROVIDER : Role.CLIENT,
    { nonNullable: true },
  );
  private readonly role = toSignal(this.roleControl.valueChanges, {
    initialValue: this.roleControl.value,
  });

  readonly form = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(PASSWORD_MIN_LENGTH),
        Validators.maxLength(PASSWORD_MAX_LENGTH),
        Validators.pattern(PASSWORD_PATTERN),
      ],
    }),
    phone: new FormControl('', { nonNullable: true, validators: [israeliMobileValidator] }),
    city: new FormControl<UiAutocompleteOption | null>(null),
  });

  protected readonly cityQuery = signal('');
  protected readonly cities = debouncedSearch(this.cityQuery, (search) =>
    this.localitiesApi
      .search(search)
      .pipe(
        map((localities) =>
          localities.map((locality) => ({
            id: String(locality.cityId),
            label: locality.hebrewName,
          })),
        ),
      ),
  );

  /** The selected Provider's name when an Admin works on one; null for a Provider's own screen. */
  private readonly selectedProviderName = computed(() =>
    this.actingContext.actor()?.role === Role.ADMIN
      ? (this.actingContext.selectedProvider()?.name ?? null)
      : null,
  );

  /** An Admin adding a Client must first pick that Client's Provider in the context bar. */
  protected readonly missingProvider = computed(
    () =>
      this.role() === Role.CLIENT &&
      this.actingContext.actor()?.role === Role.ADMIN &&
      !this.actingContext.providerIdForRequest(),
  );

  protected readonly title = computed(() =>
    this.mode === 'admin' ? 'הוספת משתמש' : 'הוספת לקוח',
  );

  protected readonly subtitle = computed(() => {
    if (this.role() === Role.PROVIDER) {
      return 'נותן השירות יוכל להתחבר מיד ולהשלים את הגדרות העסק שלו.';
    }

    const providerName = this.selectedProviderName();

    if (providerName) {
      return `הלקוח יצורף ללקוחות של ${providerName}.`;
    }

    return this.actingContext.actor()?.role === Role.ADMIN
      ? 'הלקוח יצורף לנותן השירות שתבחרו בסרגל העליון.'
      : 'הלקוח יצורף ללקוחות שלכם.';
  });

  private readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly failure = signal<CreateUserFailure | null>(null);
  protected readonly reactivating = signal(false);

  protected readonly failureMessage = computed(() => {
    const failure = this.failure();
    return failure && failure.kind !== 'reactivatable'
      ? CREATE_USER_FAILURE_MESSAGES[failure.kind]
      : null;
  });

  private readonly errors = fieldErrors(this.form, this.submitted);
  protected readonly firstNameError = this.errors('firstName');
  protected readonly lastNameError = this.errors('lastName');
  protected readonly emailError = this.errors('email');
  protected readonly passwordError = this.errors('password', PASSWORD_FIELD_ERROR_MESSAGES);
  protected readonly phoneError = this.errors('phone');

  protected onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.successMessage.set(null);
    this.failure.set(null);

    if (this.form.invalid || this.missingProvider() || this.submitting()) {
      return;
    }

    const { firstName, lastName, email, password, phone, city } = this.form.getRawValue();
    const role = this.roleControl.value;
    const providerId = role === Role.CLIENT ? this.actingContext.providerIdForRequest() : null;
    const payload: CreateUserRequest = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      role,
      ...(providerId ? { providerId } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(city ? { cityId: Number(city.id) } : {}),
    };

    this.submitting.set(true);
    this.usersApi
      .create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.submitting.set(false);
          this.successMessage.set(`${user.firstName} ${user.lastName} נוסף/ה בהצלחה.`);
          this.resetForm();
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.failure.set(toCreateUserFailure(error));
        },
      });
  }

  /** The email belongs to a deactivated account the actor may restore — restore it as it was. */
  protected onReactivate(): void {
    const failure = this.failure();

    if (failure?.kind !== 'reactivatable' || this.reactivating()) {
      return;
    }

    this.reactivating.set(true);
    this.usersApi
      .setDeactivated(failure.userId, false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.reactivating.set(false);
          this.failure.set(null);
          this.successMessage.set(`החשבון של ${user.firstName} ${user.lastName} הופעל מחדש.`);
          this.resetForm();
        },
        error: () => {
          this.reactivating.set(false);
          this.failure.set({ kind: 'unknown' });
        },
      });
  }

  protected onDismissReactivate(): void {
    this.failure.set(null);
  }

  /** Ready for the next user; the chosen role stays. */
  private resetForm(): void {
    this.form.reset();
    this.submitted.set(false);
    this.cityQuery.set('');
  }
}
