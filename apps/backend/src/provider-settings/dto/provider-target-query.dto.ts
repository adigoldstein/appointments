import { IsOptional, IsUUID } from 'class-validator';

/** Acting on behalf (ADR-0004): which Provider's settings an Admin is working on. */
export class ProviderTargetQueryDto {
  /** Required for an Admin; a Provider omits it and always targets themselves. */
  @IsOptional()
  @IsUUID()
  providerId?: string;
}
