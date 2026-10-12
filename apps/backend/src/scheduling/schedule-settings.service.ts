import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import {
  MEETING_TYPES_MAX_COUNT,
  MeetingType,
  Role,
  ScheduleSettingsResponse,
  WEEKLY_WINDOWS_MAX_PER_DAY,
  WeeklyWindow,
} from '@app/shared/types';
import { User } from '../auth/entities/user.entity';
import { ProviderSettings } from '../provider-settings/entities/provider-settings.entity';
import { CreateMeetingTypeDto } from './dto/create-meeting-type.dto';
import { ReplaceWeeklyWindowsDto } from './dto/replace-weekly-windows.dto';
import { UpdateMeetingTypeDto } from './dto/update-meeting-type.dto';
import { UpdateScheduleSettingsDto } from './dto/update-schedule-settings.dto';
import { ClientMeetingTypeEntity } from './entities/client-meeting-type.entity';
import { MeetingTypeEntity } from './entities/meeting-type.entity';
import { WeeklyWindowEntity } from './entities/weekly-window.entity';

/**
 * Appointment settings (ADR-0009): time unit, cancellation window, meeting types, weekly windows.
 * Every method takes the already-resolved target Provider (ADR-0004); the controller resolves it.
 *
 * Writes run in a transaction that first locks the Provider's settings row, so two of them for the
 * same Provider (e.g. an Admin and the Provider in two tabs) run one after the other. That keeps
 * the invariants checked here true: every type is on the time unit's grid, the type limit holds,
 * and a new Client gets exactly the defaults that exist when they're created.
 */
@Injectable()
export class ScheduleSettingsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  getSettings(providerId: string): Promise<ScheduleSettingsResponse> {
    return this.readSettings(this.dataSource.manager, providerId);
  }

  /** A new time unit must divide every active meeting type's length, or those types would be off-grid. */
  updateSettings(providerId: string, dto: UpdateScheduleSettingsDto): Promise<ScheduleSettingsResponse> {
    return this.dataSource.transaction(async (manager) => {
      const settings = await this.lockSettings(manager, providerId);
      const offGrid = (await activeMeetingTypes(manager, providerId)).filter(
        (type) => type.lengthMinutes % dto.timeUnitMinutes !== 0,
      );

      if (offGrid.length > 0) {
        throw new BadRequestException(
          `Time unit ${dto.timeUnitMinutes} does not divide the length of: ${offGrid.map((type) => type.name).join(', ')}`,
        );
      }

      settings.timeUnitMinutes = dto.timeUnitMinutes;
      settings.cancellationWindowMinutes = dto.cancellationWindowMinutes;
      await manager.save(settings);

      return this.readSettings(manager, providerId);
    });
  }

  /** A type marked default is also given to the Provider's existing Clients, so it's bookable right away. */
  createMeetingType(providerId: string, dto: CreateMeetingTypeDto): Promise<MeetingType> {
    return this.dataSource.transaction(async (manager) => {
      const settings = await this.lockSettings(manager, providerId);
      assertFitsTimeUnit(dto.lengthMinutes, settings.timeUnitMinutes);

      const count = await manager.count(MeetingTypeEntity, {
        where: { providerId, archivedAt: IsNull() },
      });

      if (count >= MEETING_TYPES_MAX_COUNT) {
        throw new BadRequestException(`No more than ${MEETING_TYPES_MAX_COUNT} meeting types`);
      }

      const saved = await manager.save(
        manager.create(MeetingTypeEntity, { providerId, ...dto, archivedAt: null }),
      );

      if (saved.defaultForClients) {
        const clients = await manager.find(User, {
          where: { providerId, role: Role.CLIENT },
          select: { id: true },
        });

        if (clients.length > 0) {
          await manager.insert(
            ClientMeetingTypeEntity,
            clients.map((client) => ({ clientId: client.id, meetingTypeId: saved.id })),
          );
        }
      }

      return toMeetingType(saved);
    });
  }

  /** Changing `defaultForClients` affects Clients created from now on only. */
  updateMeetingType(
    providerId: string,
    meetingTypeId: string,
    dto: UpdateMeetingTypeDto,
  ): Promise<MeetingType> {
    if (dto.name === undefined && dto.lengthMinutes === undefined && dto.defaultForClients === undefined) {
      throw new BadRequestException('Nothing to update');
    }

    return this.dataSource.transaction(async (manager) => {
      const settings = await this.lockSettings(manager, providerId);
      const meetingType = await requireActiveMeetingType(manager, providerId, meetingTypeId);

      if (dto.lengthMinutes !== undefined) {
        assertFitsTimeUnit(dto.lengthMinutes, settings.timeUnitMinutes);
      }

      return toMeetingType(await manager.save(MeetingTypeEntity, { ...meetingType, ...dto }));
    });
  }

  /**
   * Deleted outright while nothing refers to it. Once appointments exist (plan step 4), a type
   * that has appointments is archived instead (ADR-0009).
   */
  async removeMeetingType(providerId: string, meetingTypeId: string): Promise<void> {
    const manager = this.dataSource.manager;
    await manager.remove(await requireActiveMeetingType(manager, providerId, meetingTypeId));
  }

  /** Replaces the whole week at once: what the settings screen edits is the week as a whole. */
  replaceWeeklyWindows(providerId: string, dto: ReplaceWeeklyWindowsDto): Promise<ScheduleSettingsResponse> {
    assertValidWeek(dto.windows);

    return this.dataSource.transaction(async (manager) => {
      await this.lockSettings(manager, providerId);
      await manager.delete(WeeklyWindowEntity, { providerId });

      if (dto.windows.length > 0) {
        await manager.insert(
          WeeklyWindowEntity,
          dto.windows.map((window) => ({
            providerId,
            weekday: window.weekday,
            startTime: window.start,
            endTime: window.end,
          })),
        );
      }

      return this.readSettings(manager, providerId);
    });
  }

  /**
   * A new Client may book the Provider's default meeting types (ADR-0009). Runs inside the
   * caller's create-user transaction, so the Client never exists without their types.
   */
  async grantDefaultMeetingTypes(
    manager: EntityManager,
    clientId: string,
    providerId: string,
  ): Promise<void> {
    // Same lock as the writes above: a type created at this moment is either seen here or
    // sees this Client. No settings row (not onboarded yet) means no types to grant.
    await manager.findOne(ProviderSettings, {
      where: { providerId },
      lock: { mode: 'pessimistic_write' },
    });

    const defaults = await manager.find(MeetingTypeEntity, {
      where: { providerId, defaultForClients: true, archivedAt: IsNull() },
      select: { id: true },
    });

    if (defaults.length > 0) {
      await manager.insert(
        ClientMeetingTypeEntity,
        defaults.map((type) => ({ clientId, meetingTypeId: type.id })),
      );
    }
  }

  private async readSettings(
    manager: EntityManager,
    providerId: string,
  ): Promise<ScheduleSettingsResponse> {
    const settings = await requireSettings(manager, providerId);
    const [meetingTypes, windows] = await Promise.all([
      activeMeetingTypes(manager, providerId),
      manager.find(WeeklyWindowEntity, {
        where: { providerId },
        order: { weekday: 'ASC', startTime: 'ASC' },
      }),
    ]);

    return {
      timeUnitMinutes: settings.timeUnitMinutes,
      cancellationWindowMinutes: settings.cancellationWindowMinutes,
      meetingTypes: meetingTypes.map(toMeetingType),
      weeklyWindows: windows.map(toWeeklyWindow),
    };
  }

  private lockSettings(manager: EntityManager, providerId: string): Promise<ProviderSettings> {
    return requireSettings(manager, providerId, true);
  }
}

