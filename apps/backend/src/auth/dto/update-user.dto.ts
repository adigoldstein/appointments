import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
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
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(72, { message: 'Password must be less than 72 characters long' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
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
}
