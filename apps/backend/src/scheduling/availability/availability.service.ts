import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, IsNull, LessThan, MoreThan } from 'typeorm';
import {
  DayFreeTimes,
  ExtraWindow,
  OpeningPreviewResponse,
  OpeningResponse,
  SCHEDULE_RANGE_MAX_DAYS,
  ScheduleDay,
  WeeklyWindow,
  toMinutes,
  toTimeOfDay,
} from '@app/shared/types';
import { ProviderSettings } from '../../provider-settings/entities/provider-settings.entity';
import { CreateExtraWindowDto } from '../dto/create-extra-window.dto';
import { FreeTimesQueryDto } from '../dto/free-times-query.dto';
import { OpenPeriodDto } from '../dto/open-period.dto';
import { ScheduleRangeQueryDto } from '../dto/schedule-range-query.dto';
import { AppointmentEntity } from '../entities/appointment.entity';
import { ExtraWindowEntity } from '../entities/extra-window.entity';
import { MeetingTypeEntity } from '../entities/meeting-type.entity';
import { WeeklyWindowEntity } from '../entities/weekly-window.entity';
import { requireSettings } from '../provider-settings-access';
import type { ExtraWindowRule, LocalBooking, MinuteRange } from './availability.types';
import { addDays, addMonths, daysBetween, eachDate, earlierOf, isValidDate } from './dates';
import {
  freeStartTimes,
  isOpenForBooking,
  overlapsOrTouches,
  weekdayOf,
  windowsForDate,
  windowsOnDate,
} from './free-times';
import { fromIsraelTime, israelNow, toIsraelTime } from './israel-time';

/**
 * Availability (ADR-0009, step 4b): one-off extra windows, opening a period, free times and the
 * Provider's days. The calculation itself is pure (free-times.ts); this service loads the data,
 * supplies "today" / "now" in Israel time, and locks the Provider's settings row for every write.
 * Every method takes the already-resolved target Provider (ADR-0004).
 */
