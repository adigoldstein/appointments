# Single shared database, tenancy enforced by providerId scoping

This is being built as a system that may eventually be sold to multiple, entirely unrelated Providers (e.g. a doctor and a nail salon, with zero relation between them). We considered giving each Provider a physically separate database or schema versus a single shared database where every table scopes to a `providerId`.

We chose the single shared database. There is no `Tenant`/`Organization` entity — a Provider's own `User` row already *is* the tenant root, and every other table (`Appointment`, `ProviderSettings`, `AppointmentEvent`, and Clients via their `providerId` FK) hangs off it. Isolation is enforced entirely at the service layer: every query scopes to the acting user's own `providerId` (or their own id, if they are the Provider), the same discipline already used for RBAC checks elsewhere (`assertCanEditUser` and friends).

We explicitly rejected physical per-tenant databases for now. That's meaningful infrastructure — connection routing, per-tenant migrations, provisioning — to solve a scale/isolation problem that doesn't exist yet (one operator, no paying customers). It would also make the one cross-tenant feature we *do* want — `ADMIN`'s global, cross-provider visibility — harder to build, not easier, since it'd require fanning queries out across databases instead of one query.

`ADMIN` follows the same shape: it's a single global platform-operator role, not scoped to any one Provider, and distinct from any future per-Provider staff/receptionist role (which isn't built — nobody has asked for it yet).

**Consequence**: because `providerId` scoping is the only thing standing between this design and a data leak across tenants, it must be applied consistently in every service method that touches Appointment-, Client-, or Settings-related data — never trust a client-supplied id alone.

**Revisit if**: a specific Provider requires contractual data isolation, or shared infrastructure becomes a real performance/scale problem. Splitting a well-scoped tenant's data into its own database at that point is a mechanical migration (build a connection resolver, copy that tenant's rows out), not a rewrite — precisely because the scoping discipline above is already in place.
