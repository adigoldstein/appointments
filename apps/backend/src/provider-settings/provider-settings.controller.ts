import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ProviderSettingsResponse, Role } from '@app/shared/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUserPayload } from '../auth/interfaces';
import { CreateProviderSettingsDto } from './dto/create-provider-settings.dto';
import { ProviderTargetQueryDto } from './dto/provider-target-query.dto';
import { ProviderSettingsService } from './provider-settings.service';

@Controller('provider-settings')
export class ProviderSettingsController {
  constructor(private readonly providerSettingsService: ProviderSettingsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER, Role.ADMIN)
  @Post()
  async create(
    @Body() createProviderSettingsDto: CreateProviderSettingsDto,
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<ProviderSettingsResponse> {
    const providerId = await this.providerSettingsService.resolveTargetProviderId(
      actor,
      query.providerId,
    );
    return this.providerSettingsService.create(providerId, createProviderSettingsDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER, Role.ADMIN)
  @Put()
  async update(
    @Body() createProviderSettingsDto: CreateProviderSettingsDto,
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<ProviderSettingsResponse> {
    const providerId = await this.providerSettingsService.resolveTargetProviderId(
      actor,
      query.providerId,
    );
    return this.providerSettingsService.update(providerId, createProviderSettingsDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER, Role.ADMIN)
  @Get()
  async get(
    @Query() query: ProviderTargetQueryDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<ProviderSettingsResponse> {
    const providerId = await this.providerSettingsService.resolveTargetProviderId(
      actor,
      query.providerId,
    );
    return this.providerSettingsService.getByProviderId(providerId);
  }
}
