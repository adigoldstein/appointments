import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  MEETING_TYPE_MAX_LENGTH_MINUTES,
  MEETING_TYPE_NAME_MAX_LENGTH,
  MEETING_TYPE_NAME_MIN_LENGTH,
  UpdateMeetingTypeRequest,
} from '@app/shared/types';

/** Skips a field only when it's absent; an explicit `null` is validated, and rejected. */
const isPresent = (_dto: object, value: unknown): boolean => value !== undefined;

/** Same rules as CreateMeetingTypeDto, every field optional; at least one (checked in the service). */
export class UpdateMeetingTypeDto implements UpdateMeetingTypeRequest {
  @ValidateIf(isPresent)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(MEETING_TYPE_NAME_MIN_LENGTH, {
    message: `Meeting type name must be at least ${MEETING_TYPE_NAME_MIN_LENGTH} characters long`,
  })
  @MaxLength(MEETING_TYPE_NAME_MAX_LENGTH, {
    message: `Meeting type name must be at most ${MEETING_TYPE_NAME_MAX_LENGTH} characters long`,
  })
  name?: string;

  @ValidateIf(isPresent)
  @IsInt()
  @Min(1, { message: 'Meeting length must be positive' })
  @Max(MEETING_TYPE_MAX_LENGTH_MINUTES, {
    message: `Meeting length cannot exceed ${MEETING_TYPE_MAX_LENGTH_MINUTES} minutes (8 hours)`,
  })
  lengthMinutes?: number;

  @ValidateIf(isPresent)
  @IsBoolean()
  defaultForClients?: boolean;
}
