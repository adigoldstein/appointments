import type { Meta, StoryObj } from '@storybook/angular';
import { UiModalComponent } from './ui-modal.component';

const meta: Meta<UiModalComponent> = {
  title: 'UI/Modal',
  component: UiModalComponent,
  args: {
    open: true,
    title: 'Confirm booking',
  },
};

export default meta;

type Story = StoryObj<UiModalComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <ui-modal [open]="open" [title]="title">
        <p>This modal uses Angular CDK focus trapping internally.</p>
      </ui-modal>
    `,
  }),
};
