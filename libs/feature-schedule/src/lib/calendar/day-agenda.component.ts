import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ScheduleDay, ScheduleWindow } from '@app/shared/types';
import { UiIconComponent } from '@app/ui/icons';
import type { ExtraWindowTarget } from './calendar.types';
import {
  isolatedTimeRange,
  removableExtraWindow,
  shortDate,
  timeRange,
  weekdayName,
} from './calendar-format';

/** One day as a list (phones): its hours, then its booked appointments by time. Presentational. */
@Component({
  selector: 'feature-schedule-day-agenda',
  standalone: true,
  imports: [UiIconComponent],
  templateUrl: './day-agenda.component.html',
  styleUrl: './day-agenda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayAgendaComponent {
  /** Asked to delete an extra window (today or later); the page confirms and deletes. */
  readonly removeExtraWindow = output<ExtraWindowTarget>();
  readonly day = input.required<ScheduleDay>();
  readonly today = input.required<string>();

  protected readonly weekdayName = weekdayName;
  protected readonly shortDate = shortDate;
  protected readonly timeRange = timeRange;
  protected readonly isolatedTimeRange = isolatedTimeRange;

  protected removable(date: string, window: ScheduleWindow): ExtraWindowTarget | null {
    return removableExtraWindow(date, this.today(), window);
  }

  protected readonly isPast = computed(() => this.day().date < this.today());
  protected readonly notOpenYet = computed(
    () => !this.day().open && !this.isPast() && this.day().windows.length > 0,
  );
}
