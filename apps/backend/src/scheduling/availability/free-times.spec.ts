import { toMinutes, toTimeOfDay, weekdayOf } from '@app/shared/types';
import type { MinuteRange } from './availability.types';
import {
  freeStartTimes,
  isOpenForBooking,
  mergeRanges,
  overlapsOrTouches,
  windowsForDate,
  windowsOnDate,
} from './free-times';

/** `'08:00-12:00'` → a minute range, to keep the cases readable. */
const range = (text: string): MinuteRange => {
  const [start, end] = text.split('-');
  return { start: toMinutes(start), end: toMinutes(end) };
};

/** Free starts as `HH:MM`, for readable expectations. */
function starts(
  windows: string[],
  options: { unit?: number; length?: number; bookings?: string[]; notBefore?: string } = {},
): string[] {
  return freeStartTimes({
    windows: windows.map(range),
    bookings: (options.bookings ?? []).map(range),
    timeUnitMinutes: options.unit ?? 60,
    lengthMinutes: options.length ?? 60,
    notBeforeMinute: options.notBefore === undefined ? undefined : toMinutes(options.notBefore),
  }).map(toTimeOfDay);
}

describe('freeStartTimes', () => {
  describe('the grid', () => {
    it('offers every unit from the window start while the meeting fits', () => {
      expect(starts(['08:00-12:00'])).toEqual(['08:00', '09:00', '10:00', '11:00']);
    });

    it('counts from the window start, not from round hours', () => {
      expect(starts(['08:20-12:20'])).toEqual(['08:20', '09:20', '10:20', '11:20']);
    });

    it('steps by half an hour with a 30-minute unit', () => {
      expect(starts(['08:00-10:00'], { unit: 30 })).toEqual(['08:00', '08:30', '09:00']);
    });

    it('fits a long meeting only where all of it is inside the window', () => {
      expect(starts(['08:00-12:00'], { length: 180 })).toEqual(['08:00', '09:00']);
    });

    it('offers a meeting that ends exactly at the window end', () => {
      expect(starts(['08:00-11:00'], { length: 180 })).toEqual(['08:00']);
    });

    it('offers nothing when the window is shorter than the meeting', () => {
      expect(starts(['08:00-09:30'], { length: 120 })).toEqual([]);
    });

    it('leaves the tail of a window unused when it is shorter than a meeting', () => {
      expect(starts(['08:20-12:00'])).toEqual(['08:20', '09:20', '10:20']);
    });

    it('offers nothing on a day without windows', () => {
      expect(starts([])).toEqual([]);
    });
  });

  describe('breaks (gaps between windows)', () => {
    it('restarts the grid after a break', () => {
      expect(starts(['08:00-14:00', '14:45-18:00'])).toEqual([
        '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
        '14:45', '15:45', '16:45',
      ]);
    });

    it('never lets a meeting run into the break', () => {
      expect(starts(['08:00-14:00', '14:45-18:00'], { length: 120 })).toEqual([
        '08:00', '09:00', '10:00', '11:00', '12:00',
        '14:45', '15:45',
      ]);
    });

    it('treats touching windows as one stretch with one grid', () => {
      // Separately, 11:30 wouldn't fit before 12:00; joined, 11:30-12:30 is inside the stretch.
      expect(starts(['08:30-12:00', '12:00-14:00'])).toEqual([
        '08:30', '09:30', '10:30', '11:30', '12:30',
      ]);
    });

    it('accepts windows in any order', () => {
      expect(starts(['14:00-16:00', '08:00-10:00'])).toEqual(['08:00', '09:00', '14:00', '15:00']);
    });
  });

  describe('bookings', () => {
    it('removes a booked start', () => {
      expect(starts(['08:00-12:00'], { bookings: ['09:00-10:00'] })).toEqual(['08:00', '10:00', '11:00']);
    });

    it('allows meetings that only touch a booking', () => {
      expect(starts(['08:00-11:00'], { bookings: ['10:00-11:00'] })).toEqual(['08:00', '09:00']);
    });

    it('removes every start whose meeting would overlap the booking', () => {
      // 08:00-10:00 only touches the booking; 09:00 and 10:00 overlap it; 11:00 doesn't fit.
      expect(starts(['08:00-12:00'], { length: 120, bookings: ['10:00-11:00'] })).toEqual(['08:00']);
      expect(starts(['08:00-13:00'], { length: 120, bookings: ['10:00-11:00'] })).toEqual(['08:00', '11:00']);
    });

    it('handles an off-grid booking (e.g. booked before the unit changed)', () => {
      expect(starts(['08:00-12:00'], { bookings: ['09:30-10:30'] })).toEqual(['08:00', '11:00']);
    });

    it('handles a booking that starts before the window', () => {
      expect(starts(['08:00-12:00'], { bookings: ['07:00-09:00'] })).toEqual(['09:00', '10:00', '11:00']);
    });

    it('mixes meeting lengths: a 3-hour intake only where 3 free hours are', () => {
      const bookings = ['09:00-10:00', '13:00-14:00'];
      expect(starts(['08:00-18:00'], { length: 180, bookings })).toEqual(['10:00', '14:00', '15:00']);
      expect(starts(['08:00-18:00'], { length: 60, bookings })).toEqual([
        '08:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00',
      ]);
    });
  });

  describe('today', () => {
    it('offers nothing that starts before now', () => {
      expect(starts(['08:00-12:00'], { notBefore: '09:15' })).toEqual(['10:00', '11:00']);
    });

    it('offers a start that is exactly now', () => {
      expect(starts(['08:00-12:00'], { notBefore: '10:00' })).toEqual(['10:00', '11:00']);
    });

    it('offers nothing once the day is over', () => {
      expect(starts(['08:00-12:00'], { notBefore: '12:00' })).toEqual([]);
    });
  });

  it('refuses a zero unit instead of looping forever', () => {
    expect(() => starts(['08:00-12:00'], { unit: 0 })).toThrow(RangeError);
  });
});

