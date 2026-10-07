import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ALLOWED_DURATIONS_MAX_COUNT,
  APPOINTMENT_DURATION_MAX_MINUTES,
  APPOINTMENT_DURATION_MIN_MINUTES,
  BUSINESS_NAME_MAX_LENGTH,
  BUSINESS_NAME_MIN_LENGTH,
  CANCELLATION_WINDOW_MAX_MINUTES,
  CLIENT_LABEL_MAX_LENGTH,
  CLIENT_LABEL_MIN_LENGTH,
  ProviderSettingsRequest,
} from '@app/shared/types';

export class CreateProviderSettingsDto implements ProviderSettingsRequest {
  @IsString()
  @IsNotEmpty()
  @MinLength(BUSINESS_NAME_MIN_LENGTH, { message: `Business name must be at least ${BUSINESS_NAME_MIN_LENGTH} characters long` })
  @MaxLength(BUSINESS_NAME_MAX_LENGTH, { message: `Business name must be less than ${BUSINESS_NAME_MAX_LENGTH} characters long` })
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(CLIENT_LABEL_MIN_LENGTH, { message: `Client label must be at least ${CLIENT_LABEL_MIN_LENGTH} characters long` })
  @MaxLength(CLIENT_LABEL_MAX_LENGTH, { message: `Client label must be less than ${CLIENT_LABEL_MAX_LENGTH} characters long` })
  clientLabel: string;

  @IsInt()
  @Min(0, { message: 'Cancellation window cannot be negative' })
  @Max(CANCELLATION_WINDOW_MAX_MINUTES, { message: `Cancellation window cannot exceed 7 days (${CANCELLATION_WINDOW_MAX_MINUTES} minutes)` })
  cancellationWindowMinutes: number;

  @IsArray()
  @ArrayNotEmpty({ message: 'At least one allowed duration is required' })
  @ArrayMaxSize(ALLOWED_DURATIONS_MAX_COUNT, { message: `No more than ${ALLOWED_DURATIONS_MAX_COUNT} allowed durations` })
  @IsInt({ each: true })
  @Min(APPOINTMENT_DURATION_MIN_MINUTES, { each: true, message: `Each duration must be at least ${APPOINTMENT_DURATION_MIN_MINUTES} minutes` })
  @Max(APPOINTMENT_DURATION_MAX_MINUTES, { each: true, message: `Each duration cannot exceed ${APPOINTMENT_DURATION_MAX_MINUTES} minutes (8 hours)` })
  allowedDurationsMinutes: number[];
}
