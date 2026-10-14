# Roadmap

Snapshot from the slice-1 planning session (2026-07-13). This is a plan, not a spec — it will drift as work progresses. The app is a **POC, not a production system** — edge cases that only matter at scale are deliberately left out. See [CONTEXT.md](../CONTEXT.md) for domain vocabulary and `docs/adr/` for the decisions behind it.

## Slice 1 — walking skeleton

Sequenced by dependency; each epic is independently shippable once its dependencies are done.

1. **App Shell & Navigation** — role-based responsive nav (persistent bar on desktop, `MatSidenav` drawer on mobile), header, wiring the shell into the existing route-guarded feature libs. No backend dependency; can run in parallel with anything below.
2. **Provider Onboarding & Settings** — `ProviderSettings` entity + migration, atomic settings-creation endpoint, backend onboarding gate, frontend settings form + redirect guard.
3. **Active/Inactive Users** — `deactivatedAt` on `User` + migration, login/JWT rejection for inactive users, deactivate/reactivate via the existing `PATCH users/:userId`, `create-user` conflict detection + reactivation prompt, removal of `DELETE users/:userId`.
   - *Added 2026-10-04:* a deactivated Provider's Clients are also blocked from logging in — derived at login/refresh/JWT time from the Provider's `deactivatedAt`, not cascaded onto Client rows, so reactivating the Provider restores exactly the Clients who weren't individually deactivated. The `reactivatable` 409 hint must only be returned when the actor may actually reactivate that user (no cross-tenant leak of user ids). Admin needs a Provider-listing endpoint (today `GET /auth/users` lists Clients only).
   - *Frontend:* client list (paged, active/inactive badge), add-client form as a reusable lib component (handles the reactivation prompt), deactivate/reactivate actions — all built to act on behalf of a selected Provider so the Admin reuses them ([ADR-0004](adr/0004-acting-on-behalf-of-lower-roles.md)).
4. **Slot Management (Provider)** — reshaped 2026-10-12 by [ADR-0009](adr/0009-availability-windows-and-meeting-types.md); plan: `docs/plans/slot-management.md`. Appointment settings (time unit, meeting types, weekly windows with breaks, cancellation window), opening a period ("open until"), one-off extra windows, recurring appointments, weekly view, Provider home page, app-wide schedule cache.
5. **Client Booking** — free times for the Client's own Provider (only open dates, only the Client's meeting types), one-time (default) or series booking with the taken-dates check, Provider-books-for-client (may go beyond "open until", warned about series), per-Client meeting types screen, the Client's home page and "my appointments".
6. **Cancellation** — cancel endpoint (marks `CANCELLED`, shared for Client and Provider actors), cancellation-window enforcement (Client only, Provider/Admin exempt), `AppointmentEvent` entity + migration, wiring booking/cancellation to write events.
7. **In-App Notifications** — `notificationsLastViewedAt` cursor on `User` + migration, notification-feed endpoint (symmetric by role, cursor-based), mark-as-viewed endpoint, frontend inbox for both dashboards.
8. **Meeting summaries & follow-ups** (added 2026-10-14) — an optional summary per appointment (free text, written after the meeting, editable) and follow-ups from it: a task text, an optional due date, and a status **open / closed**. Open follow-ups show on the Provider's home page (dashboard); a client's page lists their past meetings with summaries and follow-ups. Each appointment is its own row (ADR-0009), so both attach to it directly. Privacy (decided 2026-10-14): only the Provider sees summaries and follow-ups — not the Client, and not the Admin even when acting for the Provider; sharing a summary with the Client could come later as a toggle.
9. **Pricing & payments** (added 2026-10-14) — prices: a default per meeting type, and each Client can have their own price, overriding the type's default (decided 2026-10-14). The price is copied onto each appointment when it's booked. Changing a Client's price applies from that moment on: past meetings keep theirs, and the Client's future booked meetings are updated to the new price (decided 2026-10-14). Then: mark as paid (date, optional method), each Client's debt (past unpaid meetings) on the client list and page, total debt on the home page, and an in-app payment request ("meeting on 14.10, ₪300, not paid yet", needs Epic 7). POC: paid / unpaid only (no partial payments), ₪ only. Later and separate: an income report (per month, per meeting type, paid vs owed), and payment requests by email / SMS / WhatsApp.

## Progress (2026-10-08)

| | Status |
|---|---|
| 1. App Shell & Navigation | ✅ done |
| 2. Provider Onboarding & Settings | ✅ done |
| 3. Active/Inactive Users | ✅ done: backend, add-user page, Clients and Providers lists with deactivate / reactivate, edit page (`docs/plans/client-list.md`, `docs/plans/edit-user.md`). Only the "עבודה בשמו" row shortcut is parked (below). |
| Acting on behalf (cross-cutting) | ✅ done: acting context held as state, context bar with Provider / Client pickers (ADR-0004, ADR-0005) |
| Conventions | ✅ thin app + Signal Stores (ADR-0007), Hebrew-only UI (ADR-0006), types and API contracts (ADR-0008) |
| 4. Slot Management | not started |
| 5. Client Booking | not started |
| 6. Cancellation | not started |
| 7. In-App Notifications | not started |
| 8. Meeting summaries & follow-ups | planned (2026-10-14) |
| 9. Pricing & payments | planned (2026-10-14) |

