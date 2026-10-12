import { IsIn, IsInt, Max, Min } from 'class-validator';
import {
  CANCELLATION_WINDOW_MAX_MINUTES,
  TIME_UNIT_OPTIONS_MINUTES,
  TimeUnitMinutes,
  UpdateScheduleSettingsRequest,
} from '@app/shared/types';

export class UpdateScheduleSettingsDto implements UpdateScheduleSettingsRequest {
  @IsIn(TIME_UNIT_OPTIONS_MINUTES, {
    message: `Time unit must be one of ${TIME_UNIT_OPTIONS_MINUTES.join(', ')} minutes`,
  })
  timeUnitMinutes: TimeUnitMinutes;

  @IsInt()
  @Min(0, { message: 'Cancellation window cannot be negative' })
  @Max(CANCELLATION_WINDOW_MAX_MINUTES, {
    message: `Cancellation window cannot exceed 7 days (${CANCELLATION_WINDOW_MAX_MINUTES} minutes)`,
  })
  cancellationWindowMinutes: number;
}
