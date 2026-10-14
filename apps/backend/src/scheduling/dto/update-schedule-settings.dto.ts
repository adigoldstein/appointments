import { IsIn, IsInt, Max, Min, ValidateIf } from 'class-validator';
import {
  CANCELLATION_WINDOW_MAX_MINUTES,
  MAX_OPEN_WEEKS_MAX,
  MAX_OPEN_WEEKS_MIN,
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

  /** Optional: left unchanged when omitted (the settings screen adds it in step 5); `null` is rejected. */
  @ValidateIf((_dto, value) => value !== undefined)
  @IsInt()
  @Min(MAX_OPEN_WEEKS_MIN, { message: `Opening limit must be at least ${MAX_OPEN_WEEKS_MIN} week` })
  @Max(MAX_OPEN_WEEKS_MAX, { message: `Opening limit cannot exceed ${MAX_OPEN_WEEKS_MAX} weeks` })
  maxOpenWeeks?: number;
}
