import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import {
  BUSINESS_NAME_MAX_LENGTH,
  BUSINESS_NAME_MIN_LENGTH,
  CLIENT_LABEL_MAX_LENGTH,
  CLIENT_LABEL_MIN_LENGTH,
  ProviderSettingsRequest,
} from '@app/shared/types';

/** Onboarding: the business details only. Appointment settings are `/schedule/settings` (ADR-0009). */
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
}
