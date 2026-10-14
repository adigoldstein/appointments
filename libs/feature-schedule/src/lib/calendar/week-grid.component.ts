import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ScheduleDay, toMinutes, toTimeOfDay } from '@app/shared/types';
import { hourAxis, shortDate, timeRange, weekdayName } from './calendar-format';

/**
 * The week as a grid (desktop): a column per day, hours down the side. Working hours are white,
 * the rest of the day is muted, extra windows have a dashed edge, booked appointments are blocks.
 * Days not open for booking yet and past days are toned down. Presentational: no data loading.
 */
@Component({
  selector: 'feature-schedule-week-grid',
  standalone: true,
  templateUrl: './week-grid.component.html',
  styleUrl: './week-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekGridComponent {
  readonly days = input.required<readonly ScheduleDay[]>();
  readonly today = input.required<string>();

  protected readonly weekdayName = weekdayName;
  protected readonly shortDate = shortDate;
  protected readonly timeRange = timeRange;

  protected readonly hours = computed(() =>
    hourAxis(this.days().flatMap((day) => [...day.windows, ...day.appointments])),
  );

  /** `top` for something starting at `time`, relative to the first hour on the axis. */
  protected top(time: string): string {
    return `calc(${(toMinutes(time) - this.hours()[0] * 60) / 60} * var(--hour-height))`;
  }

  protected height(start: string, end: string): string {
    return `calc(${(toMinutes(end) - toMinutes(start)) / 60} * var(--hour-height))`;
  }

  protected hourLabel(hour: number): string {
    return toTimeOfDay(hour * 60);
  }

  /** Future days with hours that aren't open for booking yet. */
  protected notOpenYet(day: ScheduleDay): boolean {
    return !day.open && day.date >= this.today() && day.windows.length > 0;
  }
}
