import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, map, of, tap } from 'rxjs';
import { ActingContextStore } from '@app/shared/acting-context';
import { PaginatedUsersResponse, Role, UserListItem } from '@app/shared/types';
import { UsersApiService } from '@app/shared/users';
import { SEARCH_DEBOUNCE_MS } from '@app/shared/utils';
import { UiBadgeComponent } from '@app/ui/badge';
import { UiButtonComponent } from '@app/ui/button';
import { UiIconComponent } from '@app/ui/icons';
import { UiInputComponent } from '@app/ui/input';
import { UiModalComponent } from '@app/ui/modal';
import { UiPaginationComponent } from '@app/ui/pagination';
import type { RowActionError, StatusFilter } from './users-list.types';

const PAGE_SIZE = 20;
const SKELETON_ROWS = [1, 2, 3, 4, 5];

export const STATUS_FILTER_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'הכל' },
  { value: 'active', label: 'פעילים' },
  { value: 'inactive', label: 'לא פעילים' },
];

/** `0501234567` → `050-1234567`; anything else is shown as stored. */
function formatPhone(phone: string | null): string | null {
  return phone && /^05\d{8}$/.test(phone) ? `${phone.slice(0, 3)}-${phone.slice(3)}` : phone;
}

/**
 * The Clients of the Provider on screen (the Provider themselves, or the one selected in the
 * context bar), with search, status filter, paging and deactivate / reactivate per row
 * (docs/plans/client-list.md, steps 3-6). Deactivating asks for confirmation; reactivating doesn't.
 *
 * Each (search, status, page) response is cached until users change in this tab, so going back
 * to a combination already seen costs no request.
 */
@Component({
  selector: 'feature-users-list-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    UiBadgeComponent,
    UiButtonComponent,
    UiIconComponent,
    UiInputComponent,
    UiModalComponent,
    UiPaginationComponent,
  ],
  templateUrl: './users-list.page.html',
  styleUrl: './users-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListPageComponent {
  private readonly usersApi = inject(UsersApiService);
  private readonly actingContext = inject(ActingContextStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statusOptions = STATUS_FILTER_OPTIONS;
  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly formatPhone = formatPhone;

  /** Read once: the shell re-creates this page when the selected Provider changes (ADR-0005). */
  private readonly providerId = this.actingContext.providerIdForRequest();

  /** Set when an Admin works on a selected Provider, so the title says whose Clients these are. */
  protected readonly providerName =
    this.actingContext.actor()?.role === Role.ADMIN
      ? (this.actingContext.selectedProvider()?.name ?? null)
      : null;

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly searchText = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(SEARCH_DEBOUNCE_MS),
      map((text) => text.trim()),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );
  protected readonly statusFilter = signal<StatusFilter>('all');
  /** Back to page 1 whenever the search or the filter changes. */
  protected readonly page = linkedSignal({
    source: () => ({ search: this.searchText(), status: this.statusFilter() }),
    computation: () => 1,
  });

  private readonly cache = new Map<string, PaginatedUsersResponse>();

  protected readonly users = rxResource({
    params: () => ({ search: this.searchText(), status: this.statusFilter(), page: this.page() }),
    stream: ({ params }) => {
      const key = JSON.stringify(params);
      const cached = this.cache.get(key);

      if (cached) {
        return of(cached);
      }

      return this.usersApi
        .list({
          page: params.page,
          limit: PAGE_SIZE,
          search: params.search || undefined,
          status: params.status === 'all' ? undefined : params.status,
          providerId: this.providerId ?? undefined,
        })
        .pipe(tap((response) => this.cache.set(key, response)));
    },
  });

  protected readonly items = computed<readonly UserListItem[]>(
    () => this.users.value()?.items ?? [],
  );
  protected readonly total = computed(() => this.users.value()?.total ?? 0);
  protected readonly totalPages = computed(() => Math.ceil(this.total() / PAGE_SIZE));
  protected readonly isFiltered = computed(
    () => this.searchText() !== '' || this.statusFilter() !== 'all',
  );

  protected readonly view = computed<'loading' | 'error' | 'empty' | 'no-results' | 'list'>(() => {
    if (this.users.error()) {
      return 'error';
    }

    if (!this.users.hasValue()) {
      return 'loading';
    }

    if (this.total() === 0) {
      return this.isFiltered() ? 'no-results' : 'empty';
    }

    return 'list';
  });

  protected readonly countLabel = computed(() => {
    const total = this.total();

    if (this.isFiltered()) {
      return total === 1 ? 'נמצא לקוח אחד' : `נמצאו ${total} לקוחות`;
    }

    return total === 1 ? 'לקוח אחד' : `${total} לקוחות`;
  });

  constructor() {
    // Any add / (de)activation in this tab makes cached pages stale.
    this.usersApi.usersChanged$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.cache.clear();
      this.users.reload();
    });
  }

  protected onAddClient(): void {
    this.router.navigateByUrl(`${this.actingContext.providerBaseUrl() ?? '/provider'}/clients/new`);
  }

  protected onClearFilters(): void {
    this.searchControl.setValue('');
    this.statusFilter.set('all');
  }

  protected onRetry(): void {
    this.users.reload();
  }

  /** The user whose deactivation waits for confirmation; null when the dialog is closed. */
  protected readonly confirmTarget = signal<UserListItem | null>(null);
  protected readonly confirmTitle = computed(() => {
    const user = this.confirmTarget();
    return user ? `להשבית את ${this.fullName(user)}?` : '';
  });
  /** The row whose action is running (its button shows a loading state). */
  protected readonly pendingUserId = signal<string | null>(null);
  protected readonly rowError = signal<RowActionError | null>(null);
  /** Result of the last action, announced politely to screen readers. */
  protected readonly statusMessage = signal<string | null>(null);

  protected fullName(user: UserListItem): string {
    return `${user.firstName} ${user.lastName}`;
  }

  protected onAskDeactivate(user: UserListItem): void {
    this.rowError.set(null);
    this.confirmTarget.set(user);
  }

  protected onCancelDeactivate(): void {
    this.confirmTarget.set(null);
  }

  protected onConfirmDeactivate(): void {
    const user = this.confirmTarget();

    if (user) {
      this.setActive(user, false);
    }
  }

  protected onReactivate(user: UserListItem): void {
    this.setActive(user, true);
  }

  /** The list refreshes by itself afterwards: the API announces the change (usersChanged$). */
  private setActive(user: UserListItem, active: boolean): void {
    if (this.pendingUserId()) {
      return;
    }

    this.pendingUserId.set(user.id);
    this.rowError.set(null);
    this.statusMessage.set(null);

    this.usersApi
      .setDeactivated(user.id, !active)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pendingUserId.set(null);
          this.confirmTarget.set(null);
          this.statusMessage.set(
            active
              ? `החשבון של ${this.fullName(user)} הופעל מחדש.`
              : `החשבון של ${this.fullName(user)} הושבת.`,
          );
        },
        error: (error: unknown) => {
          this.pendingUserId.set(null);
          this.confirmTarget.set(null);
          this.rowError.set({
            userId: user.id,
            message:
              error instanceof HttpErrorResponse && error.status === 403
                ? 'אין לך הרשאה לשנות את הסטטוס של משתמש זה.'
                : active
                  ? 'לא הצלחנו להפעיל מחדש. נסו שוב.'
                  : 'לא הצלחנו להשבית. נסו שוב.',
          });
        },
      });
  }
}