@Injectable()
export class AvailabilityService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // --- extra windows ---

  async listExtraWindows(providerId: string, query: ScheduleRangeQueryDto): Promise<ExtraWindow[]> {
    assertRange(query.from, query.to);
    const rows = await this.dataSource.manager.find(ExtraWindowEntity, {
      where: { providerId, date: Between(query.from, query.to) },
      order: { date: 'ASC', startTime: 'ASC' },
    });
    return rows.map(toExtraWindow);
  }

  /** On a date from today on; never overlapping or touching that date's weekly or extra windows. */
  createExtraWindow(providerId: string, dto: CreateExtraWindowDto): Promise<ExtraWindow> {
    assertDate(dto.date, 'date');

    if (dto.start >= dto.end) {
      throw new BadRequestException('An extra window must start before it ends');
    }

    return this.dataSource.transaction(async (manager) => {
      await requireSettings(manager, providerId, true);

      if (dto.date < israelNow().today) {
        throw new BadRequestException('An extra window cannot be in the past');
      }

      const candidate = { start: toMinutes(dto.start), end: toMinutes(dto.end) };
      const weekly = await manager.find(WeeklyWindowEntity, {
        where: { providerId, weekday: weekdayOf(dto.date) },
      });

      if (weekly.some((window) => overlapsOrTouches(candidate, toRange(window)))) {
        throw new BadRequestException('An extra window must not overlap or touch the weekly hours');
      }

      const sameDate = await manager.find(ExtraWindowEntity, { where: { providerId, date: dto.date } });

      if (sameDate.some((window) => overlapsOrTouches(candidate, toRange(window)))) {
        throw new BadRequestException('An extra window must not overlap or touch another one on that date');
      }

      const saved = await manager.save(
        manager.create(ExtraWindowEntity, {
          providerId,
          date: dto.date,
          startTime: dto.start,
          endTime: dto.end,
        }),
      );

      return toExtraWindow(saved);
    });
  }

  /** Refused while booked appointments fall inside it (cancelling them comes with step 6). */
  deleteExtraWindow(providerId: string, extraWindowId: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      await requireSettings(manager, providerId, true);
      const window = await manager.findOne(ExtraWindowEntity, {
        where: { id: extraWindowId, providerId },
      });

      if (!window) {
        throw new NotFoundException('Extra window not found');
      }

      const booked = await manager.exists(AppointmentEntity, {
        where: {
          providerId,
          status: 'BOOKED',
          startsAt: LessThan(fromIsraelTime(window.date, toMinutes(window.endTime))),
          endsAt: MoreThan(fromIsraelTime(window.date, toMinutes(window.startTime))),
        },
      });

      if (booked) {
        throw new ConflictException('The extra window has booked appointments');
      }

      await manager.remove(window);
    });
  }

  // --- opening ---

  async getOpening(providerId: string): Promise<OpeningResponse> {
    const settings = await requireSettings(this.dataSource.manager, providerId);
    return toOpening(settings, israelNow().today);
  }

  /** What opening up to `until` would do; nothing is saved. */
  async previewOpening(providerId: string, dto: OpenPeriodDto): Promise<OpeningPreviewResponse> {
    const manager = this.dataSource.manager;
    const settings = await requireSettings(manager, providerId);
    const from = assertCanOpen(settings, dto.until, israelNow().today);
    const [weekly, extra] = await Promise.all([
      loadWeeklyWindows(manager, providerId),
      loadExtraWindows(manager, providerId, from, dto.until),
    ]);
    const workingDays = eachDate(from, dto.until).filter(
      (date) => windowsForDate(date, weekly, extra).length > 0,
    ).length;

    return { from, until: dto.until, workingDays };
  }

  /**
   * Moves "open until" forward (ADR-0009). Recurring appointments are booked into the new dates
   * from step 6 on; the future automatic job calls this same method.
   */
  openPeriod(providerId: string, dto: OpenPeriodDto): Promise<OpeningResponse> {
    return this.dataSource.transaction(async (manager) => {
      const settings = await requireSettings(manager, providerId, true);
      const today = israelNow().today;
      assertCanOpen(settings, dto.until, today);
      settings.openUntil = dto.until;
      await manager.save(settings);
      return toOpening(settings, today);
    });
  }

  // --- free times and days ---

  /** For each open date in the range, when a meeting of the given type can start. */
  async freeTimes(providerId: string, query: FreeTimesQueryDto): Promise<DayFreeTimes[]> {
    assertRange(query.from, query.to);
    const manager = this.dataSource.manager;
    const settings = await requireSettings(manager, providerId);
    const meetingType = await manager.findOne(MeetingTypeEntity, {
      where: { id: query.meetingTypeId, providerId, archivedAt: IsNull() },
    });

    if (!meetingType) {
      throw new NotFoundException('Meeting type not found');
    }

    const { today, notBeforeMinute } = israelNow();
    const dates = eachDate(query.from, query.to).filter((date) =>
      isOpenForBooking(date, today, settings.openUntil),
    );

    if (dates.length === 0) {
      return [];
    }

    const first = dates[0];
    const last = dates[dates.length - 1];
    const [weekly, extra, bookings] = await Promise.all([
      loadWeeklyWindows(manager, providerId),
      loadExtraWindows(manager, providerId, first, last),
      loadBookings(manager, providerId, first, last, false),
    ]);
    const bookingsByDate = groupByDate(bookings.map(toLocalBooking));

    return dates.map((date) => ({
      date,
      starts: freeStartTimes({
        windows: windowsForDate(date, weekly, extra),
        bookings: (bookingsByDate.get(date) ?? []).map((booking) => booking.range),
        timeUnitMinutes: settings.timeUnitMinutes,
        lengthMinutes: meetingType.lengthMinutes,
        notBeforeMinute: date === today ? notBeforeMinute : undefined,
      }).map(toTimeOfDay),
    }));
  }

  /** The Provider's weekly view: per date, open or not, its windows and its booked appointments. */
  async days(providerId: string, query: ScheduleRangeQueryDto): Promise<ScheduleDay[]> {
    assertRange(query.from, query.to);
    const manager = this.dataSource.manager;
    const settings = await requireSettings(manager, providerId);
    const today = israelNow().today;
    const [weekly, extra, bookings] = await Promise.all([
      loadWeeklyWindows(manager, providerId),
      loadExtraWindows(manager, providerId, query.from, query.to),
      loadBookings(manager, providerId, query.from, query.to, true),
    ]);
    const bookingsByDate = groupByDate(bookings.map(toLocalBooking));

    return eachDate(query.from, query.to).map((date) => ({
      date,
      open: isOpenForBooking(date, today, settings.openUntil),
      windows: windowsOnDate(date, weekly, extra),
      appointments: (bookingsByDate.get(date) ?? []).map(({ appointment, range }) => ({
        id: appointment.id,
        date,
        start: toTimeOfDay(range.start),
        end: toTimeOfDay(range.end),
        client: {
          id: appointment.clientId,
          name: `${appointment.client.firstName} ${appointment.client.lastName}`,
        },
        meetingType: { id: appointment.meetingTypeId, name: appointment.meetingType.name },
      })),
    }));
  }
}

// --- validation ---

function assertDate(date: string, field: string): void {
  if (!isValidDate(date)) {
    throw new BadRequestException(`${field} is not a real date`);
  }
}

