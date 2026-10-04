# Single reusable Appointment row, non-terminal cancellation

We considered two shapes for scheduling data: one `Appointment` entity whose `status` toggles between `OPEN` and `BOOKED`, versus splitting `Availability`/`Slot` (what a Provider offers) from `Appointment` (a specific booking). We chose the single-entity model: the same row is created once by a Provider and is reused indefinitely as it cycles between `OPEN` and `BOOKED`.

This has a direct consequence a reader might not expect: **cancelling is not terminal.** It doesn't produce a `CANCELLED` status — it clears `clientId` and flips the row back to `OPEN`, ready to be rebooked by anyone. There is no `CANCELLED` value in the `status` enum at all. The record that a cancellation happened lives entirely in a separate `AppointmentEvent` log, never on the `Appointment` row.

We picked this because a Provider's bookable time slot is a real, recurring thing in the business (e.g. "Tuesdays at 10am") — the split model would have meant either duplicating rows every time a booking is cancelled and re-offered, or building explicit slot-reopening logic on top of two tables. The single-row model gets slot reuse for free and needed less migration surface for the first slice.

Deletion follows from this: an `Appointment` can only be hard-deleted while `OPEN` (nothing happened on it, nothing to preserve). A `BOOKED` row must be cancelled first — delete and cancel are different operations, not aliases for the same thing.

**Revisit if**: a waitlist or multiple-candidates-per-slot feature is ever needed — that genuinely requires separating "the offer" from "the booking," which this model doesn't support.
