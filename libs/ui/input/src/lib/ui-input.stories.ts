import type { Meta, StoryObj } from '@storybook/angular';
import { UiInputComponent } from './ui-input.component';

const meta: Meta<UiInputComponent> = {
  title: 'UI/Input',
  component: UiInputComponent,
  args: {
    hint: 'Use a customer-friendly display name.',
    label: 'Customer name',
    placeholder: 'Jane Doe',
    type: 'text',
  },
};

export default meta;

type Story = StoryObj<UiInputComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `<ui-input [label]="label" [hint]="hint" [placeholder]="placeholder" [type]="type" />`,
  }),
};
