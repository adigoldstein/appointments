import type { Meta, StoryObj } from '@storybook/angular';
import { UI_ICONS } from './icons';
import type { UiIconName } from './ui-icon.types';
import { UiIconComponent } from './ui-icon.component';

const meta: Meta<UiIconComponent> = {
  title: 'UI/Icon',
  component: UiIconComponent,
  args: { name: 'search', size: '1.5rem' },
  argTypes: {
    name: { control: 'select', options: Object.keys(UI_ICONS) },
  },
};

export default meta;

type Story = StoryObj<UiIconComponent>;

export const Default: Story = {};

/** An icon used on its own (e.g. an icon-only button) needs a label so it is announced. */
export const WithLabel: Story = {
  args: { name: 'search', label: 'חיפוש' },
};

/** Every icon in the set, at body size and larger, inheriting the text color. */
export const AllIcons: Story = {
  render: () => ({
    props: { names: Object.keys(UI_ICONS) as UiIconName[] },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr)); gap: 1rem; color: var(--color-text)">
        @for (name of names; track name) {
          <div style="display: grid; justify-items: center; gap: .5rem; padding: 1rem; border: 1px solid var(--color-border); border-radius: var(--radius-md)">
            <ui-icon [name]="name" size="1.5rem" />
            <code style="font-size: var(--font-size-xs); color: var(--color-text-muted)">{{ name }}</code>
          </div>
        }
      </div>
    `,
  }),
};

/** Next to text, the icon follows the font size and color. */
export const InlineWithText: Story = {
  render: () => ({
    template: `
      <p style="display: flex; align-items: center; gap: .5rem; color: var(--color-danger)">
        <ui-icon name="warning" />
        לא הצלחנו לטעון את הרשימה.
      </p>
    `,
  }),
};
