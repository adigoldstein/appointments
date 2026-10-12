# Appointments

A multi-tenant scheduling system where independent Providers (a doctor, a salon, etc.) manage bookable time with their own Clients. Providers are never related to one another — each is a fully isolated slice of the data.

## Roles

**Provider**:
A User with role `PROVIDER`. Owns their own Clients, Appointments, and settings, and is the tenant boundary for all of it — no data or client relationship is ever shared between Providers.
_Avoid_: Business, vendor, practitioner

**Client**:
A User with role `CLIENT`, linked to exactly one owning Provider. A Client only ever sees and books that one Provider's Appointments — there is no cross-provider marketplace.
_Avoid_: Customer, patient, user (a Provider's `ProviderSettings.clientLabel` may *display* a different word, like "Patient," in that Provider's own UI — but the domain term stays Client)

**Admin**:
A single global platform-operator role with cross-tenant visibility and edit access, distinct from any Provider. Not scoped to one Provider's data.
_Avoid_: Super user, staff

**Tenant**:
Informal term for a Provider considered as a data-isolation boundary. There is no separate Tenant entity — every table scopes to a Provider (directly, or via its Client/Appointment chain), and that scoping *is* the tenancy.
_Avoid_: Organization, account, workspace

## Scheduling

See ADR-0009 for the model behind these terms.

**Appointment**:
One booked meeting: a Provider, a Client, a Meeting type, a start and an end. A row exists only once something is booked; free time is never stored as rows. Its `status` is `BOOKED` or `CANCELLED`.
_Avoid_: Slot, booking, reservation (used interchangeably in conversation, but "Appointment" is the canonical row)

**Meeting type**:
A kind of meeting a Provider offers, with a name and a total length that is a multiple of the Time unit (e.g. "פגישה רגילה", 1 hour; "פגישת היכרות", 3 hours). There is no separate break: any time the Provider wants to themselves is inside the length. A type that has Appointments is archived, never deleted.
_Avoid_: Service, duration

**Time unit**:
A Provider's scheduling grid, 30 or 60 minutes. Every Meeting type's length is a multiple of it, and Appointments start only on its grid, counted from the start of each Window. This is what keeps a day free of unusable gaps.
_Avoid_: Slot length, step

**Window**:
A stretch of time when a Provider takes Appointments. Weekly windows repeat every week (several per day; a break inside the day is the gap between two windows). An extra window is a one-off on a specific date.
_Avoid_: Working hours (fine in UI copy, but in the model it's Windows), availability block

**Open until**:
The last date a Provider's calendar is open. Clients can book only up to it; the Provider (and the Admin) may book beyond it. Opening a period moves it forward and books Recurring appointments into the newly open dates.
_Avoid_: Booking horizon, publish date

**Recurring appointment**:
A rule that books the same Client, Meeting type, weekday and start time every week ("Dana, every Wednesday at 15:00"), turned into Appointments for every open date. Dates that can't be booked are skipped and reported, never dropped silently.
_Avoid_: Series (fine in conversation and in UI copy), subscription, standing booking

**Free time**:
What can be booked on a day: the day's Windows, up to Open until, minus `BOOKED` Appointments, offered at the Time unit grid. Always calculated, never stored.
_Avoid_: Open slots, availability

**Cancel**:
Marking a `BOOKED` Appointment `CANCELLED`, which frees its time. Performed by the Client (only outside their Provider's cancellation window) or by the Provider/Admin (always exempt from the window); also happens when a Provider shrinks their Windows over booked time, after confirming. The row stays as history; who cancelled and when lives in an AppointmentEvent.
_Avoid_: Unbook, delete, withdraw (Appointments are never deleted)

**AppointmentEvent**:
An immutable log entry recording that an Appointment was booked or cancelled — who did it and when. It also doubles as the source for both Provider- and Client-facing in-app notifications.
_Avoid_: Notification, log, audit record

**Client meeting types**:
The Meeting types a Client may book themselves (e.g. not the intake). Filled from the types marked "for new Clients by default" when the Client is created. The Provider and the Admin can book any type for a Client.
_Avoid_: Permissions, entitlements

**Onboarding gate**:
The rule that a Provider must complete onboarding (ProviderSettings: business name and Client label) before using their area. Opening a period additionally needs the appointment settings: a Time unit, at least one Meeting type and one Window.

**ProviderSettings**:
Per-Provider configuration — business name, the label used for "Client" in that Provider's UI, the cancellation window, the Time unit, and Open until. One row per Provider. Meeting types and Windows are their own rows.
_Avoid_: Preferences, config

## Account Lifecycle

**Deactivation**:
Soft-archiving a Provider or Client (`deactivatedAt` set) instead of deleting them. A deactivated user cannot log in at all, but none of their data is touched or hidden from other people's records — reactivating restores them exactly as they were. Deactivating a Provider also blocks all of their Clients from logging in (derived from the Provider's status, not written onto the Client rows).
_Avoid_: Delete, disable, suspend, archive

## Acting on behalf

**Acting on behalf**:
A higher role using a lower role's pages for a selected target while staying logged in as themselves — an Admin acting for a Provider (and, through them, one of that Provider's Clients), or a Provider acting for one of their own Clients. Rules and audit always use the real actor. See ADR-0004.
_Avoid_: Impersonate, log in as, switch user

**Acting context**:
The Provider and/or Client currently selected by the actor, which reusable pages operate on.
_Avoid_: Session, current user
