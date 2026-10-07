import { IsNotEmpty, IsString } from 'class-validator';
import type { RefreshTokenRequest } from '@app/shared/types';

export class RefreshTokenDto implements RefreshTokenRequest {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
