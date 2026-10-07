import type { Meta, StoryObj } from '@storybook/angular';
import { UiBadgeComponent } from './ui-badge.component';

const meta: Meta<UiBadgeComponent> = {
  title: 'UI/Badge',
  component: UiBadgeComponent,
  argTypes: {
    tone: { control: 'select', options: ['neutral', 'success', 'warning', 'danger', 'info'] },
  },
};

export default meta;

type Story = StoryObj<UiBadgeComponent>;

export const Default: Story = {
  args: { tone: 'success' },
  render: (args) => ({ props: args, template: `<ui-badge [tone]="tone">פעיל</ui-badge>` }),
};

/** As used in the user lists. */
export const UserStatus: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: .75rem">
        <ui-badge tone="success">פעיל</ui-badge>
        <ui-badge tone="neutral">לא פעיל</ui-badge>
      </div>
    `,
  }),
};

export const AllTones: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: .75rem">
        <ui-badge tone="neutral">ניטרלי</ui-badge>
        <ui-badge tone="success">הצלחה</ui-badge>
        <ui-badge tone="warning">אזהרה</ui-badge>
        <ui-badge tone="danger">שגיאה</ui-badge>
        <ui-badge tone="info">מידע</ui-badge>
      </div>
    `,
  }),
};
