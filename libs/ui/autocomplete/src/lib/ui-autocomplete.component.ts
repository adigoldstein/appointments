import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  forwardRef,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface UiAutocompleteOption {
  readonly id: string;
  readonly label: string;
  /** Secondary line, e.g. an email. */
  readonly description?: string;
}

let nextAutocompleteId = 0;

/**
 * Presentational combobox. `[(query)]` is the typed text; the selection (null when cleared) binds
 * either as `[(value)]` or, inside a Reactive Form, as `formControlName` (the control holds the
 * whole option). The parent owns searching — typically `debouncedSearch(query, …)` from
 * `@app/shared/utils` — and feeds `options`; this component never fetches anything itself.
 *
 * The ControlValueAccessor is for Angular 21 Reactive Forms. `value` being a `model()` already
 * satisfies Signal Forms' `FormValueControl`, so the CVA can go once we move to Signal Forms.
 */
@Component({
  selector: 'ui-autocomplete',
  standalone: true,
  templateUrl: './ui-autocomplete.component.html',
  styleUrl: './ui-autocomplete.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiAutocompleteComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiAutocompleteComponent implements ControlValueAccessor {
  /** Accessible name; shown above the field unless `hideLabel`. */
  readonly label = input.required<string>();
  readonly hideLabel = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string | null>(null);
  readonly options = input<readonly UiAutocompleteOption[]>([]);
  readonly loading = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly emptyText = input('לא נמצאו תוצאות');
  readonly clearLabel = input('ניקוי הבחירה');

  /** The text being typed; reset to '' when the field opens and after a pick. */
  readonly query = model('');
  /** The selected option; null when nothing is selected or after clearing. */
  readonly value = model<UiAutocompleteOption | null>(null);

  protected readonly fieldId = `ui-autocomplete-${nextAutocompleteId++}`;
  protected readonly listboxId = `${this.fieldId}-listbox`;

  /** Disabled by the `disabled` input or by the form control (`control.disable()`). */
  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  private onChange: (value: UiAutocompleteOption | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected readonly isOpen = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly activeIndex = signal(-1);

  /** While typing show the query; otherwise show the selected option's label. */
  protected readonly displayText = computed(() =>
    this.isEditing() ? this.query() : (this.value()?.label ?? ''),
  );

  protected readonly resolvedPlaceholder = computed(() => {
    const value = this.value();
    return this.isEditing() && value ? value.label : this.placeholder();
  });

  protected readonly activeOptionId = computed(() =>
    this.isOpen() && this.activeIndex() >= 0
      ? `${this.fieldId}-option-${this.activeIndex()}`
      : null,
  );

  protected optionId(index: number): string {
    return `${this.fieldId}-option-${index}`;
  }

  protected onFocus(): void {
    this.isEditing.set(true);
    this.query.set('');
    this.open();
  }

  /** Reopens the list when the field already has focus (e.g. after Escape closed it). */
  protected onClick(): void {
    if (!this.isOpen()) {
      this.open();
    }
  }

  protected onBlur(): void {
    this.isEditing.set(false);
    this.close();
    this.onTouched();
  }

  protected onInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.query.set(text);
    this.activeIndex.set(-1);
    this.isOpen.set(true);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.options().length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.open();
        }
        this.activeIndex.update((index) => (count ? (index + 1) % count : -1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.update((index) =>
          count ? (index <= 0 ? count - 1 : index - 1) : -1,
        );
        break;
      case 'Enter': {
        const option = this.options()[this.activeIndex()];
        if (this.isOpen() && option) {
          event.preventDefault();
          this.select(option, event.target as HTMLInputElement);
        }
        break;
      }
      case 'Escape':
        if (this.isOpen()) {
          event.preventDefault();
          this.close();
        }
        break;
    }
  }

  /** mousedown (not click) so the pick happens before the input's blur closes the list. */
  protected onOptionMousedown(
    event: MouseEvent,
    option: UiAutocompleteOption,
    inputElement: HTMLInputElement,
  ): void {
    event.preventDefault();
    this.select(option, inputElement);
  }

  protected onClear(): void {
    this.query.set('');
    this.close();
    this.setValue(null);
  }

  writeValue(value: UiAutocompleteOption | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(onChange: (value: UiAutocompleteOption | null) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  private open(): void {
    this.activeIndex.set(-1);
    this.isOpen.set(true);
  }

  private close(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  private select(option: UiAutocompleteOption, inputElement: HTMLInputElement): void {
    this.setValue(option);
    this.query.set('');
    this.close();
    inputElement.blur();
  }

  /** A user pick: updates the model (and so `valueChange`) and notifies a bound form control. */
  private setValue(value: UiAutocompleteOption | null): void {
    this.value.set(value);
    this.onChange(value);
  }
}
