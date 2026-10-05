# Higher roles act on behalf of lower roles, never by logging in as them

Every role can use the pages of the roles below it: an `ADMIN` can pick a Provider and manage everything that Provider manages, then go one level further and pick one of that Provider's Clients; a `PROVIDER` can pick one of their own Clients and use the Client-facing pages (e.g. booking) for them. Pages like "add client" or "book appointment" are therefore built once, as reusable lib components that receive *who they are acting for* rather than assuming the logged-in user.

We considered two ways to build this. **Impersonation** — issuing a token for the selected user so the existing pages "just work" — versus **acting on behalf** — the actor stays logged in as themselves, the frontend holds the selected Provider/Client as an acting context, and backend endpoints accept that target id explicitly. We chose acting on behalf.

Impersonation looks cheaper on the frontend but is wrong on the backend: a Provider impersonating a Client would *be* a `CLIENT` to every check, so they'd hit the Client-only cancellation window they are supposed to be exempt from, and `AppointmentEvent.actorId` would record the Client as the one who booked or cancelled. Fixing that means teaching every service method to look for a hidden "real actor" claim — the same work as acting on behalf, but implicit and easy to forget. The roadmap was already shaped for explicit actors ("Provider-books-for-client endpoint", "Provider/Admin exempt from the cancellation window"), so acting on behalf matches it.

**Consequences**:

- Endpoints that operate on a Provider's or Client's data take the target id explicitly (path or body), and the service authorizes it against the real actor: `ADMIN` may target anyone; `PROVIDER` may target only themselves or Clients with `providerId === actor.userId`; `CLIENT` may target only themselves. This is ADR-0002's scoping discipline applied to a client-supplied id — the id is never trusted on its own.
- Audit is truthful by construction: `AppointmentEvent.actorId` is always the logged-in user, and the affected Client/Provider is recorded separately.
- Role-based rules (cancellation window, booking restrictions) are evaluated against the *actor's* role, not the target's.
- The frontend needs listing endpoints to feed the pickers: Providers listing their Clients (exists: `GET /auth/users`), and Admin listing Providers and any Provider's Clients (not built yet).
- Frontend route guards become hierarchical — an `ADMIN` may enter Provider and Client areas, a `PROVIDER` may enter Client areas — but only with an acting context selected.

- Onboarding: when an `ADMIN` acts for a Provider who has no `ProviderSettings` yet, they are offered the onboarding form first and may complete it on the Provider's behalf, or skip it — in which case the Provider still has to complete it on their own first login. After a skip the Admin can still manage that Provider's Clients, but not appointment slots — not as a permission rule (Admin may do anything a Provider may), but because slots are validated against the allowed durations that only exist once settings do. The provider-settings endpoints therefore accept a target Provider id for `ADMIN` actors (today they are `PROVIDER`-only and implicitly self-scoped).

**Open**: where the picker lives (a global selection in the shell header that persists across pages, or a per-page picker) is undecided.

**Revisit if**: a support use case genuinely needs to see *exactly* what a user sees, including their own permission limits (e.g. reproducing a Client's bug). That would be a separate, explicitly audited "view as" mode, not a replacement for acting on behalf.
