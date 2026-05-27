import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '@app/shared/types';

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
}
