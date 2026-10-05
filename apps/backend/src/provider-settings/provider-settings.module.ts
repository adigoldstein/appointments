import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { ProviderSettings } from './entities/provider-settings.entity';
import { ProviderSettingsController } from './provider-settings.controller';
import { ProviderSettingsService } from './provider-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderSettings, User])],
  controllers: [ProviderSettingsController],
  providers: [ProviderSettingsService],
  exports: [ProviderSettingsService],
})
export class ProviderSettingsModule {}
