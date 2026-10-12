import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import {
  CreateMeetingTypeRequest,
  MEETING_TYPE_MAX_LENGTH_MINUTES,
  MEETING_TYPE_NAME_MAX_LENGTH,
  MEETING_TYPE_NAME_MIN_LENGTH,
} from '@app/shared/types';

/** Whether the length fits the Provider's time unit is checked in the service, which knows the unit. */
export class CreateMeetingTypeDto implements CreateMeetingTypeRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(MEETING_TYPE_NAME_MIN_LENGTH, {
    message: `Meeting type name must be at least ${MEETING_TYPE_NAME_MIN_LENGTH} characters long`,
  })
  @MaxLength(MEETING_TYPE_NAME_MAX_LENGTH, {
    message: `Meeting type name must be at most ${MEETING_TYPE_NAME_MAX_LENGTH} characters long`,
  })
  name: string;

  @IsInt()
  @Min(1, { message: 'Meeting length must be positive' })
  @Max(MEETING_TYPE_MAX_LENGTH_MINUTES, {
    message: `Meeting length cannot exceed ${MEETING_TYPE_MAX_LENGTH_MINUTES} minutes (8 hours)`,
  })
  lengthMinutes: number;

  @IsBoolean()
  defaultForClients: boolean;
}
