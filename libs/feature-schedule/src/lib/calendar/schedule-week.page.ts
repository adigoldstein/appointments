import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ActingContextStore } from '@app/shared/acting-context';
import { ScheduleApiService, ScheduleStore, israelToday } from '@app/shared/schedule';
import { ExtraWindow, OpeningResponse, addDays, weekStartOf } from '@app/shared/types';
import { GENERIC_ERROR_MESSAGE } from '@app/shared/utils';
import { UiButtonComponent } from '@app/ui/button';
import { UiIconComponent } from '@app/ui/icons';
import { UiModalComponent } from '@app/ui/modal';
import {
  clockTime,
  isolatedTimeRange,
  shortDate,
  timeRange,
  weekRangeLabel,
  weekdayShortName,
} from './calendar-format';
import type { ExtraWindowTarget } from './calendar.types';
import { DayAgendaComponent } from './day-agenda.component';
import { ExtraWindowDialogComponent } from './extra-window-dialog.component';
import { OpeningDialogComponent } from './opening-dialog.component';
import { WeekGridComponent } from './week-grid.component';

/**
 * "יומן" (plan step 5): the Provider's week. A grid on wide screens, one day at a time on narrow
 * ones (the layout follows the page's own width). Data comes through ScheduleStore, so coming back
 * to a week costs no request; "רענון" drops the cache and loads again. From here the Provider opens
 * the calendar for booking, adds one-off extra windows and removes them (the dialogs are deferred).
 */
