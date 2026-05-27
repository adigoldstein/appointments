import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({},{message: 'Invalid email'})
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, {message: 'Password must be at least 8 characters long'})
  @MaxLength(72, {message: 'Password must be less than 72 characters long'})
  password: string;
}
