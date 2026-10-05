import {
  ChangeDetectionStrategy,
  Component,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { ActingContextService, providerAreaBaseUrl } from '@app/shared/acting-context';
import { homeRouteForRole } from '@app/shared/auth';
import { ROLE_LABELS } from '@app/shared/navigation';
import { AuthUser, PaginatedUsersResponse, Role, UserListItem } from '@app/shared/types';
import { UsersApiService } from '@app/shared/users';
import { UiAutocompleteComponent, UiAutocompleteOption } from '@app/ui/autocomplete';

const SEARCH_DEBOUNCE_MS = 250;
const OPTION_LIMIT = 10;

function toOption(user: AuthUser | UserListItem): UiAutocompleteOption {
  return {
    id: user.id,
    label: `${user.firstName} ${user.lastName}`,
    description: user.email,
  };
}

/**
 * Acting-on-behalf picker under the header (ADR-0005): `Admin › [Provider ▾] › [Client ▾]`.
 * It only navigates — the URL is the acting context, so every page follows automatically.
 */
@Component({
  selector: 'app-context-bar',
  standalone: true,
  imports: [RouterLink, UiAutocompleteComponent],
  templateUrl: './context-bar.component.html',
  styleUrl: './context-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextBarComponent {
  private readonly router = inject(Router);
  private readonly usersApi = inject(UsersApiService);
  private readonly actingContext = inject(ActingContextService);

  private readonly actorRole = computed(() => this.actingContext.actor()?.role ?? null);

  protected readonly visible = computed(
    () => this.actorRole() === Role.ADMIN || this.actorRole() === Role.PROVIDER,
  );
  protected readonly isAdmin = computed(() => this.actorRole() === Role.ADMIN);
  protected readonly actorLabel = computed(() => {
    const role = this.actorRole();
    return role ? ROLE_LABELS[role] : '';
  });
  protected readonly actorHomeUrl = computed(() => {
    const role = this.actorRole();
    return role ? homeRouteForRole(role) : '/';
  });

  protected readonly providerValue = computed(() => {
    const provider = this.actingContext.actingProvider();
    return provider ? toOption(provider) : null;
  });
  protected readonly clientValue = computed(() => {
    const client = this.actingContext.actingClient();
    return client ? toOption(client) : null;
  });
  /** An Admin has to pick a Provider before their Clients can be listed. */
  protected readonly clientPickerEnabled = computed(
    () => this.actingContext.providerBaseUrl() !== null,
  );

  protected readonly providerLoading = signal(false);
  protected readonly clientLoading = signal(false);

  private readonly providerSearch = new Subject<string>();
  private readonly clientSearch = new Subject<string>();

  protected readonly providerOptions = toSignal(
    this.providerSearch.pipe(
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
      switchMap((search) =>
        this.searchUsers(this.providerLoading, () =>
          this.usersApi.list({ role: Role.PROVIDER, search, limit: OPTION_LIMIT }),
        ),
      ),
    ),
    { initialValue: [] },
  );

  protected readonly clientOptions = toSignal(
    this.clientSearch.pipe(
      // Keyed by Provider too, so switching Provider re-runs the same search text.
      map((search) => ({ search, providerId: this.actingContext.routeProviderId() })),
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(
        (previous, current) =>
          previous.search === current.search && previous.providerId === current.providerId,
      ),
      switchMap(({ search, providerId }) =>
        this.searchUsers(this.clientLoading, () =>
          this.usersApi.list({ providerId: providerId ?? undefined, search, limit: OPTION_LIMIT }),
        ),
      ),
    ),
    { initialValue: [] },
  );

  protected onProviderSearch(search: string): void {
    this.providerSearch.next(search);
  }

  protected onClientSearch(search: string): void {
    this.clientSearch.next(search);
  }

  /** Switching Provider keeps the current Provider-area page; any Client selection is dropped. */
  protected onProviderSelected(option: UiAutocompleteOption): void {
    const currentProviderId = this.actingContext.routeProviderId();
    const nextBaseUrl = providerAreaBaseUrl(option.id);

    if (!currentProviderId) {
      this.router.navigateByUrl(nextBaseUrl);
      return;
    }

    const subPath = this.currentPath().slice(providerAreaBaseUrl(currentProviderId).length);
    this.router.navigateByUrl(nextBaseUrl + (subPath.startsWith('/clients/') ? '' : subPath));
  }

  protected onProviderCleared(): void {
    this.router.navigateByUrl('/admin');
  }

  /** Switching Client keeps the current Client-area page. */
  protected onClientSelected(option: UiAutocompleteOption): void {
    const providerBaseUrl = this.actingContext.providerBaseUrl();

    if (!providerBaseUrl) {
      return;
    }

    const currentClientBaseUrl = this.actingContext.routeClientId()
      ? this.actingContext.clientBaseUrl()
      : null;
    const subPath = currentClientBaseUrl
      ? this.currentPath().slice(currentClientBaseUrl.length)
      : '';

    this.router.navigateByUrl(`${providerBaseUrl}/clients/${option.id}${subPath}`);
  }

  protected onClientCleared(): void {
    const providerBaseUrl = this.actingContext.providerBaseUrl();

    if (providerBaseUrl) {
      this.router.navigateByUrl(providerBaseUrl);
    }
  }

  private searchUsers(
    loading: WritableSignal<boolean>,
    request: () => Observable<PaginatedUsersResponse>,
  ): Observable<UiAutocompleteOption[]> {
    loading.set(true);

    return request().pipe(
      map((response) => response.items.map(toOption)),
      catchError(() => of([])),
      tap(() => loading.set(false)),
    );
  }

  private currentPath(): string {
    return this.router.url.split(/[?#]/)[0];
  }
}
