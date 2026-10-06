import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from '@app/shared/types';
import { IsIsraelLocalityCityIdOptional } from '../validators/israel-locality-city-id-optional.validator';
import { IsIsraeliMobileCellOptional } from '../validators/israeli-mobile-cell-optional.validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(100, { message: 'First name must be less than 100 characters long' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Last name must be less than 100 characters long' })
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long` })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters long` })
  @Matches(PASSWORD_PATTERN, {
    message: 'password must use English letters, digits and symbols only, with at least one letter and one digit',
  })
  password?: string;

  @IsOptional()
  @IsString()
  @IsIsraeliMobileCellOptional()
  phone?: string;

  /** Omit to leave unchanged; send `null` to clear */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) {
      return value;
    }
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  })
  @IsIsraelLocalityCityIdOptional()
  cityId?: number | null;

  /** true = deactivate now, false = reactivate. Omit to leave unchanged. */
  @IsOptional()
  @IsBoolean()
  deactivate?: boolean;
}
