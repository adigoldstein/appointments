import { Role, USER_STATUS_FILTERS, UserStatusFilter } from '@app/shared/types';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Admin only. Which role to list; defaults to CLIENT. */
  @IsOptional()
  @IsIn([Role.PROVIDER, Role.CLIENT])
  role?: Role.PROVIDER | Role.CLIENT;

  /** Admin only. Restrict a CLIENT listing to one Provider's Clients. */
  @IsOptional()
  @IsUUID()
  providerId?: string;

  /** `active` = not deactivated, `inactive` = deactivated; omitted = all. */
  @IsOptional()
  @IsIn(USER_STATUS_FILTERS)
  status?: UserStatusFilter;

  /** Case-insensitive match on first name, last name, full name, or email. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;
}