function assertRange(from: string, to: string): void {
  assertDate(from, 'from');
  assertDate(to, 'to');

  if (to < from) {
    throw new BadRequestException('to must not be before from');
  }

  if (daysBetween(from, to) + 1 > SCHEDULE_RANGE_MAX_DAYS) {
    throw new BadRequestException(`A range may cover at most ${SCHEDULE_RANGE_MAX_DAYS} days`);
  }
}

/**
 * Opening only moves forward, and not past today + the opening limit. Returns the first date that
 * becomes open: the day after the current "open until", or today when nothing ahead is open.
 */
function assertCanOpen(settings: ProviderSettings, until: string, today: string): string {
  assertDate(until, 'until');
  const from = firstNewlyOpenDate(settings, today);

  if (until < from) {
    throw new BadRequestException(`until must be on or after ${from}`);
  }

  const latest = latestUntil(settings, today);

  if (until > latest) {
    throw new BadRequestException(`until is beyond the opening limit (${latest})`);
  }

  return from;
}

function firstNewlyOpenDate(settings: ProviderSettings, today: string): string {
  return settings.openUntil && settings.openUntil >= today ? addDays(settings.openUntil, 1) : today;
}

function latestUntil(settings: ProviderSettings, today: string): string {
  return addDays(today, settings.maxOpenWeeks * 7);
}

/**
 * The dialog proposes one month past what's open now (or today), within the limit; null when the
 * limit is already reached (or was lowered below "open until"), so nothing can be opened now.
 */
function toOpening(settings: ProviderSettings, today: string): OpeningResponse {
  const latest = latestUntil(settings, today);
  const base = settings.openUntil && settings.openUntil >= today ? settings.openUntil : today;
  return {
    openUntil: settings.openUntil,
    maxOpenWeeks: settings.maxOpenWeeks,
    latestUntil: latest,
    suggestedUntil: base >= latest ? null : earlierOf(addMonths(base, 1), latest),
  };
}

// --- loading and mapping ---

async function loadWeeklyWindows(manager: EntityManager, providerId: string): Promise<WeeklyWindow[]> {
  const rows = await manager.find(WeeklyWindowEntity, { where: { providerId } });
  return rows.map((row) => ({ weekday: row.weekday, start: hhmm(row.startTime), end: hhmm(row.endTime) }));
}

async function loadExtraWindows(
  manager: EntityManager,
  providerId: string,
  from: string,
  to: string,
): Promise<ExtraWindowRule[]> {
  const rows = await manager.find(ExtraWindowEntity, {
    where: { providerId, date: Between(from, to) },
  });
  return rows.map((row) => ({ date: row.date, start: hhmm(row.startTime), end: hhmm(row.endTime) }));
}

/** `BOOKED` appointments that touch the range (from its first midnight to the midnight after it). */
function loadBookings(
  manager: EntityManager,
  providerId: string,
  from: string,
  to: string,
  withDetails: boolean,
): Promise<AppointmentEntity[]> {
  return manager.find(AppointmentEntity, {
    where: {
      providerId,
      status: 'BOOKED',
      startsAt: LessThan(fromIsraelTime(addDays(to, 1), 0)),
      endsAt: MoreThan(fromIsraelTime(from, 0)),
    },
    relations: withDetails ? { client: true, meetingType: true } : undefined,
    order: { startsAt: 'ASC' },
  });
}

/**
 * An appointment in Israel wall-clock terms: its date and minutes since that midnight. The end is
 * converted on its own (not start + duration), so it's right on the nights the clocks change.
 */
function toLocalBooking(appointment: AppointmentEntity): LocalBooking {
  const start = toIsraelTime(appointment.startsAt);
  const end = toIsraelTime(appointment.endsAt);
  return {
    appointment,
    date: start.date,
    range: { start: start.minutes, end: end.minutes + daysBetween(start.date, end.date) * 1440 },
  };
}

function groupByDate(bookings: LocalBooking[]): Map<string, LocalBooking[]> {
  const byDate = new Map<string, LocalBooking[]>();

  for (const booking of bookings) {
    const day = byDate.get(booking.date);

    if (day) {
      day.push(booking);
    } else {
      byDate.set(booking.date, [booking]);
    }
  }

  return byDate;
}

function toExtraWindow(row: ExtraWindowEntity): ExtraWindow {
  return { id: row.id, date: row.date, start: hhmm(row.startTime), end: hhmm(row.endTime) };
}

function toRange(window: { startTime: string; endTime: string }): MinuteRange {
  return { start: toMinutes(window.startTime), end: toMinutes(window.endTime) };
}

/** Postgres `time` comes back as `HH:MM:SS`. */
function hhmm(time: string): string {
  return time.slice(0, 5);
}
