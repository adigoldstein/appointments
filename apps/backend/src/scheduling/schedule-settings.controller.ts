import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MeetingType, Role, ScheduleSettingsResponse } from '@app/shared/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUserPayload } from '../auth/interfaces';
import { ProviderTargetQueryDto } from '../provider-settings/dto/provider-target-query.dto';
import { ProviderSettingsService } from '../provider-settings/provider-settings.service';
import { CreateMeetingTypeDto } from './dto/create-meeting-type.dto';
import { ReplaceWeeklyWindowsDto } from './dto/replace-weekly-windows.dto';
import { UpdateMeetingTypeDto } from './dto/update-meeting-type.dto';
import { UpdateScheduleSettingsDto } from './dto/update-schedule-settings.dto';
import { ScheduleSettingsService } from './schedule-settings.service';

/**
 * Appointment settings (ADR-0009). A Provider works on their own; an Admin names the Provider
 * with `?providerId=` (ADR-0004), exactly like `/provider-settings`.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PROVIDER, Role.ADMIN)
@Controller('schedule')
export class ScheduleSettingsController {
  constructor(
    private readonly scheduleSettingsService: ScheduleSettingsService,
    private readonly providerSettingsService: ProviderSettingsService,
  ) {}

  @Get('settings')
  async getSettings(
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<ScheduleSettingsResponse> {
    return this.scheduleSettingsService.getSettings(await this.target(actor, query));
  }

  @Put('settings')
  async updateSettings(
    @Body() dto: UpdateScheduleSettingsDto,
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<ScheduleSettingsResponse> {
    return this.scheduleSettingsService.updateSettings(await this.target(actor, query), dto);
  }

  @Post('meeting-types')
  async createMeetingType(
    @Body() dto: CreateMeetingTypeDto,
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<MeetingType> {
    return this.scheduleSettingsService.createMeetingType(await this.target(actor, query), dto);
  }

  @Patch('meeting-types/:meetingTypeId')
  async updateMeetingType(
    @Param('meetingTypeId', ParseUUIDPipe) meetingTypeId: string,
    @Body() dto: UpdateMeetingTypeDto,
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<MeetingType> {
    return this.scheduleSettingsService.updateMeetingType(
      await this.target(actor, query),
      meetingTypeId,
      dto,
    );
  }

  @Delete('meeting-types/:meetingTypeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMeetingType(
    @Param('meetingTypeId', ParseUUIDPipe) meetingTypeId: string,
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<void> {
    await this.scheduleSettingsService.removeMeetingType(
      await this.target(actor, query),
      meetingTypeId,
    );
  }

  @Put('weekly-windows')
  async replaceWeeklyWindows(
    @Body() dto: ReplaceWeeklyWindowsDto,
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<ScheduleSettingsResponse> {
    return this.scheduleSettingsService.replaceWeeklyWindows(await this.target(actor, query), dto);
  }

  private target(actor: AuthenticatedUserPayload, query: ProviderTargetQueryDto): Promise<string> {
    return this.providerSettingsService.resolveTargetProviderId(actor, query.providerId);
  }
}
