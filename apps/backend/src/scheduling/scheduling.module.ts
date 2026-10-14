import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderSettingsModule } from '../provider-settings/provider-settings.module';
import { AvailabilityController } from './availability/availability.controller';
import { AvailabilityService } from './availability/availability.service';
import { AppointmentEntity } from './entities/appointment.entity';
import { ClientMeetingTypeEntity } from './entities/client-meeting-type.entity';
import { ExtraWindowEntity } from './entities/extra-window.entity';
import { MeetingTypeEntity } from './entities/meeting-type.entity';
import { WeeklyWindowEntity } from './entities/weekly-window.entity';
import { ScheduleSettingsController } from './schedule-settings.controller';
import { ScheduleSettingsService } from './schedule-settings.service';

/** Scheduling (ADR-0009, Epic 4): appointment settings and availability. */
@Module({
  imports: [
    // Registers the entities (autoLoadEntities); the service works through the DataSource's
    // EntityManager, so it can lock and use transactions.
    TypeOrmModule.forFeature([
      MeetingTypeEntity,
      WeeklyWindowEntity,
      ClientMeetingTypeEntity,
      ExtraWindowEntity,
      AppointmentEntity,
    ]),
    ProviderSettingsModule,
  ],
  controllers: [ScheduleSettingsController, AvailabilityController],
  providers: [ScheduleSettingsService, AvailabilityService],
  exports: [ScheduleSettingsService],
})
export class SchedulingModule {}
