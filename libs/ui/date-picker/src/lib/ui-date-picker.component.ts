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
  templateUrl: './ui-date-picker.component.html',
  styleUrl: './ui-date-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiDatePickerComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiDatePickerComponent implements ControlValueAccessor {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly id = input<string | null>(null);
  readonly label = input('תאריך');
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
