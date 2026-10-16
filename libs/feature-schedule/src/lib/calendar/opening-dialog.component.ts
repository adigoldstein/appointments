import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ActingContextStore } from '@app/shared/acting-context';
import { ScheduleApiService } from '@app/shared/schedule';
import {
  OpeningResponse,
  addDays,
  addMonths,
  earlierOf,
  isValidDate,
} from '@app/shared/types';
import { GENERIC_ERROR_MESSAGE } from '@app/shared/utils';
import { UiButtonComponent } from '@app/ui/button';
import { UiModalComponent } from '@app/ui/modal';
import type { OpeningShortcut } from './calendar.types';
import { shortDate, weeksLabel } from './calendar-format';

/**
 * "פתיחת תורים" (plan step 5b, ADR-0009): moves "open until" forward. A date picker limited to
 * the allowed range, shortcuts, and a live preview from the server before anything is saved.
 * Rendered only while open (the page wraps it in `@defer`).
 */
@Component({
  selector: 'feature-schedule-opening-dialog',
  standalone: true,
  imports: [RouterLink, UiButtonComponent, UiModalComponent],
  templateUrl: './opening-dialog.component.html',
  styleUrl: './opening-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpeningDialogComponent {
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly actingContext = inject(ActingContextStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly opening = input.required<OpeningResponse>();
  readonly today = input.required<string>();
  readonly closed = output<void>();
  readonly opened = output<OpeningResponse>();
  /** The opening info is out of date (e.g. opened further in another tab): the page reloads it. */
  readonly stale = output<void>();

  protected readonly shortDate = shortDate;
  protected readonly weeksLabel = weeksLabel;
  protected readonly settingsUrl = computed(
    () => `${this.actingContext.providerBaseUrl() ?? '/provider'}/schedule-settings`,
  );

  /** What's open now, if anything is open from today on. */
  protected readonly openNow = computed(() => {
    const openUntil = this.opening().openUntil;
    return openUntil && openUntil >= this.today() ? openUntil : null;
  });

  /** The first date the opening adds: the day after "open until", or today. */
  protected readonly from = computed(() => {
    const openNow = this.openNow();
    return openNow ? addDays(openNow, 1) : this.today();
  });

  protected readonly latest = computed(() => this.opening().latestUntil);
  protected readonly canOpen = computed(() => this.opening().suggestedUntil !== null);

  protected readonly selected = linkedSignal(() => this.opening().suggestedUntil ?? this.latest());
  protected readonly selectedIsValid = computed(() => {
    const date = this.selected();
    return isValidDate(date) && date >= this.from() && date <= this.latest();
  });

  /** "+1 week" etc. from what's open now (or today), capped at the limit, without repeats. */
  protected readonly shortcuts = computed<OpeningShortcut[]>(() => {
    const base = this.openNow() ?? this.today();
    const latest = this.latest();
    const candidates: OpeningShortcut[] = [
      { label: 'שבוע', until: addDays(base, 7) },
      { label: 'שבועיים', until: addDays(base, 14) },
      { label: 'חודש', until: addMonths(base, 1) },
      { label: 'עד המגבלה', until: latest },
    ];

    return candidates
      .map((shortcut) => ({ ...shortcut, until: earlierOf(shortcut.until, latest) }))
      .filter((shortcut, index, all) => all.findIndex((other) => other.until === shortcut.until) === index);
  });

  protected readonly preview = rxResource({
    params: () => (this.canOpen() && this.selectedIsValid() ? this.selected() : undefined),
    stream: ({ params: until }) =>
      this.scheduleApi.previewOpening(until, this.actingContext.providerIdForRequest()),
  });

  /** The server refused the preview: most likely the opening info here is out of date. */
  protected readonly previewFailed = computed(() => !!this.preview.error());

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected onDateInput(event: Event): void {
    this.error.set(null);
    this.selected.set((event.target as HTMLInputElement).value);
  }

  protected onShortcut(until: string): void {
    this.error.set(null);
    this.selected.set(until);
  }

  protected onOpen(): void {
    if (!this.selectedIsValid() || this.previewFailed() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.scheduleApi
      .openPeriod(this.selected(), this.actingContext.providerIdForRequest())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (opening) => {
          this.submitting.set(false);
          this.opened.emit(opening);
        },
        error: (error: unknown) => {
          this.submitting.set(false);

          if (error instanceof HttpErrorResponse && error.status === 400) {
            // The range shown here no longer matches the server's: have the page reload it.
            this.error.set('הנתונים כאן כבר לא עדכניים. טענו אותם מחדש, בחרו תאריך ונסו שוב.');
            this.stale.emit();
            return;
          }

          this.error.set(GENERIC_ERROR_MESSAGE);
        },
      });
  }
}
