import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { ActingContextStore, ActingSelection } from '@app/shared/acting-context';
import { Role, UserListItem } from '@app/shared/types';
import { UsersApiService } from '@app/shared/users';
import { debouncedSearch } from '@app/shared/utils';
import { UiAutocompleteComponent, UiAutocompleteOption } from '@app/ui/autocomplete';

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

  protected readonly providerQuery = signal('');
  protected readonly clientQuery = signal('');

  protected readonly providerSearch = debouncedSearch(
    this.providerQuery,
    (search) =>
      this.isAdmin()
        ? this.usersApi
            .list({ role: Role.PROVIDER, search, limit: OPTION_LIMIT })
            .pipe(map((response) => response.items.map(toOption)))
        : null,
    { dependsOn: this.isAdmin },
  );

  protected readonly clientSearch = debouncedSearch(
    this.clientQuery,
    (search) =>
      this.clientPickerEnabled()
        ? this.usersApi
            .list({
              providerId: this.actingContext.providerIdForRequest() ?? undefined,
              search,
              limit: OPTION_LIMIT,
            })
            .pipe(map((response) => response.items.map(toOption)))
        : null,
    // Switching Provider re-runs the same search text against the new Provider's Clients.
    { dependsOn: this.actingContext.providerId },
  );

  protected onProviderChange(option: UiAutocompleteOption | null): void {
    if (option) {
      this.actingContext.selectProvider(toSelection(option));
    } else {
      this.actingContext.clearProvider();
    }
  }

  protected onClientChange(option: UiAutocompleteOption | null): void {
    if (option) {
      this.actingContext.selectClient(toSelection(option));
    } else {
      this.actingContext.clearClient();
    }
  }
}
