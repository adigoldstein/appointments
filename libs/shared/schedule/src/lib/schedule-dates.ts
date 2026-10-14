/**
 * Israel's "today" for the calendar. The app is Israel-only and the browser may be in another
 * time zone, so it's read for Asia/Jerusalem explicitly. Date arithmetic (addDays, weekStartOf…)
 * is shared with the backend in @app/shared/types.
 */
const israelDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' });

export function israelToday(): string {
  return israelDate.format(new Date());
}
