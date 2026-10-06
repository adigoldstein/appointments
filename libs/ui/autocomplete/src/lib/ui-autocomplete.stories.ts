import { signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { UiAutocompleteComponent, UiAutocompleteOption } from './ui-autocomplete.component';

const CITIES: UiAutocompleteOption[] = [
  { id: '5000', label: 'תל אביב - יפו' },
  { id: '4000', label: 'חיפה' },
  { id: '3000', label: 'ירושלים' },
  { id: '8600', label: 'רמת גן' },
  { id: '2650', label: 'רמת השרון' },
];

const meta: Meta<UiAutocompleteComponent> = {
  title: 'UI/Autocomplete',
  component: UiAutocompleteComponent,
};

export default meta;

type Story = StoryObj<UiAutocompleteComponent>;

/** Two-way bound like a real parent: `query` drives the (here: client-side) filtering, `value` holds the pick. */
export const Default: Story = {
  render: () => {
    const query = signal('');
    const value = signal<UiAutocompleteOption | null>(null);

    return {
      props: {
        query,
        value,
        options: () => CITIES.filter((city) => city.label.includes(query().trim())),
      },
      template: `
        <div style="max-width: 20rem">
          <ui-autocomplete
            label="עיר"
            placeholder="חיפוש עיר"
            [(query)]="query"
            [(value)]="value"
            [options]="options()"
          />
          <p style="margin-top: 1rem">נבחר: {{ value()?.label ?? '—' }}</p>
        </div>
      `,
    };
  },
};

/** As a Reactive Forms control (the ControlValueAccessor): the control holds the whole option. */
export const InReactiveForm: Story = {
  decorators: [moduleMetadata({ imports: [ReactiveFormsModule] })],
  render: () => {
    const query = signal('');
    const city = new FormControl<UiAutocompleteOption | null>(CITIES[1]);

    return {
      props: {
        query,
        city,
        options: () => CITIES.filter((option) => option.label.includes(query().trim())),
        toggleDisabled: () => (city.disabled ? city.enable() : city.disable()),
      },
      template: `
        <div style="max-width: 20rem; display: grid; gap: 1rem">
          <ui-autocomplete
            label="עיר"
            placeholder="חיפוש עיר"
            [formControl]="city"
            [(query)]="query"
            [options]="options()"
          />
          <p data-testid="form-value">ערך בטופס: {{ city.value?.label ?? '—' }}</p>
          <p data-testid="form-state">{{ city.touched ? 'touched' : 'untouched' }} / {{ city.disabled ? 'disabled' : 'enabled' }}</p>
          <div style="display: flex; gap: .5rem">
            <button type="button" (click)="city.reset()">איפוס</button>
            <button type="button" (click)="city.setValue({ id: '3000', label: 'ירושלים' })">הצבת ירושלים</button>
            <button type="button" (click)="toggleDisabled()">השבתה / הפעלה</button>
          </div>
        </div>
      `,
    };
  },
};

export const Selected: Story = {
  args: { label: 'עיר', options: CITIES, value: CITIES[0] },
};

export const Loading: Story = {
  args: { label: 'עיר', options: [], loading: true },
};

export const Disabled: Story = {
  args: { label: 'לקוח', placeholder: 'בחרו קודם נותן שירות', disabled: true },
};