describe('mergeRanges', () => {
  it('joins overlapping and touching ranges, keeps separate ones', () => {
    expect(mergeRanges(['10:00-12:00', '08:00-09:00', '09:00-09:30', '11:00-13:00', '15:00-16:00'].map(range))).toEqual(
      ['08:00-09:30', '10:00-13:00', '15:00-16:00'].map(range),
    );
  });

  it('drops empty and invalid ranges instead of corrupting the others', () => {
    const ranges = [range('08:00-12:00'), { start: 1320, end: 0 }, { start: 600, end: 600 }, { start: NaN, end: 700 }];
    expect(mergeRanges(ranges)).toEqual([range('08:00-12:00')]);
  });

  it('does not change its input', () => {
    const input = ['08:00-09:00', '09:00-10:00'].map(range);
    mergeRanges(input);
    expect(input).toEqual(['08:00-09:00', '09:00-10:00'].map(range));
  });
});

describe('windowsForDate', () => {
  const weekly = [
    { weekday: 3, start: '08:00', end: '14:00' },
    { weekday: 3, start: '14:45', end: '18:00' },
    { weekday: 4, start: '09:00', end: '15:00' },
  ];

  it('takes the weekly windows of the date\'s weekday', () => {
    // 2026-10-14 is a Wednesday.
    expect(windowsForDate('2026-10-14', weekly, [])).toEqual(['08:00-14:00', '14:45-18:00'].map(range));
  });

  it('adds an extra window on a day off', () => {
    // 2026-10-18 is a Sunday: no weekly windows.
    const extra = [{ date: '2026-10-18', start: '10:00', end: '13:00' }];
    expect(windowsForDate('2026-10-18', weekly, extra)).toEqual([range('10:00-13:00')]);
  });

  it('returns the windows as stored, sorted (freeStartTimes does the merging)', () => {
    const extra = [{ date: '2026-10-14', start: '06:00', end: '07:00' }];
    expect(windowsForDate('2026-10-14', weekly, extra)).toEqual(['06:00-07:00', '08:00-14:00', '14:45-18:00'].map(range));
  });

  it('ignores extra windows on other dates', () => {
    const extra = [{ date: '2026-10-21', start: '19:00', end: '21:00' }];
    expect(windowsForDate('2026-10-14', weekly, extra)).toEqual(['08:00-14:00', '14:45-18:00'].map(range));
  });
});

describe('weekdayOf', () => {
  it('counts Sunday as 0, whatever the server time zone', () => {
    expect(weekdayOf('2026-10-11')).toBe(0);
    expect(weekdayOf('2026-10-17')).toBe(6);
    expect(weekdayOf('2027-01-01')).toBe(5);
  });
});

describe('isOpenForBooking', () => {
  it('is open from today up to and including "open until"', () => {
    expect(isOpenForBooking('2026-10-12', '2026-10-12', '2026-11-30')).toBe(true);
    expect(isOpenForBooking('2026-11-30', '2026-10-12', '2026-11-30')).toBe(true);
  });

  it('is closed after "open until" and before today', () => {
    expect(isOpenForBooking('2026-12-01', '2026-10-12', '2026-11-30')).toBe(false);
    expect(isOpenForBooking('2026-10-11', '2026-10-12', '2026-11-30')).toBe(false);
  });

  it('is closed everywhere until a period was opened', () => {
    expect(isOpenForBooking('2026-10-12', '2026-10-12', null)).toBe(false);
  });
});

describe('windowsOnDate', () => {
  it('lists the windows of a date as stored, extra ones marked', () => {
    const weekly = [{ weekday: 0, start: '14:00', end: '17:00' }];
    const extra = [{ date: '2026-10-18', start: '19:00', end: '21:00' }];
    expect(windowsOnDate('2026-10-18', weekly, extra)).toEqual([
      { start: '14:00', end: '17:00', extra: false },
      { start: '19:00', end: '21:00', extra: true },
    ]);
  });
});

describe('overlapsOrTouches', () => {
  it('is true for overlapping and touching ranges, false for apart ones', () => {
    expect(overlapsOrTouches(range('08:00-12:00'), range('11:00-13:00'))).toBe(true);
    expect(overlapsOrTouches(range('08:00-12:00'), range('12:00-13:00'))).toBe(true);
    expect(overlapsOrTouches(range('08:00-12:00'), range('12:30-13:00'))).toBe(false);
  });
});
