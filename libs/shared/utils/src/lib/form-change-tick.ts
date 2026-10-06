import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { map, merge } from 'rxjs';

/**
 * A signal that changes on every value or status change of a form, so `computed()`s that read
 * control state (errors, validity) re-run. It counts instead of holding the last event: status
 * repeats ('INVALID' → 'INVALID'), and a signal set to an equal value wouldn't notify — which left
 * error messages stuck after the first keystroke.
 *
 * Must be called in an injection context (a field initializer or constructor).
 */
export function formChangeTick(control: AbstractControl): Signal<number> {
  return toSignal(
    merge(control.valueChanges, control.statusChanges).pipe(map((_, index) => index + 1)),
    { initialValue: 0 },
  );
}
