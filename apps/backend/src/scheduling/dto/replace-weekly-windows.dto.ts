import { Type } from 'class-transformer';
import { IsArray, IsInt, Matches, Max, Min, ValidateNested } from 'class-validator';
import {
  ReplaceWeeklyWindowsRequest,
  TIME_OF_DAY_PATTERN,
  WeeklyWindow,
} from '@app/shared/types';

export class WeeklyWindowDto implements WeeklyWindow {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @Matches(TIME_OF_DAY_PATTERN, { message: 'start must be HH:MM' })
  start: string;

  @Matches(TIME_OF_DAY_PATTERN, { message: 'end must be HH:MM' })
  end: string;
}

/** Order, overlaps and the per-day limit are checked in the service, across windows. */
export class ReplaceWeeklyWindowsDto implements ReplaceWeeklyWindowsRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyWindowDto)
  windows: WeeklyWindowDto[];
}
