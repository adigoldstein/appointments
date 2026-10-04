# No hard delete for Provider or Client accounts

The backend previously exposed `DELETE /auth/users/:userId` (ADMIN/PROVIDER). We removed it entirely, for both roles, in favor of deactivation (`User.deactivatedAt`) as the only way to end a Provider's or Client's active status.

A future reader will likely wonder why this endpoint is missing and be tempted to re-add it — that's exactly what this record is for. Hard-deleting a `User` orphans every `AppointmentEvent` row that references them (`clientId`, `providerId`, or `actorId`). We already snapshot `startsAt`/`endsAt` on those events so they survive an `Appointment` being deleted, but we never snapshot a *name* — so a hard-deleted Client would silently turn into "unknown user" in some other Provider's audit history forever. Deleting one account would quietly corrupt another party's records.

Deactivation avoids this: it blocks login entirely for that account, but no data — theirs or anyone else's — is ever touched. Reactivating (clearing `deactivatedAt`) restores everything exactly as it was.

**Revisit if**: a genuine compliance requirement (e.g. a "right to be forgotten" request) demands real data removal. That should be designed deliberately as anonymization of the `User` row (scrubbing PII while leaving referencing rows intact) rather than reintroducing row deletion, for the same orphaning reason described above.
