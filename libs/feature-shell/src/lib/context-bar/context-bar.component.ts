import {
  ChangeDetectionStrategy,
  Component,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { ActingContextStore, ActingSelection } from '@app/shared/acting-context';
import { Role, UserListItem, PaginatedUsersResponse } from '@app/shared/types';
import { UsersApiService } from '@app/shared/users';
import { UiAutocompleteComponent, UiAutocompleteOption } from '@app/ui/autocomplete';

const SEARCH_DEBOUNCE_MS = 250;
const OPTION_LIMIT = 10;

function toOption(user: UserListItem): UiAutocompleteOption {
  return {
    id: user.id,
    label: `${user.firstName} ${user.lastName}`,
    description: user.email,
  };
}

function toOptionFromSelection(selection: ActingSelection | null): UiAutocompleteOption | null {
  return selection
    ? { id: selection.id, label: selection.name, description: selection.email }
    : null;
}

function toSelection(option: UiAutocompleteOption): ActingSelection {
  return { id: option.id, name: option.label, email: option.description ?? '' };
}

/**
 * Acting-on-behalf picker under the header (ADR-0005). Picking only sets the selection state —
 * it never navigates; the page on screen follows the new target in place.
 */
@Component({
  selector: 'app-context-bar',
  standalone: true,
  imports: [UiAutocompleteComponent],
  templateUrl: './context-bar.component.html',
  styleUrl: './context-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextBarComponent {
  private readonly usersApi = inject(UsersApiService);
  private readonly actingContext = inject(ActingContextStore);

  private readonly actorRole = computed(() => this.actingContext.actor()?.role ?? null);

  protected readonly visible = computed(
    () => this.actorRole() === Role.ADMIN || this.actorRole() === Role.PROVIDER,
  );
  protected readonly isAdmin = computed(() => this.actorRole() === Role.ADMIN);

  protected readonly providerValue = computed(() =>
    toOptionFromSelection(this.actingContext.selectedProvider()),
  );
  protected readonly clientValue = computed(() =>
    toOptionFromSelection(this.actingContext.selectedClient()),
  );

  /** "פועל עבור: …" — who the screen is working on, or null when the actor works as themselves. */
  protected readonly actingFor = computed(() => {
    const names = [
      this.isAdmin() ? this.actingContext.selectedProvider()?.name : null,
      this.actingContext.selectedClient()?.name,
    ].filter((name): name is string => !!name);

    return names.length ? names.join(' ‹ ') : null;
  });

  /** An Admin has to pick a Provider before their Clients can be listed. */
  protected readonly clientPickerEnabled = computed(() => this.actingContext.providerId() !== null);

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
      map((search) => ({ search, providerId: this.actingContext.providerIdForRequest() })),
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

  protected onProviderSelected(option: UiAutocompleteOption): void {
    this.actingContext.selectProvider(toSelection(option));
  }

  protected onProviderCleared(): void {
    this.actingContext.clearProvider();
  }

  protected onClientSelected(option: UiAutocompleteOption): void {
    this.actingContext.selectClient(toSelection(option));
  }

  protected onClientCleared(): void {
    this.actingContext.clearClient();
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
}
