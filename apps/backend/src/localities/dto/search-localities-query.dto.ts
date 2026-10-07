import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { SearchLocalitiesQuery } from '@app/shared/types';

export class SearchLocalitiesQueryDto implements SearchLocalitiesQuery {
  /** Matches the Hebrew or English name; empty returns the first localities alphabetically. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
