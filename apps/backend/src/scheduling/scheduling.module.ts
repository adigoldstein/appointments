import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderSettingsModule } from '../provider-settings/provider-settings.module';
import { ClientMeetingTypeEntity } from './entities/client-meeting-type.entity';
import { MeetingTypeEntity } from './entities/meeting-type.entity';
import { WeeklyWindowEntity } from './entities/weekly-window.entity';
import { ScheduleSettingsController } from './schedule-settings.controller';
import { ScheduleSettingsService } from './schedule-settings.service';

/** Scheduling (ADR-0009, Epic 4). Settings now; availability and appointments join in later steps. */
@Module({
  imports: [
    // Registers the entities (autoLoadEntities); the service works through the DataSource's
    // EntityManager, so it can lock and use transactions.
    TypeOrmModule.forFeature([MeetingTypeEntity, WeeklyWindowEntity, ClientMeetingTypeEntity]),
    ProviderSettingsModule,
  ],
  controllers: [ScheduleSettingsController],
  providers: [ScheduleSettingsService],
  exports: [ScheduleSettingsService],
})
export class SchedulingModule {}