@Component({
  selector: 'feature-schedule-week-page',
  standalone: true,
  imports: [
    DayAgendaComponent,
    ExtraWindowDialogComponent,
    OpeningDialogComponent,
    RouterLink,
    UiButtonComponent,
    UiIconComponent,
    UiModalComponent,
    WeekGridComponent,
  ],
  templateUrl: './schedule-week.page.html',
  styleUrl: './schedule-week.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleWeekPageComponent {
  private readonly store = inject(ScheduleStore);
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly actingContext = inject(ActingContextStore);

  /**
   * Israel's date, whatever the browser's time zone. Read again on refresh, when a dialog opens
   * and after every change, so a tab left open overnight doesn't act on yesterday.
   */
  protected readonly today = signal(israelToday());
  protected readonly weekStart = signal(weekStartOf(this.today()));
  protected readonly weekEnd = computed(() => addDays(this.weekStart(), 6));
  protected readonly weekLabel = computed(() => weekRangeLabel(this.weekStart(), this.weekEnd()));
  protected readonly isCurrentWeek = computed(() => this.weekStart() === weekStartOf(this.today()));
  protected readonly actingProviderName = this.actingContext.actingProviderName;

  // The Provider is part of the params (not only the store's scope), so switching Provider
  // reloads even if the page itself is kept.
  protected readonly week = rxResource({
    params: () => ({ weekStart: this.weekStart(), providerId: this.actingContext.providerIdForRequest() }),
    stream: ({ params }) => this.store.week(params.weekStart),
  });

  protected readonly opening = rxResource({
    params: () => ({ providerId: this.actingContext.providerIdForRequest() }),
    stream: () => this.store.opening(),
  });

  /**
   * The last loaded opening info, kept while a reload is on its way, so the header and an open
   * dialog don't blink away. A Provider switch closes the dialogs (below), so it never carries over.
   */
  protected readonly openingInfo = linkedSignal<OpeningResponse | null, OpeningResponse | null>({
    source: () => (this.opening.hasValue() ? this.opening.value().value : null),
    computation: (next, previous) => next ?? previous?.value ?? null,
  });

  /** 404: no business details yet (an Admin may have skipped onboarding for this Provider). */
  protected readonly notOnboarded = computed(() => {
    const error = this.week.error();
    const cause = error instanceof HttpErrorResponse ? error : (error as { cause?: unknown } | undefined)?.cause;
    return cause instanceof HttpErrorResponse && cause.status === 404;
  });

  protected readonly businessDetailsUrl = computed(
    () => `${this.actingContext.providerBaseUrl() ?? '/provider'}/settings`,
  );

  protected readonly days = computed(() => (this.week.hasValue() ? this.week.value().value : []));

  /** Narrow screens show one day: today in the current week, otherwise the week's Sunday. */
  protected readonly selectedDate = linkedSignal(() => {
    const start = this.weekStart();
    const today = this.today();
    return today >= start && today <= addDays(start, 6) ? today : start;
  });
  protected readonly selectedDay = computed(
    () => this.days().find((day) => day.date === this.selectedDate()) ?? null,
  );

  protected readonly updatedAt = computed(() =>
    this.week.hasValue() ? clockTime(this.week.value().loadedAt) : null,
  );

  protected readonly openUntilLabel = computed(() => {
    const info = this.openingInfo();

    if (!info) {
      return null;
    }

    if (!info.openUntil) {
      return 'עוד לא נפתחו תורים להזמנה.';
    }

    return info.openUntil >= this.today()
      ? `פתוח להזמנות עד ${shortDate(info.openUntil)}`
      : `התקופה הפתוחה להזמנות הסתיימה ב-${shortDate(info.openUntil)}.`;
  });

  /** The dialogs are `@defer`red: their code loads the first time one is opened. */
  protected readonly openingDialogOpen = signal(false);
  protected readonly extraWindowDialogOpen = signal(false);
  protected readonly removeTarget = signal<ExtraWindowTarget | null>(null);
  protected readonly removing = signal(false);
  protected readonly removeError = signal<string | null>(null);
  /** The result of the last change, announced politely; cleared by the next action. */
  protected readonly statusMessage = signal<string | null>(null);

  protected readonly weekdayShortName = weekdayShortName;
  protected readonly shortDate = shortDate;
  protected readonly timeRange = timeRange;

  constructor() {
    // Another Provider on screen: nothing open belongs to them.
    effect(() => {
      this.actingContext.providerIdForRequest();
      untracked(() => {
        this.openingDialogOpen.set(false);
        this.extraWindowDialogOpen.set(false);
        this.removeTarget.set(null);
        this.statusMessage.set(null);
      });
    });
  }

  protected onPreviousWeek(): void {
    this.statusMessage.set(null);
    this.weekStart.update((start) => addDays(start, -7));
  }

  protected onNextWeek(): void {
    this.statusMessage.set(null);
    this.weekStart.update((start) => addDays(start, 7));
  }

  protected onThisWeek(): void {
    this.statusMessage.set(null);
    this.today.set(israelToday());
    this.weekStart.set(weekStartOf(this.today()));
  }

  protected onOpenOpeningDialog(): void {
    this.statusMessage.set(null);
    this.today.set(israelToday());
    this.openingDialogOpen.set(true);
  }

  protected onOpenExtraWindowDialog(): void {
    this.statusMessage.set(null);
    this.today.set(israelToday());
    this.extraWindowDialogOpen.set(true);
  }

  protected onOpened(opening: OpeningResponse): void {
    this.openingDialogOpen.set(false);
    this.statusMessage.set(opening.openUntil ? `התורים נפתחו להזמנה עד ${shortDate(opening.openUntil)}.` : null);
    this.reloadAfterChange();
  }

  /** The opening info the dialog worked with is out of date (e.g. opened in another tab). */
  protected onOpeningStale(): void {
    this.store.clear();
    this.reloadAfterChange();
  }

  protected onExtraWindowCreated(window: ExtraWindow): void {
    this.extraWindowDialogOpen.set(false);
    this.statusMessage.set(
      `נוסף חלון ב-${shortDate(window.date)}, ${isolatedTimeRange(window.start, window.end)}.`,
    );
    // Show the week the new window is in.
    this.weekStart.set(weekStartOf(window.date));
    this.reloadAfterChange();
  }

  protected onAskRemove(target: ExtraWindowTarget): void {
    this.statusMessage.set(null);
    this.removeError.set(null);
    this.removeTarget.set(target);
  }

  /** Not while the DELETE is on its way: its outcome must land in the open dialog. */
  protected onCancelRemove(): void {
    if (!this.removing()) {
      this.removeTarget.set(null);
    }
  }

  protected onConfirmRemove(): void {
    const target = this.removeTarget();

    if (!target || this.removing()) {
      return;
    }

    this.removing.set(true);
    this.scheduleApi
      .deleteExtraWindow(target.id, this.actingContext.providerIdForRequest())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.removed(`החלון הנוסף ב-${shortDate(target.date)} הוסר.`),
        error: (error: unknown) => {
          const status = error instanceof HttpErrorResponse ? error.status : null;

          // Already gone (removed in another tab, or by an Admin): the same outcome.
          if (status === 404) {
            this.store.clear();
            this.removed(`החלון הנוסף ב-${shortDate(target.date)} כבר הוסר.`);
            return;
          }

          this.removing.set(false);
          this.removeError.set(
            status === 409 ? 'יש פגישות שנקבעו בחלון הזה, ולכן אי אפשר להסיר אותו.' : GENERIC_ERROR_MESSAGE,
          );
        },
      });
  }

  /** For changes made elsewhere (e.g. a Client booking): drop the cache and load again. */
  protected onRefresh(): void {
    this.statusMessage.set(null);
    this.store.clear();
    this.reloadAfterChange();
  }

  private removed(message: string): void {
    this.removing.set(false);
    this.removeTarget.set(null);
    this.statusMessage.set(message);
    this.reloadAfterChange();
  }

  /** The API already cleared the cache (scheduleChanged$); load what's on screen again. */
  private reloadAfterChange(): void {
    this.today.set(israelToday());
    this.week.reload();
    this.opening.reload();
  }
}
