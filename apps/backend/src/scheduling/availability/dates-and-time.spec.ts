import { addDays, addMonths, daysBetween, eachDate, isValidDate, weekStartOf } from '@app/shared/types';
import { fromIsraelTime, israelNow, toIsraelTime } from './israel-time';

describe('dates', () => {
  it('knows real dates from look-alikes', () => {
    expect(isValidDate('2026-10-14')).toBe(true);
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('14/10/2026')).toBe(false);
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-14', -14)).toBe('2026-09-30');
  });

  it('adds a calendar month, keeping the day where it exists', () => {
    expect(addMonths('2026-10-14', 1)).toBe('2026-11-14');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-10-14', '2027-01-06')).toBe(84);
    expect(daysBetween('2026-10-14', '2026-10-14')).toBe(0);
    expect(daysBetween('2026-10-14', '2026-10-13')).toBe(-1);
  });

  it('finds the Sunday that starts a week', () => {
    expect(weekStartOf('2026-10-14')).toBe('2026-10-11');
    expect(weekStartOf('2026-10-11')).toBe('2026-10-11');
    expect(weekStartOf('2027-01-01')).toBe('2026-12-27');
  });

  it('lists every date in a range, both ends included', () => {
    expect(eachDate('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(eachDate('2026-10-14', '2026-10-13')).toEqual([]);
  });
});

describe('Israel time', () => {
  it('converts winter wall-clock time (UTC+2)', () => {
    expect(fromIsraelTime('2026-01-15', 600).toISOString()).toBe('2026-01-15T08:00:00.000Z');
    expect(toIsraelTime(new Date('2026-01-15T08:00:00Z'))).toEqual({ date: '2026-01-15', minutes: 600, seconds: 0 });
  });

  it('converts summer wall-clock time (UTC+3)', () => {
    expect(fromIsraelTime('2026-07-15', 600).toISOString()).toBe('2026-07-15T07:00:00.000Z');
    expect(toIsraelTime(new Date('2026-07-15T07:00:00Z'))).toEqual({ date: '2026-07-15', minutes: 600, seconds: 0 });
  });

  it('uses the right offset on the days the clocks change', () => {
    // 2026: summer time starts Friday 27 March, ends Sunday 25 October.
    expect(fromIsraelTime('2026-03-27', 720).toISOString()).toBe('2026-03-27T09:00:00.000Z');
    expect(fromIsraelTime('2026-10-25', 720).toISOString()).toBe('2026-10-25T10:00:00.000Z');
  });

  it('round-trips the start and end of a day', () => {
    for (const [date, minutes] of [['2026-07-15', 0], ['2026-07-15', 1439], ['2026-12-31', 0]] as const) {
      const local = toIsraelTime(fromIsraelTime(date, minutes));
      expect([local.date, local.minutes]).toEqual([date, minutes]);
    }
  });

  it('gives Israel\'s date even when UTC is still on the previous day', () => {
    expect(toIsraelTime(new Date('2026-07-14T22:30:00Z')).date).toBe('2026-07-15');
  });

  it('rounds "now" up to the next whole minute', () => {
    expect(israelNow(new Date('2026-07-15T07:00:00Z'))).toEqual({ today: '2026-07-15', notBeforeMinute: 600 });
    expect(israelNow(new Date('2026-07-15T07:00:50Z'))).toEqual({ today: '2026-07-15', notBeforeMinute: 601 });
    expect(israelNow(new Date('2026-07-15T07:00:00.700Z'))).toEqual({ today: '2026-07-15', notBeforeMinute: 601 });
  });
});
