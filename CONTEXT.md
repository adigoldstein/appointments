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

**Appointment**:
A single row representing one bookable time slot for a Provider, reused across its entire lifecycle. Its `status` (`OPEN` or `BOOKED`) and `clientId` change as it's booked and cancelled, but the row itself is never duplicated for the same time slot.
_Avoid_: Slot, booking, reservation (used interchangeably in conversation, but "Appointment" is the canonical row — see also Cancel and Delete, which are easy to conflate)

**Cancel**:
Releasing a Client from a `BOOKED` Appointment, returning the same row to `OPEN`. Not a terminal action — the Appointment can be rebooked by anyone afterward. Performed by the Client (only outside their Provider's cancellation window) or by the Provider/Admin (always exempt from the window). The fact that a cancellation happened lives only in an AppointmentEvent, never on the Appointment row itself.
_Avoid_: Unbook, delete, withdraw (Delete is a distinct, separate operation — see Delete)

**Delete** (of an Appointment):
Permanently removing an `OPEN` Appointment row from existence. Only possible on `OPEN` rows — a `BOOKED` row must be cancelled first. Only a Provider or Admin can delete.
_Avoid_: Cancel, withdraw, close

**AppointmentEvent**:
An immutable log entry recording that an Appointment was booked or cancelled — who did it and when. This is the only place appointment history lives; it also doubles as the source for both Provider- and Client-facing in-app notifications. The Appointment row itself holds no history.
_Avoid_: Notification, log, audit record

**Onboarding gate**:
The rule that a Provider cannot create any Appointment until their ProviderSettings row exists, created via one atomic setup form.

**ProviderSettings**:
Per-Provider configuration — cancellation window, allowed appointment durations, the label used for "Client" in that Provider's UI, business name, and onboarding completion. One row per Provider.
_Avoid_: Preferences, config

## Account Lifecycle

**Deactivation**:
Soft-archiving a Provider or Client (`deactivatedAt` set) instead of deleting them. A deactivated user cannot log in at all, but none of their data is touched or hidden from other people's records — reactivating restores them exactly as they were.
_Avoid_: Delete, disable, suspend, archive
