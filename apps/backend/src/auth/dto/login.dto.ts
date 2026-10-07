import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { LoginRequest, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@app/shared/types';

export class LoginDto implements LoginRequest {
  @IsEmail({},{message: 'Invalid email'})
  email: string;

  // Length only: a wrong password should just fail to match, not leak which rule it broke.
  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH, { message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long` })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters long` })
  password: string;
}
