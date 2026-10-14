import { Matches } from 'class-validator';
import { DATE_PATTERN, OpenPeriodRequest } from '@app/shared/types';

/** The new "open until"; the opening limit and "only forward" are checked in the service. */
export class OpenPeriodDto implements OpenPeriodRequest {
  @Matches(DATE_PATTERN, { message: 'until must be YYYY-MM-DD' })
  until: string;
}
