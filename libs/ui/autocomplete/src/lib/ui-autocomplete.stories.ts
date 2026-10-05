import type { Meta, StoryObj } from '@storybook/angular';
import { UiAutocompleteComponent, UiAutocompleteOption } from './ui-autocomplete.component';

const PROVIDERS: UiAutocompleteOption[] = [
  { id: '1', label: 'דנה כהן', description: 'dana@clinic.co.il' },
  { id: '2', label: 'יוסי לוי', description: 'yossi@salon.co.il' },
  { id: '3', label: 'מיכל אברהם', description: 'michal@studio.co.il' },
];

const meta: Meta<UiAutocompleteComponent> = {
  title: 'UI/Autocomplete',
  component: UiAutocompleteComponent,
};

export default meta;

type Story = StoryObj<UiAutocompleteComponent>;

/** Filters the mock list client-side the way a parent would after an API search. */
export const Default: Story = {
  render: () => ({
    props: {
      all: PROVIDERS,
      options: PROVIDERS,
      value: null as UiAutocompleteOption | null,
      onSearch(this: { all: UiAutocompleteOption[]; options: UiAutocompleteOption[] }, query: string) {
        this.options = this.all.filter((option) => option.label.includes(query));
      },
    },
    template: `
      <div style="max-width: 20rem">
        <ui-autocomplete
          label="נותן שירות"
          placeholder="חיפוש לפי שם או אימייל"
          [options]="options"
          [value]="value"
          (search)="onSearch($event)"
          (optionSelected)="value = $event"
          (cleared)="value = null"
        />
      </div>
    `,
  }),
};

export const Selected: Story = {
  args: { label: 'נותן שירות', options: PROVIDERS, value: PROVIDERS[0] },
};

export const Loading: Story = {
  args: { label: 'נותן שירות', options: [], loading: true },
};

export const Disabled: Story = {
  args: { label: 'לקוח', placeholder: 'בחרו קודם נותן שירות', disabled: true },
};
