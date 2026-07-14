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

export class CreateProviderSettingsDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Business name must be at least 2 characters long' })
  @MaxLength(150, { message: 'Business name must be less than 150 characters long' })
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Client label must be at least 2 characters long' })
  @MaxLength(50, { message: 'Client label must be less than 50 characters long' })
  clientLabel: string;

  @IsInt()
  @Min(0, { message: 'Cancellation window cannot be negative' })
  @Max(10_080, { message: 'Cancellation window cannot exceed 7 days (10080 minutes)' })
  cancellationWindowMinutes: number;

  @IsArray()
  @ArrayNotEmpty({ message: 'At least one allowed duration is required' })
  @ArrayMaxSize(12, { message: 'No more than 12 allowed durations' })
  @IsInt({ each: true })
  @Min(5, { each: true, message: 'Each duration must be at least 5 minutes' })
  @Max(480, { each: true, message: 'Each duration cannot exceed 480 minutes (8 hours)' })
  allowedDurationsMinutes: number[];
}
