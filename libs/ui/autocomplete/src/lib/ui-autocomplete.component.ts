import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

export interface UiAutocompleteOption {
  readonly id: string;
  readonly label: string;
  /** Secondary line, e.g. an email. */
  readonly description?: string;
}

let nextAutocompleteId = 0;

/**
 * Presentational combobox: the parent owns searching (debounce, HTTP) and feeds `options`.
 * Typing emits `search`; picking emits `optionSelected`; the clear button emits `cleared`.
 */
@Component({
  selector: 'ui-autocomplete',
  standalone: true,
  templateUrl: './ui-autocomplete.component.html',
  styleUrl: './ui-autocomplete.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiAutocompleteComponent {
  /** Accessible name; shown above the field unless `hideLabel`. */
  readonly label = input.required<string>();
  readonly hideLabel = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string | null>(null);
  readonly options = input<readonly UiAutocompleteOption[]>([]);
  readonly value = input<UiAutocompleteOption | null>(null);
  readonly loading = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly emptyText = input('לא נמצאו תוצאות');
  readonly clearLabel = input('ניקוי הבחירה');

  readonly search = output<string>();
  readonly optionSelected = output<UiAutocompleteOption>();
  readonly cleared = output<void>();

  protected readonly fieldId = `ui-autocomplete-${nextAutocompleteId++}`;
  protected readonly listboxId = `${this.fieldId}-listbox`;

  protected readonly isOpen = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly query = signal('');
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

  protected onBlur(): void {
    this.isEditing.set(false);
    this.close();
  }

  protected onInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.query.set(text);
    this.activeIndex.set(-1);
    this.isOpen.set(true);
    this.search.emit(text.trim());
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
    this.cleared.emit();
  }

  private open(): void {
    this.activeIndex.set(-1);
    this.isOpen.set(true);
    this.search.emit(this.query().trim());
  }

  private close(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  private select(option: UiAutocompleteOption, inputElement: HTMLInputElement): void {
    this.optionSelected.emit(option);
    this.query.set('');
    this.close();
    inputElement.blur();
  }
}
