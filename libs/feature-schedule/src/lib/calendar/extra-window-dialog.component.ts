import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActingContextStore } from '@app/shared/acting-context';
import { ScheduleApiService } from '@app/shared/schedule';
import { ExtraWindow } from '@app/shared/types';
import { GENERIC_ERROR_MESSAGE } from '@app/shared/utils';
import { UiButtonComponent } from '@app/ui/button';
import { UiModalComponent } from '@app/ui/modal';

/**
 * The server's reason, in Hebrew (ADR-0006). Its English messages are matched by their known
 * wording; anything else gets the generic message.
 */
function toServerErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) {
    return GENERIC_ERROR_MESSAGE;
  }

  const message = String(error.error?.message ?? '');

  if (message.includes('in the past')) {
    return 'אי אפשר להוסיף חלון בתאריך שעבר.';
  }

  if (message.includes('before it ends')) {
    return 'שעת הסיום חייבת להיות אחרי שעת ההתחלה.';
  }

  if (message.includes('overlap or touch')) {
    return 'החלון לא יכול לחפוף או לגעת בשעות הפעילות של אותו יום, או בחלון נוסף אחר בו.';
  }

  return 'חלק מהפרטים אינם תקינים. בדקו ונסו שוב.';
}

/**
 * "חלון נוסף" (plan step 5b, ADR-0009): one-off working hours on a date, e.g. Sunday 10:00-13:00
 * on a day off. It may not overlap or touch that day's regular hours; the server checks that.
 * Rendered only while open (the page wraps it in `@defer`).
 */
@Component({
  selector: 'feature-schedule-extra-window-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, UiButtonComponent, UiModalComponent],
  templateUrl: './extra-window-dialog.component.html',
  styleUrl: './extra-window-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtraWindowDialogComponent {
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly actingContext = inject(ActingContextStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly today = input.required<string>();
  readonly closed = output<void>();
  readonly created = output<ExtraWindow>();

  readonly form = new FormGroup({
    date: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    start: new FormControl('10:00', { nonNullable: true, validators: [Validators.required] }),
    end: new FormControl('13:00', { nonNullable: true, validators: [Validators.required] }),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  /** The first problem with what's filled in, shown after a save attempt. */
  protected readonly problem = computed(() => {
    const { date, start, end } = this.value();

    if (!date || !start || !end) {
      return 'יש למלא תאריך, שעת התחלה ושעת סיום.';
    }

    if (date < this.today()) {
      return 'אי אפשר להוסיף חלון בתאריך שעבר.';
    }

    if (end <= start) {
      return 'שעת הסיום חייבת להיות אחרי שעת ההתחלה.';
    }

    return null;
  });

  protected onSave(): void {
    this.submitted.set(true);
    this.serverError.set(null);

    if (this.problem() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.scheduleApi
      .createExtraWindow(this.form.getRawValue(), this.actingContext.providerIdForRequest())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (window) => {
          this.submitting.set(false);
          this.created.emit(window);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.serverError.set(toServerErrorMessage(error));
        },
      });
  }
}
