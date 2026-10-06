import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { IsraelLocality } from '@app/shared/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchLocalitiesQueryDto } from './dto/search-localities-query.dto';
import { LocalitiesService } from './localities.service';

/** Reference data for city pickers. The frontend shows `hebrewName` (ADR-0006). */
@Controller('localities')
export class LocalitiesController {
  constructor(private readonly localitiesService: LocalitiesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  search(@Query() query: SearchLocalitiesQueryDto): IsraelLocality[] {
    return this.localitiesService.search(query.search, query.limit);
  }
}
