import { IsOptional, IsUUID } from 'class-validator';
import type { ProviderTargetQuery } from '@app/shared/types';

/** Acting on behalf (ADR-0004): which Provider's settings an Admin is working on. */
export class ProviderTargetQueryDto implements ProviderTargetQuery {
  /** Required for an Admin; a Provider omits it and always targets themselves. */
  @IsOptional()
  @IsUUID()
  providerId?: string;
}
