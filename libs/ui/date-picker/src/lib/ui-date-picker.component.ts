import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  forwardRef,
  input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextDatePickerId = 0;

@Component({
  selector: 'ui-date-picker',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiDatePickerComponent),
      multi: true,
    },
  ],
  template: `
    <label class="ui-date-picker" [attr.for]="id() ?? fallbackId">
      @if (label()) {
        <span class="ui-date-picker__label">{{ label() }}</span>
      }

      <input
        class="ui-date-picker__control"
        type="date"
        [attr.id]="id() ?? fallbackId"
        [attr.max]="max()"
        [attr.min]="min()"
        [disabled]="disabled() || isDisabled"
        [value]="value"
        (blur)="markTouched()"
        (input)="handleInput($event)"
      />
    </label>
  `,
  styles: [
    `
      .ui-date-picker {
        color: var(--color-text);
        display: grid;
        gap: var(--space-2);
      }

      .ui-date-picker__label {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }

      .ui-date-picker__control {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        color: var(--color-text);
        min-height: 42px;
        padding: 0 var(--space-3);
      }

      .ui-date-picker__control:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 4px var(--color-focus-ring);
        outline: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiDatePickerComponent implements ControlValueAccessor {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly id = input<string | null>(null);
  readonly label = input('Date');
  readonly max = input<string | null>(null);
  readonly min = input<string | null>(null);

  readonly fallbackId = `ui-date-picker-${nextDatePickerId++}`;
  value = '';
  isDisabled = false;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(onChange: (value: string) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.onChange(value);
  }

  markTouched(): void {
    this.onTouched();
  }
}