**Waiting in line** (2026-10-08), before or alongside Epic 4:
- **Client picker in the context bar**: keep, change or remove it; decides client-list plan step 7 ("עבודה בשמו", parked).
- **Changing passwords**, to discuss: a user changing their own (old + new + confirm), a Provider setting one for their Clients, the Admin for anyone.
- **Redesign audit** of the existing screens against the design skills. Collected so far:
  - em-dashes in UI text;
  - the hand-drawn eye icon in `ui-input`;
  - `--color-text-muted` below WCAG AA, and a neutral-named secondary text token to replace the borrowed one;
  - the loud `secondary` button;
  - Latin text in RTL inputs such as search;
  - `ui-input` renders its error inside the `<label>`, so the field's accessible name becomes "label + error";
  - **component style budget** (`users-list.page.scss` is ~4.5 kB against the 4 kB warning): move repeated helpers (e.g. `visually-hidden`, skeleton bars) into `libs/design-system` once, and split the users list into smaller components (row, empty / error states), each with its own styles. Don't raise the budget.

**Cross-cutting — acting on behalf ([ADR-0004](adr/0004-acting-on-behalf-of-lower-roles.md))**: every role can use the pages of the roles below it. Admin picks a Provider (and optionally one of that Provider's Clients); a Provider picks one of their Clients. Pages are reusable lib components that take the acting target as input; backend endpoints from Epic 3 onward take the target id explicitly and authorize it against the real actor. Needs: an acting-context service on the frontend, autocomplete pickers, hierarchical route guards. Admin acting for a not-yet-onboarded Provider is offered the onboarding form (fill it in for them, or skip and leave it to the Provider's first login) — provider-settings endpoints must accept a target Provider id for Admin. Picker placement: decided, the context bar under the shell header (ADR-0005).

**Fast-follow, once Epic 4 is solid**: closed dates (vacation) and one-off closed hours on a specific date, cancelling (after confirmation) any `BOOKED` appointments in that time. Replaces the earlier "whole-day bulk delete" idea, which assumed pre-created `OPEN` rows (ADR-0001, replaced).

## Explicitly deferred (raised during planning, not designed in depth, not in slice 1)

- ~~**Weekly recurring appointments**~~ — moved into Epic 4 (2026-10-12): recurring appointments are rules booked into each opened period (ADR-0009). What stays deferred is the **automatic daily job** that moves "open until" forward by itself; it will reuse the same "open period" logic.
- **Billing** — now Epic 9 (pricing & payments, above). The layers below are the original sketch; Epic 9 refines layers 1-3, and layer 4 plus an income report stay later:
  1. **Paid / not paid** on the Appointment row itself (`paidAt`, optional `amount`, `paymentMethod`), separate from `status` (a cancelled meeting can still be paid, a booked one unpaid). A "mark as paid" action and a badge in the views. One migration; small.
  2. **Prices**: per meeting type, with an optional per-Client override. Versioned shape if needed: `PriceRate { providerId, meetingTypeId, clientId (nullable), price, validFrom }`, "latest `validFrom` ≤ date wins".
  3. **Unpaid reminder** (in-app): one more notification type in Epic 7, sent by a scheduled backend job (the same infrastructure as the automatic "open until" job). Small once both exist.
  4. **Automatic payment request after the meeting**: a `payment_requests` table (appointment, sent at, status sent / paid / failed / expired, link, provider reference), a payment provider (e.g. Grow, Tranzila, PayPlus) with a verified webhook that marks the Appointment paid, receipts / invoices through an invoicing service (e.g. Morning) for Israeli tax rules, and delivery over email / SMS / WhatsApp (the multi-channel outbox below). Medium to large, almost all of it integrations. The job must be idempotent (never send twice).
- **Multi-channel notification delivery** (email/Telegram/WhatsApp) — needs a real outbox/dispatcher entity that consumes `AppointmentEvent`, tracking per-channel send status. The in-app notification design (deriving from `AppointmentEvent` + a cursor) stays as-is underneath it.
- **WebSocket real-time notifications** — an enhancement layered on top of the polling/cursor design, not a replacement for it.
- **Minimum booking lead time** — mirror of the cancellation window, but restricting how last-minute a Client can book.
- **Require-approval bookings** — a `PENDING` status, non-instant-book flow.
- **Per-Provider timezone** — the app is Israel-only / single-timezone. (Working-hours templates moved into Epic 4 as weekly windows; buffer time was replaced by the time unit and meeting lengths, ADR-0009.)
- **Same person as a Client of several Providers** — not planned (decided 2026-10-04). This is a POC: a Client belongs to exactly one Provider and email stays globally unique, so a Provider simply can't add a Client whose email is already used elsewhere. If it's ever needed, the direction discussed was splitting login identity (`users`) from per-Provider client records (`clients`).
- **Per-Provider staff/receptionist role** — distinct from the global `ADMIN`. Nobody has asked for this yet.
- **Visual editing in the weekly view** (raised 2026-10-12, deferred). Two stages: (1) click an empty spot to open the matching form pre-filled (meeting, break, extra hours), click a meeting to open it; (2) real drag and drop: drag to create, drag a meeting to move it (rescheduling, so the Client is notified), drag a window edge to change hours. Forms stay as the keyboard/phone/accessible path. The time-unit grid (ADR-0009) makes snapping simple. Best after Epics 5-6, when the scheduling model is stable.
- **Signal Forms** (decided 2026-10-06, deferred) — experimental in Angular 21, which we're on; forms stay Reactive Forms until we upgrade to Angular 22, where they're expected to be stable. Custom controls are already shaped for it: `ui-autocomplete`'s `value` is a `model()` (Signal Forms' `FormValueControl`), so on migration its ControlValueAccessor is simply deleted. `ui-input` still needs the same `model()` treatment then.

## Design system note

`libs/design-system` already implements a warm-monochrome minimalist palette (Rubik typeface, dual Hebrew/Latin support) — this was in place before slice-1 planning and doesn't need rework. Token set is intentionally lean (~30 color tokens); new tokens require explicit sign-off before being added, to avoid sprawl. Token-only enforcement (no hardcoded colors/pixel values) is planned as a stylelint rule, added as part of the App Shell epic.
