import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ActingContextStore } from '@app/shared/acting-context';
import { ScheduleStore, israelToday } from '@app/shared/schedule';
import { addDays, weekStartOf } from '@app/shared/types';
import { UiButtonComponent } from '@app/ui/button';
import { UiIconComponent } from '@app/ui/icons';
import { clockTime, shortDate, weekRangeLabel, weekdayShortName } from './calendar-format';
import { DayAgendaComponent } from './day-agenda.component';
import { WeekGridComponent } from './week-grid.component';

/**
 * "יומן" (plan step 5): the Provider's week, read-only. A grid on wide screens, one day at a time
 * on narrow ones (the layout follows the page's own width). Data comes through ScheduleStore, so
 * coming back to a week costs no request; "רענון" drops the cache and loads again.
 */
@Component({
  selector: 'feature-schedule-week-page',
  standalone: true,
  imports: [DayAgendaComponent, RouterLink, UiButtonComponent, UiIconComponent, WeekGridComponent],
  templateUrl: './schedule-week.page.html',
  styleUrl: './schedule-week.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleWeekPageComponent {
  private readonly store = inject(ScheduleStore);
  private readonly actingContext = inject(ActingContextStore);

  /** Fixed for the page's life; Israel's date, whatever the browser's time zone. */
  protected readonly today = israelToday();
  protected readonly weekStart = signal(weekStartOf(this.today));
  protected readonly weekEnd = computed(() => addDays(this.weekStart(), 6));
  protected readonly weekLabel = computed(() => weekRangeLabel(this.weekStart(), this.weekEnd()));
  protected readonly isCurrentWeek = computed(() => this.weekStart() === weekStartOf(this.today));
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
    return this.today >= start && this.today <= addDays(start, 6) ? this.today : start;
  });
  protected readonly selectedDay = computed(
    () => this.days().find((day) => day.date === this.selectedDate()) ?? null,
  );

  protected readonly updatedAt = computed(() =>
    this.week.hasValue() ? clockTime(this.week.value().loadedAt) : null,
  );

  protected readonly openUntilLabel = computed(() => {
    if (!this.opening.hasValue()) {
      return null;
    }

    const openUntil = this.opening.value().value.openUntil;

    if (!openUntil) {
      return 'עוד לא נפתחו תורים להזמנה.';
    }

    return openUntil >= this.today
      ? `פתוח להזמנות עד ${shortDate(openUntil)}`
      : `התקופה הפתוחה להזמנות הסתיימה ב-${shortDate(openUntil)}.`;
  });

  protected readonly weekdayShortName = weekdayShortName;
  protected readonly shortDate = shortDate;

  protected onPreviousWeek(): void {
    this.weekStart.update((start) => addDays(start, -7));
  }

  protected onNextWeek(): void {
    this.weekStart.update((start) => addDays(start, 7));
  }

  protected onThisWeek(): void {
    this.weekStart.set(weekStartOf(this.today));
  }

  /** For changes made elsewhere (e.g. a Client booking): drop the cache and load again. */
  protected onRefresh(): void {
    this.store.clear();
    this.week.reload();
    this.opening.reload();
  }
}
