# Plan: slot management (Epic 4)

Status: **approved 2026-10-12**; steps 1-3 done.
Builds on ADR-0009 (availability windows, meeting types, bookings as the only appointment rows), ADR-0004/0005 (acting on behalf), ADR-0006 (Hebrew-only), ADR-0007/0008 (libs, stores, contracts).

## Goal

A Provider defines when they work and which kinds of meetings they hold, opens their calendar for a period, adds one-off extra hours, and sets up their Clients' fixed weekly meetings. They see their week at a glance, and their home page tells them what's coming up and how far ahead they are open. An Admin can do all of it for a selected Provider.

## In scope

- **Appointment settings** (new screen, "הגדרות תורים"):
  - time unit: 30 or 60 minutes; meetings start only on its grid;
  - meeting types: name, length (a multiple of the time unit), "for new Clients by default". No break field;
  - weekly working hours, with breaks inside the day ("הוספת הפסקה"); underneath, a day is one or more windows, and the grid restarts at each one (a break at 14:00-14:45 gives starts at 14:45, 15:45, ...);
  - cancellation window (moved here from onboarding).
- **Onboarding** keeps only the business details: business name and Client label.
- **Opening a period**: move "open until" forward, up to 3 months from today, with a preview first.
- **Extra windows**: a one-off window on a specific date, any length (e.g. Sunday 10:00-13:00).
- **Recurring appointments**: Client + meeting type + weekday + start time + start date (optional end date). Booked for every open date; added right away for dates already open. Before saving, every open date is checked and the taken ones are listed for confirmation ("14.1 and 28.1 are taken. Continue?"); the series is created without them. The same check serves the Client's own series booking in Epic 5.
- **Weekly view**: windows, booked appointments, and what isn't open yet. Week navigation. On a phone: one day at a time.
- **Provider home page**: "open until" with an "open more" action, and the upcoming appointments.
- **Schedule cache** (decided 2026-10-12): an app-wide Signal Store (`ScheduleStore`, `providedIn: 'root'`, never in a route's `providers`) keeps what the home page and the weekly view loaded, so leaving and coming back costs no request. Cleared by any change made in this tab (like `usersChanged$`), by switching Provider or logging out, and after 5 minutes. A "רענון" button with "עודכן ב-10:42" on both screens forces a fresh load, for changes made by others (e.g. Client bookings in Epic 5).

## Out of scope (later)

- Client booking, the Client's home page, the per-Client meeting types screen (Epic 5). The data model for per-Client types is decided in ADR-0009. Decided for Epic 5 (2026-10-12): the Client chooses one-time (the default) or series; a series shows the taken dates and asks to confirm, and the Client books alternatives for those dates themselves.
- A Provider booking a single meeting for a Client (Epic 5). Decided (2026-10-12): the Provider may book beyond "open until" (Clients can't); that booking is also checked against recurring rules and warned before saving ("Wednesday 10:00 will be taken by Yosef Levi's series. Continue?"), see ADR-0009.
- Cancelling (Epic 6).
- The automatic daily job that moves "open until" (future; it will call the same "open period" logic).
- Notifications, including "time to open next month" (Epic 7).
- Closed dates (vacation) and one-off closed hours on a specific date ("out on Thursday 12:00-13:00"). Later, together; for now the Provider adjusts windows.

## Screens

```
הגדרות תורים
┌──────────────────────────────────────────────┐
│ יחידת זמן     (•) שעה   ( ) חצי שעה            │
│ סוגי פגישות                        [הוספה]   │
│  פגישה רגילה    שעה          ✓ ברירת מחדל      │
│  פגישת היכרות   3 שעות                         │
│ שעות פעילות                                   │
│  רביעי   08:00-18:00  הפסקה 14:00-14:45  [הוספת הפסקה] │
│  חמישי   09:00-15:00                [הוספת הפסקה] │
│ חלון ביטול   [24 שעות]                         │
└──────────────────────────────────────────────┘

דף הבית
┌──────────────────────────────────────────────┐
│ פתוח להזמנות עד 30.11      [פתיחת תורים]      │
│ התורים הקרובים                                │
│  רביעי 15:00  דנה כהן   פגישה רגילה            │
└──────────────────────────────────────────────┘

פתיחת תורים (dialog)
  פתיחה עד [31.12]
  ייפתחו 9 ימי עבודה. ייקבעו 8 פגישות קבועות.
  לא נקבעו 2: דנה כהן 24.12 (השעה תפוסה), ...
  [פתיחה] [ביטול]
```

Weekly view: a column per day (one day on a phone), hours down the side. Windows are a light background, bookings are blocks with the Client's name and type, extra windows are marked, days after "open until" are greyed out with "עוד לא נפתח".

## Where things live

| Piece | Where |
|---|---|
| Entities, migrations, free-time calculation, open period, recurring | backend: new `scheduling` module |
| API shapes | `@app/shared/types` (`MeetingType`, `WeeklyWindow`, `ExtraWindow`, `Appointment`, `…Request`) |
| Appointment settings page, weekly view, open-period dialog, extra window and recurring forms | new lib `feature-schedule`, mounted inside the Provider area (so Admin acting works with no extra routes) |
| Home page | `feature-provider` overview page, using `feature-schedule` pieces |
| HTTP | new `ScheduleApiService` (stateless, like `UsersApiService`), announces changes |
| Cache | `ScheduleStore` (Signal Store, app-wide) in a new `@app/shared/schedule` lib, used by both `feature-provider` and `feature-schedule` |

**Data** (ADR-0009): `meeting_types`, `weekly_windows`, `extra_windows`, `recurring_appointments`, `appointments` (with the exclusion constraint), `client_meeting_types` (filled from defaults on Client creation; screen in Epic 5), `provider_settings.open_until`. `provider_settings.time_unit_minutes` is new. `allowed_durations_minutes` is migrated into meeting types ("פגישה של X דקות", default for new Clients) and then dropped: the time unit becomes 60 if every duration is a multiple of 60, otherwise 30, and a duration that isn't a multiple of 30 is dropped (the only Provider in the dev database has 30/60/120, so nothing is lost).

## Steps (each reviewed and committed separately)

1. **ADR-0009 accepted + CONTEXT.md vocabulary** (docs only). ADR-0001 marked replaced. ROADMAP Epics 4-6 and the deferred list aligned.
2. **Backend: settings model.** Time unit, meeting types (lengths validated against it), weekly windows, cancellation window, migration from allowed durations, `client_meeting_types` defaults. CRUD endpoints, Admin with `providerId`.
3. **Frontend: split settings.** Onboarding = business details. New "הגדרות תורים" page.
4. **Backend: availability.** `appointments` table + exclusion constraint, extra windows, the free-time calculation, open period (preview + apply), "open until".
5. **Frontend: weekly view** (read-only) + open-period dialog + extra window form.
6. **Recurring appointments**, backend + frontend: the form (Client chosen by autocomplete inside the form), placing on open dates, the skipped report.
7. **Provider home page**: "open until" card + upcoming appointments.

The `ScheduleStore` and the refresh button arrive with the first screen that loads schedule data (step 5) and are reused in step 7.

## How each step is tested

- Backend steps: API tests as before (seeded test users, cleaned up after), including tenant isolation (a Provider never sees or changes another Provider's schedule) and Admin acting.
- The free-time calculation: many cases (several windows, breaks between windows and the grid restarting after them, extra windows, mixed meeting lengths, edges of windows, "open until", past times). See open question 3.
- Frontend steps: browser tests as before, plus screenshots at desktop, mid and phone widths.
- Every step: build, lint, regression suites, `/code-review`.

## Decisions (2026-10-12)

1. **Breaks**: decided (2026-10-12). No break field on meeting types (a Provider who wants time to themselves ends a 1-hour meeting at :45). Holes are prevented by the time unit: every length is a multiple of it and starts are on its grid. Breaks inside the day are gaps between windows; the grid restarts after each.
2. **Weekly view**: decided (2026-10-12), our own component, no calendar library.
3. **Tests for the free-time calculation**: decided (2026-10-12), add Jest to the backend (dev-time only) for this logic; API tests alone are a slow way to cover its many cases.
4. **Removing a meeting type that has appointments**: decided (2026-10-12), it is archived (hidden for new bookings, kept on existing ones). A type with no appointments is deleted.
5. **Changing windows when the period is already open**: decided (2026-10-12). New bookings follow the new windows immediately. Booked appointments that fall outside the new windows are **cancelled**, not kept: before saving, the Provider sees them listed in a strong warning ("3 פגישות יבוטלו: ...") and confirms. The Client and the Provider are notified (in-app, Epic 7; until then the warning on save is the only signal). Cancelled = marked `CANCELLED` with an `AppointmentEvent`, as every cancel (ADR-0009).
6. **Series dates that aren't open yet**: decided (2026-10-12). They can only be taken by a Provider booking beyond "open until", and that booking is warned about the series at the time (ADR-0009). When the period opens, such a date is skipped and shown in the opening preview (and, once Epic 7 exists, notified to the Client).

## Open, later (raised 2026-10-12, deferred "if needed")

- **Time unit guidance**: recommend "unit = the shortest meeting type" on the settings screen, and warn when the unit is shorter than every type (a gap of one unit can then be unusable). ADR-0009 says every gap "is still bookable"; that holds only when a type of the unit's length exists. Fix the wording with this.
- **More time units** (15, 45): one constant, the type, and a DB check (migration).
- **Windows ending at midnight**: `HH:MM` stops at 23:59 and native time inputs can't express 24:00, so a day can't run until midnight. Fine for the POC.
- **A shared `ui-segmented`** (the toggle used by the users list status filter and the time unit choice): extract it in the redesign audit.
- **Backend lint**: the backend project has no Nx tags, so every `@app/shared/*` import fails `@nx/enforce-module-boundaries` (pre-existing). Tag it and allow it to depend on shared libs.
