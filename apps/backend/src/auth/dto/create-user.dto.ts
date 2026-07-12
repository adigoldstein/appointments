import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '@app/shared/types';
import { IsIsraelLocalityCityIdOptional } from '../validators/israel-locality-city-id-optional.validator';
import { IsIsraeliMobileCellOptional } from '../validators/israeli-mobile-cell-optional.validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty() 
  @MinLength(2, {message: 'First name must be at least 2 characters long'})
  @MaxLength(100, {message: 'First name must be less than 100 characters long'})
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, {message: 'Last name must be at least 2 characters long'})
  @MaxLength(100, {message: 'Last name must be less than 100 characters long'})
  lastName: string;

  @IsEmail({},{message: 'Invalid email'})
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, {message: 'Password must be at least 6 characters long'})
  @MaxLength(72, {message: 'Password must be less than 72 characters long'})
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password: string;

  @IsEnum(Role)
  role: Role;

  /** Required when an admin creates a CLIENT; ignored when a provider creates a CLIENT (server uses the logged-in provider). */
  @IsOptional()
  @IsUUID('4', { message: 'providerId must be a valid UUID' })
  providerId?: string;

  @IsOptional()
  @IsString()
  @IsIsraeliMobileCellOptional()
  phone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIsraelLocalityCityIdOptional()
  cityId?: number;
}
