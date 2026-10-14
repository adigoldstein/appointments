import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  DayFreeTimes,
  ExtraWindow,
  OpeningPreviewResponse,
  OpeningResponse,
  Role,
  ScheduleDay,
} from '@app/shared/types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthenticatedUserPayload } from '../../auth/interfaces';
import { ProviderTargetQueryDto } from '../../provider-settings/dto/provider-target-query.dto';
import { ProviderSettingsService } from '../../provider-settings/provider-settings.service';
import { CreateExtraWindowDto } from '../dto/create-extra-window.dto';
import { FreeTimesQueryDto } from '../dto/free-times-query.dto';
import { OpenPeriodDto } from '../dto/open-period.dto';
import { ScheduleRangeQueryDto } from '../dto/schedule-range-query.dto';
import { AvailabilityService } from './availability.service';

/**
 * Extra windows, opening a period, free times and the weekly view (ADR-0009). Provider and Admin
 * (with `?providerId=`, ADR-0004) for now; Clients get their own free-times access in Epic 5.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PROVIDER, Role.ADMIN)
@Controller('schedule')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly providerSettingsService: ProviderSettingsService,
  ) {}

  @Get('extra-windows')
  async listExtraWindows(
    @Query() query: ScheduleRangeQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<ExtraWindow[]> {
    return this.availabilityService.listExtraWindows(await this.target(actor, query), query);
  }

  @Post('extra-windows')
  async createExtraWindow(
    @Body() dto: CreateExtraWindowDto,
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<ExtraWindow> {
    return this.availabilityService.createExtraWindow(await this.target(actor, query), dto);
  }

  @Delete('extra-windows/:extraWindowId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteExtraWindow(
    @Param('extraWindowId', ParseUUIDPipe) extraWindowId: string,
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<void> {
    await this.availabilityService.deleteExtraWindow(await this.target(actor, query), extraWindowId);
  }

  @Get('opening')
  async getOpening(
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<OpeningResponse> {
    return this.availabilityService.getOpening(await this.target(actor, query));
  }

  /** Nothing is saved: what opening up to `until` would do. */
  @Post('opening/preview')
  @HttpCode(HttpStatus.OK)
  async previewOpening(
    @Body() dto: OpenPeriodDto,
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<OpeningPreviewResponse> {
    return this.availabilityService.previewOpening(await this.target(actor, query), dto);
  }

  @Post('opening')
  @HttpCode(HttpStatus.OK)
  async openPeriod(
    @Body() dto: OpenPeriodDto,
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<OpeningResponse> {
    return this.availabilityService.openPeriod(await this.target(actor, query), dto);
  }

  @Get('free-times')
  async freeTimes(
    @Query() query: FreeTimesQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<DayFreeTimes[]> {
    return this.availabilityService.freeTimes(await this.target(actor, query), query);
  }

  @Get('days')
  async days(
    @Query() query: ScheduleRangeQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<ScheduleDay[]> {
    return this.availabilityService.days(await this.target(actor, query), query);
  }

  private target(actor: AuthenticatedUserPayload, query: ProviderTargetQueryDto): Promise<string> {
    return this.providerSettingsService.resolveTargetProviderId(actor, query.providerId);
  }
}
