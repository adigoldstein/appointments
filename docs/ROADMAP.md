# Roadmap

Snapshot from the slice-1 planning session (2026-07-13). This is a plan, not a spec — it will drift as work progresses. The app is a **POC, not a production system** — edge cases that only matter at scale are deliberately left out. See [CONTEXT.md](../CONTEXT.md) for domain vocabulary and `docs/adr/` for the decisions behind it.

## Slice 1 — walking skeleton

Sequenced by dependency; each epic is independently shippable once its dependencies are done.

1. **App Shell & Navigation** — role-based responsive nav (persistent bar on desktop, `MatSidenav` drawer on mobile), header, wiring the shell into the existing route-guarded feature libs. No backend dependency; can run in parallel with anything below.
2. **Provider Onboarding & Settings** — `ProviderSettings` entity + migration, atomic settings-creation endpoint, backend onboarding gate, frontend settings form + redirect guard.
3. **Active/Inactive Users** — `deactivatedAt` on `User` + migration, login/JWT rejection for inactive users, deactivate/reactivate via the existing `PATCH users/:userId`, `create-user` conflict detection + reactivation prompt, removal of `DELETE users/:userId`.
   - *Added 2026-10-04:* a deactivated Provider's Clients are also blocked from logging in — derived at login/refresh/JWT time from the Provider's `deactivatedAt`, not cascaded onto Client rows, so reactivating the Provider restores exactly the Clients who weren't individually deactivated. The `reactivatable` 409 hint must only be returned when the actor may actually reactivate that user (no cross-tenant leak of user ids). Admin needs a Provider-listing endpoint (today `GET /auth/users` lists Clients only).
   - *Frontend:* client list (paged, active/inactive badge), add-client form as a reusable lib component (handles the reactivation prompt), deactivate/reactivate actions — all built to act on behalf of a selected Provider so the Admin reuses them ([ADR-0004](adr/0004-acting-on-behalf-of-lower-roles.md)).
4. **Slot Management (Provider)** — `Appointment` entity + migration, create-slot endpoint (duration validated against settings, overlap rejected), list-own-slots endpoint, delete-slot endpoint (`OPEN` only), frontend slot-creation form + provider calendar view.
5. **Client Booking** — list-available-slots endpoint (own linked Provider only), book-slot endpoint (client self-service, checks active status), Provider-books-for-client endpoint, frontend booking flow + "my appointments" view.
6. **Cancellation** — unbook/cancel endpoint (shared for Client and Provider actors), cancellation-window enforcement (Client only, Provider/Admin exempt), `AppointmentEvent` entity + migration, wiring booking/cancellation to write events.
7. **In-App Notifications** — `notificationsLastViewedAt` cursor on `User` + migration, notification-feed endpoint (symmetric by role, cursor-based), mark-as-viewed endpoint, frontend inbox for both dashboards.

**Next plan after the user lists** (decided 2026-10-07): a user details / edit page, opened from a row in the list. Planned in `docs/plans/edit-user.md` (approved 2026-10-08); no password on that screen.

**Waiting in line** (2026-10-08):
- **Client picker in the context bar**: keep, change or remove it; decides client-list plan step 7 ("עבודה בשמו", parked).
- **Changing passwords**, to discuss: a user changing their own (old + new + confirm), a Provider setting one for their Clients, the Admin for anyone.
- **Redesign audit** of the existing screens against the design skills (collected so far: em-dashes in UI text, the hand-drawn eye icon in `ui-input`, `--color-text-muted` below WCAG AA, the loud `secondary` button, Latin text in RTL inputs such as search, a neutral-named secondary text token).

**Cross-cutting — acting on behalf ([ADR-0004](adr/0004-acting-on-behalf-of-lower-roles.md))**: every role can use the pages of the roles below it. Admin picks a Provider (and optionally one of that Provider's Clients); a Provider picks one of their Clients. Pages are reusable lib components that take the acting target as input; backend endpoints from Epic 3 onward take the target id explicitly and authorize it against the real actor. Needs: an acting-context service on the frontend, autocomplete pickers, hierarchical route guards. Admin acting for a not-yet-onboarded Provider is offered the onboarding form (fill it in for them, or skip and leave it to the Provider's first login) — provider-settings endpoints must accept a target Provider id for Admin. Open question: picker placement (global in the shell header vs. per page).

**Fast-follow, once Epic 4 is solid**: whole-day bulk delete/withdraw endpoint + UI (atomic — unbooks any `BOOKED` rows for that Provider+date, then deletes the resulting `OPEN` rows).

## Explicitly deferred (raised during planning, not designed in depth, not in slice 1)

- **Weekly recurring appointments** — needs a series entity + a background job maintaining a rolling ~4-week-ahead horizon.
- **Appointment summaries/notes** — a Provider writing notes after an appointment. Needs a `COMPLETED` `AppointmentEvent` type and a summary entity keyed to that specific event (not to the `Appointment` row, since the row gets reused for future bookings).
- **Billing** — manual appointment-completion marking, payment tracking (`paidAt`), invoice tracking (`invoicedAt`), and versioned per-client/per-duration pricing. Sketched shape if/when this gets built: `PriceRate { providerId, clientId (nullable), duration, price, validFrom }`, resolved by "latest `validFrom` ≤ date wins"; a `null` `clientId` row is the Provider-wide default rate, a set `clientId` overrides it for that Client.
- **Multi-channel notification delivery** (email/Telegram/WhatsApp) — needs a real outbox/dispatcher entity that consumes `AppointmentEvent`, tracking per-channel send status. The in-app notification design (deriving from `AppointmentEvent` + a cursor) stays as-is underneath it.
- **WebSocket real-time notifications** — an enhancement layered on top of the polling/cursor design, not a replacement for it.
- **Minimum booking lead time** — mirror of the cancellation window, but restricting how last-minute a Client can book.
- **Require-approval bookings** — a `PENDING` status, non-instant-book flow.
- **Working-hours templates, buffer time between appointments, per-Provider timezone** — only relevant once bulk/recurring slot generation exists. The app is currently Israel-only / single-timezone.
- **Same person as a Client of several Providers** — not planned (decided 2026-10-04). This is a POC: a Client belongs to exactly one Provider and email stays globally unique, so a Provider simply can't add a Client whose email is already used elsewhere. If it's ever needed, the direction discussed was splitting login identity (`users`) from per-Provider client records (`clients`).
- **Per-Provider staff/receptionist role** — distinct from the global `ADMIN`. Nobody has asked for this yet.
- **Signal Forms** (decided 2026-10-06, deferred) — experimental in Angular 21, which we're on; forms stay Reactive Forms until we upgrade to Angular 22, where they're expected to be stable. Custom controls are already shaped for it: `ui-autocomplete`'s `value` is a `model()` (Signal Forms' `FormValueControl`), so on migration its ControlValueAccessor is simply deleted. `ui-input` still needs the same `model()` treatment then.

## Design system note

`libs/design-system` already implements a warm-monochrome minimalist palette (Rubik typeface, dual Hebrew/Latin support) — this was in place before slice-1 planning and doesn't need rework. Token set is intentionally lean (~30 color tokens); new tokens require explicit sign-off before being added, to avoid sprawl. Token-only enforcement (no hardcoded colors/pixel values) is planned as a stylelint rule, added as part of the App Shell epic.
