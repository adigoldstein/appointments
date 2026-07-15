import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '@app/shared/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUserPayload } from '../auth/interfaces';
import { CreateProviderSettingsDto } from './dto/create-provider-settings.dto';
import { ProviderSettings } from './entities/provider-settings.entity';
import { ProviderSettingsService } from './provider-settings.service';

@Controller('provider-settings')
export class ProviderSettingsController {
  constructor(private readonly providerSettingsService: ProviderSettingsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Post()
  create(
    @Body() createProviderSettingsDto: CreateProviderSettingsDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<ProviderSettings> {
    return this.providerSettingsService.create(actor.userId, createProviderSettingsDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Put()
  update(
    @Body() createProviderSettingsDto: CreateProviderSettingsDto,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<ProviderSettings> {
    return this.providerSettingsService.update(actor.userId, createProviderSettingsDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Get()
  getOwn(@CurrentUser() actor: AuthenticatedUserPayload): Promise<ProviderSettings> {
    return this.providerSettingsService.getByProviderId(actor.userId);
  }
}
