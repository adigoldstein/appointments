import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ActingContextStore } from '@app/shared/acting-context';
import { LocalitiesApiService } from '@app/shared/api';
import {
  AuthUser,
  CreateUserRequest,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  Role,
  UpdateUserRequest,
} from '@app/shared/types';
import { UsersApiService } from '@app/shared/users';
import { PASSWORD_FIELD_ERROR_MESSAGES, debouncedSearch, fieldErrors } from '@app/shared/utils';
import { UiAutocompleteComponent, UiAutocompleteOption } from '@app/ui/autocomplete';
import { UiButtonComponent } from '@app/ui/button';
import { UiCardComponent } from '@app/ui/card';
import { UiIconComponent } from '@app/ui/icons';
import { UiInputComponent } from '@app/ui/input';
import {
  CREATE_USER_FAILURE_MESSAGES,
  EDIT_USER_FAILURE_MESSAGES,
  toCreateUserFailure,
} from './create-user-error';
import type { CreateUserFailure } from './create-user-error.types';
import type { NewUserRole, UserFormLoadState, UserFormMode } from './user-form.types';
import type { UsersListNavigationState } from './users-list.types';

const MODES: readonly UserFormMode[] = ['client', 'admin', 'edit-client', 'edit-provider'];

/** Optional; same rule as the backend: `05XXXXXXXX`, spaces and dashes allowed between digits. */
function israeliMobileValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value?.trim() ?? '';
  return value === '' || /^05\d{8}$/.test(value.replace(/[\s-]/g, ''))
    ? null
    : { israeliMobile: true };
}

/** A resource wraps errors that aren't `Error`s (like HttpErrorResponse) in `cause`. */
function httpStatus(error: unknown): number | null {
  const cause = error instanceof HttpErrorResponse ? error : (error as { cause?: unknown }).cause;
  return cause instanceof HttpErrorResponse ? cause.status : null;
}

/**
 * Adds or edits a Provider or a Client (ADR-0004/0005, docs/plans/edit-user.md).
 *
 * Create: `/provider/clients/new`, `/admin/provider/clients/new` (both `client` mode) and
 * `/admin/users/new` (`admin` mode). A new Client always belongs to the Provider the screen works
 * on: the Provider themselves, or the one selected in the context bar.
 *
 * Edit: `/provider/clients/:userId/edit`, `/admin/provider/clients/:userId/edit` (`edit-client`)
 * and `/admin/providers/:userId/edit` (`edit-provider`). No password and no role here; saving
 * sends only the changed fields and returns to the list.
 */
