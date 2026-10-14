import { IsUUID } from 'class-validator';
import type { FreeTimesQuery } from '@app/shared/types';
import { ScheduleRangeQueryDto } from './schedule-range-query.dto';

export class FreeTimesQueryDto extends ScheduleRangeQueryDto implements FreeTimesQuery {
  @IsUUID()
  meetingTypeId: string;
}