/** The settings row exists once onboarding is done; scheduling needs it (the time unit lives there). */
async function requireSettings(
  manager: EntityManager,
  providerId: string,
  lock = false,
): Promise<ProviderSettings> {
  const settings = await manager.findOne(ProviderSettings, {
    where: { providerId },
    ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
  });

  if (!settings) {
    throw new NotFoundException('Provider settings not found; complete onboarding first');
  }

  return settings;
}

async function requireActiveMeetingType(
  manager: EntityManager,
  providerId: string,
  meetingTypeId: string,
): Promise<MeetingTypeEntity> {
  const meetingType = await manager.findOne(MeetingTypeEntity, {
    where: { id: meetingTypeId, providerId, archivedAt: IsNull() },
  });

  if (!meetingType) {
    throw new NotFoundException('Meeting type not found');
  }

  return meetingType;
}

function activeMeetingTypes(manager: EntityManager, providerId: string): Promise<MeetingTypeEntity[]> {
  return manager.find(MeetingTypeEntity, {
    where: { providerId, archivedAt: IsNull() },
    order: { lengthMinutes: 'ASC', name: 'ASC' },
  });
}

function assertFitsTimeUnit(lengthMinutes: number, timeUnitMinutes: number): void {
  if (lengthMinutes % timeUnitMinutes !== 0) {
    throw new BadRequestException(
      `Meeting length must be a multiple of the time unit (${timeUnitMinutes} minutes)`,
    );
  }
}

/** Per day: each window starts before it ends, no more than the limit, and none overlap (touching is fine). */
function assertValidWeek(windows: readonly WeeklyWindow[]): void {
  for (let weekday = 0; weekday <= 6; weekday++) {
    const day = windows
      .filter((window) => window.weekday === weekday)
      .sort((a, b) => a.start.localeCompare(b.start));

    if (day.length > WEEKLY_WINDOWS_MAX_PER_DAY) {
      throw new BadRequestException(`No more than ${WEEKLY_WINDOWS_MAX_PER_DAY} windows per day`);
    }

    day.forEach((window, index) => {
      if (window.start >= window.end) {
        throw new BadRequestException('A window must start before it ends');
      }

      const previous = day[index - 1];

      if (previous && window.start < previous.end) {
        throw new BadRequestException('Windows on the same day must not overlap');
      }
    });
  }
}

function toMeetingType(entity: MeetingTypeEntity): MeetingType {
  return {
    id: entity.id,
    name: entity.name,
    lengthMinutes: entity.lengthMinutes,
    defaultForClients: entity.defaultForClients,
  };
}

/** Postgres `time` comes back as `HH:MM:SS`; the API speaks `HH:MM`. */
function toWeeklyWindow(entity: WeeklyWindowEntity): WeeklyWindow {
  return {
    weekday: entity.weekday,
    start: entity.startTime.slice(0, 5),
    end: entity.endTime.slice(0, 5),
  };
}
