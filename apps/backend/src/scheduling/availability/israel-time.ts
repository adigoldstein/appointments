/**
 * The app is Israel-only (ROADMAP): windows and dates are Israel wall-clock time, and appointments
 * are stored as instants (`timestamptz`). These helpers convert between the two with the
 * platform's time-zone data, so daylight saving time is handled without hard-coded offsets.
 */
const ISRAEL = 'Asia/Jerusalem';

const wallClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: ISRAEL,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

interface WallClock {
  date: string;
  minutes: number;
  seconds: number;
}

/** An instant as Israel wall-clock time: its date, minute of the day and second of the minute. */
export function toIsraelTime(instant: Date): WallClock {
  const part = Object.fromEntries(
    wallClock.formatToParts(instant).map((piece) => [piece.type, piece.value]),
  );

  return {
    date: `${part['year']}-${part['month']}-${part['day']}`,
    minutes: Number(part['hour']) * 60 + Number(part['minute']),
    seconds: Number(part['second']),
  };
}

/** How far Israel's wall clock is ahead of UTC at an instant, in milliseconds. */
function offsetAt(epochMs: number): number {
  const { date, minutes, seconds } = toIsraelTime(new Date(epochMs));
  const [year, month, day] = date.split('-').map(Number);
  const asIfUtc = Date.UTC(year, month - 1, day, 0, minutes, seconds);
  return asIfUtc - Math.floor(epochMs / 1000) * 1000;
}

/** The instant when Israel's wall clock shows `date` at `minutes` past midnight. */
export function fromIsraelTime(date: string, minutes: number): Date {
  const [year, month, day] = date.split('-').map(Number);
  const asIfUtc = Date.UTC(year, month - 1, day, 0, minutes);
  // First guess with the offset at that moment read as UTC, then correct once: the two differ
  // only within a few hours of a daylight-saving switch.
  const firstGuess = asIfUtc - offsetAt(asIfUtc);
  return new Date(asIfUtc - offsetAt(firstGuess));
}

/**
 * "Today" and "now" in Israel for the free-time calculation. The minute is rounded UP, so at
 * 10:00:50 a 10:00 start is already in the past.
 */
export function israelNow(instant: Date = new Date()): { today: string; notBeforeMinute: number } {
  const { date, minutes, seconds } = toIsraelTime(instant);
  const pastTheMinute = seconds > 0 || instant.getUTCMilliseconds() > 0;
  return { today: date, notBeforeMinute: pastTheMinute ? minutes + 1 : minutes };
}
