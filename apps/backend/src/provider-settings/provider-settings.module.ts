import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderSettings } from './entities/provider-settings.entity';
import { ProviderSettingsController } from './provider-settings.controller';
import { ProviderSettingsService } from './provider-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderSettings])],
  controllers: [ProviderSettingsController],
  providers: [ProviderSettingsService],
  exports: [ProviderSettingsService],
})
export class ProviderSettingsModule {}
