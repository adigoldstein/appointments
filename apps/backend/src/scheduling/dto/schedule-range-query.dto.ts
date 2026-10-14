import { Matches } from 'class-validator';
import { DATE_PATTERN, ScheduleRangeQuery } from '@app/shared/types';
import { ProviderTargetQueryDto } from '../../provider-settings/dto/provider-target-query.dto';

/** `from` / `to` are `YYYY-MM-DD`, both included; real dates and the range length are checked in the service. */
export class ScheduleRangeQueryDto extends ProviderTargetQueryDto implements ScheduleRangeQuery {
  @Matches(DATE_PATTERN, { message: 'from must be YYYY-MM-DD' })
  from: string;

  @Matches(DATE_PATTERN, { message: 'to must be YYYY-MM-DD' })
  to: string;
}
