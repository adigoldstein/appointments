import { Matches } from 'class-validator';
import { CreateExtraWindowRequest, DATE_PATTERN, TIME_OF_DAY_PATTERN } from '@app/shared/types';

/** Order, overlap with the weekly hours and "not in the past" are checked in the service. */
export class CreateExtraWindowDto implements CreateExtraWindowRequest {
  @Matches(DATE_PATTERN, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @Matches(TIME_OF_DAY_PATTERN, { message: 'start must be HH:MM' })
  start: string;

  @Matches(TIME_OF_DAY_PATTERN, { message: 'end must be HH:MM' })
  end: string;
}
