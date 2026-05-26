import type { Meta, StoryObj } from '@storybook/angular';
import { UiCardComponent } from './ui-card.component';

const meta: Meta<UiCardComponent> = {
  title: 'UI/Card',
  component: UiCardComponent,
  args: {
    subtitle: 'Reusable container for feature content.',
    title: 'Appointment summary',
  },
};

export default meta;

type Story = StoryObj<UiCardComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <ui-card [title]="title" [subtitle]="subtitle">
        <p>Next appointment starts at 10:30.</p>
      </ui-card>
    `,
  }),
};
