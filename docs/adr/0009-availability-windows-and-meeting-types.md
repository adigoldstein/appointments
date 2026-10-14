# Availability windows, meeting types, and bookings as the only appointment rows

Status: **accepted 2026-10-12.** Replaces [ADR-0001](0001-single-reusable-appointment-row.md).

## Context

ADR-0001 pre-created every bookable slot as an `Appointment` row that flips between `OPEN` and `BOOKED`. That only works when every slot has the same length. Providers need several meeting lengths side by side: for example a 1-hour regular meeting and a 3-hour intake on the same Wednesday. A day can't be cut into slots in advance, because the cut depends on what gets booked.

## Decision

**Availability is rules, not rows.**
- **Time unit** per Provider (30 or 60 minutes). Every meeting length is a multiple of it, and meetings start only on its grid. This is what keeps the day free of unusable holes.
- **Meeting types** per Provider: name and total length, a multiple of the time unit (e.g. "פגישה רגילה" 1 hour, "פגישת היכרות" 3 hours). No separate break: a Provider who wants 15 minutes to themselves ends a 1-hour meeting at :45. They replace `ProviderSettings.allowedDurationsMinutes`.
- **Weekly windows**: weekday + start + end, several per day allowed. A break inside the day is the gap between two windows (e.g. Wed 08:00-14:00 and 14:45-18:00); the settings screen shows it as "working hours + a break".
- **Extra windows**: a one-off window on a specific date (e.g. Sunday 10:00-13:00), not a series. It must not overlap or touch that date's weekly windows (added 2026-10-12): it has its own grid, and merging it into a weekly window would move that day's grid off the existing bookings.
- **Open until**: a date per Provider. Nothing after it can be booked. "Opening" a period moves it forward; a future daily job will move it automatically.

**An appointment row exists only when something is booked**: Provider, Client, meeting type, start and end (start + length). Its status is `BOOKED` or `CANCELLED`. Cancelling marks the row and frees the time; the history stays in `AppointmentEvent`, as before.

**Free times are calculated**, per day: that day's windows (weekly + extra), up to "open until", minus `BOOKED` appointments. Start times are the time-unit grid of each window, counted from that window's start (08:00, 09:00, ...; after a break at 14:00-14:45: 14:45, 15:45, ...). A start is offered where the whole meeting fits inside the window and doesn't overlap a booking. Because every length is a multiple of the unit, any free gap is whole units and still bookable.

**Double booking is prevented by the database**: a Postgres exclusion constraint (`btree_gist`) on the time range of `BOOKED` rows, per Provider. Two concurrent bookings of the same time can't both succeed.

**Recurring appointments** ("Dana, every Wednesday at 15:00, regular meeting") are stored as rules and turned into `BOOKED` rows for each date up to "open until": when a period opens, and right away for dates already open when the rule is created. A date where the time is taken, or outside the windows, is skipped and reported, never silently dropped.

**Booking is one-time (the default) or a series**, for a Client booking themselves (Epic 5) as well as for the Provider. Before a series is created, every open date is checked and the dates that can't be booked are listed ("Wednesdays at 08:00: 14.1 and 28.1 are taken. Continue?"). On confirm, the series is created without those dates, and the Client books alternatives for them separately. One check, used by both the Provider's and the Client's screens.

**Booking beyond "open until"** is allowed for the Provider (and the Admin) only; Clients can book only open dates. Since nothing else can be booked there yet, the only possible clash is with a series that will land on that date when it opens. So a Provider booking beyond "open until" is also checked against the recurring rules, and warned before saving ("Wednesday 10:00 will be taken by Yosef Levi's series. Continue?"). On confirm, that series date is skipped when the period opens, and shown in the opening preview.

**Per-Client meeting types**: each Client has the list of meeting types they may book themselves (e.g. not the intake). A meeting type has a "for new Clients by default" flag that fills this list when a Client is created. The Provider (and the Admin) can always book any type for a Client.

## Consequences

- No `OPEN` status and no "delete an open slot". To make time unavailable, the Provider changes windows or (later) closes a date.
- Opening a period is cheap: one date moves, and only recurring appointments create rows.
- The free-time calculation is the one new piece of logic. It is small (one Provider, one day, a few windows) and must be well tested.
- Changing a meeting type's length affects new bookings only. Changing the time unit is refused while it doesn't divide every active meeting type's length.
- CONTEXT.md vocabulary changes: Appointment = a booking; Cancel = mark cancelled (time is freed); Delete of an Appointment no longer exists.

**Revisit if**: bookings need resources other than the Provider's own time (rooms, staff), or meetings need lengths that aren't multiples of one time unit.