@Component({
  selector: 'feature-user-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    UiAutocompleteComponent,
    UiButtonComponent,
    UiCardComponent,
    UiIconComponent,
    UiInputComponent,
  ],
  templateUrl: './user-form.page.html',
  styleUrl: './user-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersApi = inject(UsersApiService);
  private readonly localitiesApi = inject(LocalitiesApiService);
  private readonly actingContext = inject(ActingContextStore);

  protected readonly Role = Role;
  protected readonly mode: UserFormMode = MODES.includes(this.route.snapshot.data['mode'])
    ? this.route.snapshot.data['mode']
    : 'client';
  protected readonly isEdit = this.mode === 'edit-client' || this.mode === 'edit-provider';

  /** Edit only: the list this page was opened from, i.e. this URL without `/<userId>/edit`. */
  protected readonly listUrl =
    '/' +
    this.route.snapshot.pathFromRoot
      .flatMap((snapshot) => snapshot.url.map((segment) => segment.path))
      .slice(0, -2)
      .join('/');
  protected readonly backLabel =
    this.mode === 'edit-provider' ? 'חזרה לנותני שירות' : 'חזרה ללקוחות';

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

  /** Edit only: the user being edited (idle in create mode). */
  protected readonly editedUser = rxResource({
    params: () => (this.isEdit ? (this.route.snapshot.paramMap.get('userId') ?? undefined) : undefined),
    stream: ({ params: userId }) => this.usersApi.get(userId),
  });

  protected readonly loadState = computed<UserFormLoadState>(() => {
    if (!this.isEdit) {
      return 'ready';
    }

    const error = this.editedUser.error();

    if (error) {
      // 400: the id in the URL isn't a valid id at all; retrying can't help.
      const status = httpStatus(error);
      return status === 400 || status === 403 || status === 404 ? 'not-found' : 'error';
    }

    const user = this.editedUser.hasValue() ? this.editedUser.value() : undefined;

    if (this.editedUser.isLoading() || !user) {
      return 'loading';
    }

    return this.belongsHere(user) ? 'ready' : 'not-found';
  });

  /** The selected Provider's name when an Admin works on one; null for a Provider's own screen. */
  private readonly selectedProviderName = computed(() =>
    this.actingContext.actor()?.role === Role.ADMIN
      ? (this.actingContext.selectedProvider()?.name ?? null)
      : null,
  );

  /** An Admin adding a Client must first pick that Client's Provider in the context bar. */
  protected readonly missingProvider = computed(
    () =>
      !this.isEdit &&
      this.role() === Role.CLIENT &&
      this.actingContext.actor()?.role === Role.ADMIN &&
      !this.actingContext.providerIdForRequest(),
  );

  protected readonly title = computed(() => {
    switch (this.mode) {
      case 'admin':
        return 'הוספת משתמש';
      case 'edit-client':
        return 'עריכת לקוח';
      case 'edit-provider':
        return 'עריכת נותן שירות';
      default:
        return 'הוספת לקוח';
    }
  });

  protected readonly subtitle = computed(() => {
    if (this.isEdit) {
      return null;
    }

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
    const messages = this.isEdit ? EDIT_USER_FAILURE_MESSAGES : CREATE_USER_FAILURE_MESSAGES;
    return failure && failure.kind !== 'reactivatable' ? messages[failure.kind] : null;
  });

  private readonly errors = fieldErrors(this.form, this.submitted);
  protected readonly firstNameError = this.errors('firstName');
  protected readonly lastNameError = this.errors('lastName');
  protected readonly emailError = this.errors('email');
  protected readonly passwordError = this.errors('password', PASSWORD_FIELD_ERROR_MESSAGES);
  protected readonly phoneError = this.errors('phone');

  constructor() {
    if (this.isEdit) {
      // Not shown and not sent: passwords are changed elsewhere (later plan).
      this.form.controls.password.disable();
    }

    effect(() => {
      const user = this.loadState() === 'ready' ? this.editedUser.value() : undefined;

      if (user) {
        untracked(() => this.fillForm(user));
      }
    });
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.successMessage.set(null);
    this.failure.set(null);

    if (this.form.invalid || this.missingProvider() || this.submitting()) {
      return;
    }

    if (this.isEdit) {
      this.saveChanges();
    } else {
      this.createUser();
    }
  }

  protected onCancel(): void {
    this.backToList();
  }

  protected onRetryLoad(): void {
    this.editedUser.reload();
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

  private createUser(): void {
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

  private saveChanges(): void {
    const user = this.editedUser.hasValue() ? this.editedUser.value() : undefined;

    if (!user || this.loadState() !== 'ready') {
      return;
    }

    const changes = this.changesFrom(user);

    if (Object.keys(changes).length === 0) {
      this.backToList(this.savedNotice(user));
      return;
    }

    this.submitting.set(true);
    this.usersApi
      .update(user.id, changes)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.submitting.set(false);
          this.backToList(this.savedNotice(saved));
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.failure.set(toCreateUserFailure(error));
        },
      });
  }

  /** Only what differs from the loaded user; `phone: ''` and `cityId: null` clear those fields. */
  private changesFrom(user: AuthUser): UpdateUserRequest {
    const { firstName, lastName, email, phone, city } = this.form.getRawValue();
    const cityId = city ? Number(city.id) : null;
    const changes: UpdateUserRequest = {};

    if (firstName.trim() !== user.firstName) {
      changes.firstName = firstName.trim();
    }

    if (lastName.trim() !== user.lastName) {
      changes.lastName = lastName.trim();
    }

    if (email.trim() !== user.email) {
      changes.email = email.trim();
    }

    // The backend stores the phone compact (`05XXXXXXXX`).
    if (phone.replace(/[\s-]/g, '') !== (user.phone ?? '')) {
      changes.phone = phone.trim();
    }

    if (cityId !== (user.city?.cityId ?? null)) {
      changes.cityId = cityId;
    }

    return changes;
  }

  /** The URL is for this list's kind of user only: a Client of the Provider on screen, or a Provider. */
  private belongsHere(user: AuthUser): boolean {
    if (this.mode === 'edit-provider') {
      return user.role === Role.PROVIDER;
    }

    const providerId =
      this.actingContext.providerIdForRequest() ?? this.actingContext.actor()?.id ?? null;
    return user.role === Role.CLIENT && user.providerId === providerId;
  }

  private fillForm(user: AuthUser): void {
    this.form.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? '',
      city: user.city ? { id: String(user.city.cityId), label: user.city.hebrewName } : null,
    });
  }

  private savedNotice(user: AuthUser): string {
    return `הפרטים של ${user.firstName} ${user.lastName} נשמרו.`;
  }

  private backToList(notice?: string): void {
    const state: UsersListNavigationState = notice ? { notice } : {};
    void this.router.navigateByUrl(this.listUrl, { state });
  }

  /** Ready for the next user; the chosen role stays. */
  private resetForm(): void {
    this.form.reset();
    this.submitted.set(false);
    this.cityQuery.set('');
  }
}
