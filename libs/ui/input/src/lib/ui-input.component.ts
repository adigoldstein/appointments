import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextInputId = 0;

@Component({
  selector: 'ui-input',
  standalone: true,
  templateUrl: './ui-input.component.html',
  styleUrl: './ui-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiInputComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiInputComponent implements ControlValueAccessor {
  readonly autocomplete = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly id = input<string | null>(null);
  readonly label = input<string | null>(null);
  readonly name = input<string | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly type = input('text');

  readonly fallbackId = `ui-input-${nextInputId++}`;
  value = '';
  isDisabled = false;

  protected readonly isPasswordField = computed(() => this.type() === 'password');
  protected readonly showPassword = signal(false);
  protected readonly resolvedType = computed(() =>
    this.isPasswordField() && this.showPassword() ? 'text' : this.type(),
  );

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

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }
}
