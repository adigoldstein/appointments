import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ScheduleDay } from '@app/shared/types';
import { shortDate, timeRange, weekdayName } from './calendar-format';

/** One day as a list (phones): its hours, then its booked appointments by time. Presentational. */
@Component({
  selector: 'feature-schedule-day-agenda',
  standalone: true,
  templateUrl: './day-agenda.component.html',
  styleUrl: './day-agenda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayAgendaComponent {
  readonly day = input.required<ScheduleDay>();
  readonly today = input.required<string>();

  protected readonly weekdayName = weekdayName;
  protected readonly shortDate = shortDate;
  protected readonly timeRange = timeRange;

  protected readonly isPast = computed(() => this.day().date < this.today());
  protected readonly notOpenYet = computed(
    () => !this.day().open && !this.isPast() && this.day().windows.length > 0,
  );
}
