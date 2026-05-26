import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  forwardRef,
  input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextInputId = 0;

@Component({
  selector: 'ui-input',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiInputComponent),
      multi: true,
    },
  ],
  template: `
    <label class="ui-input" [attr.for]="id() ?? fallbackId">
      @if (label()) {
        <span class="ui-input__label">{{ label() }}</span>
      }

      <input
        class="ui-input__control"
        [attr.autocomplete]="autocomplete()"
        [attr.id]="id() ?? fallbackId"
        [attr.name]="name()"
        [attr.placeholder]="placeholder()"
        [attr.type]="type()"
        [disabled]="disabled() || isDisabled"
        [value]="value"
        (blur)="markTouched()"
        (input)="handleInput($event)"
      />

      @if (hint()) {
        <span class="ui-input__hint">{{ hint() }}</span>
      }
    </label>
  `,
  styles: [
    `
      .ui-input {
        color: var(--color-text);
        display: grid;
        gap: var(--space-2);
      }

      .ui-input__label {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }

      .ui-input__control {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        color: var(--color-text);
        min-height: 42px;
        padding: 0 var(--space-3);
        transition:
          border-color 160ms ease,
          box-shadow 160ms ease;
      }

      .ui-input__control:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 4px var(--color-focus-ring);
        outline: none;
      }

      .ui-input__control:disabled {
        background: var(--color-surface-muted);
        cursor: not-allowed;
        opacity: 0.72;
      }

      .ui-input__hint {
        color: var(--color-text-muted);
        font-size: var(--font-size-xs);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiInputComponent implements ControlValueAccessor {
  readonly autocomplete = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly hint = input<string | null>(null);
  readonly id = input<string | null>(null);
  readonly label = input<string | null>(null);
  readonly name = input<string | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly type = input('text');

  readonly fallbackId = `ui-input-${nextInputId++}`;
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
