import type { Meta, StoryObj } from '@storybook/angular';
import { UiButtonComponent } from './ui-button.component';

const meta: Meta<UiButtonComponent> = {
  title: 'UI/Button',
  component: UiButtonComponent,
  args: {
    disabled: false,
    loading: false,
    size: 'md',
    type: 'button',
    variant: 'primary',
  },
};

export default meta;

type Story = StoryObj<UiButtonComponent>;

export const Primary: Story = {
  render: (args) => ({
    props: args,
    template: `<ui-button [variant]="variant" [size]="size" [disabled]="disabled" [loading]="loading">Book appointment</ui-button>`,
  }),
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
  render: Primary.render,
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
  },
  render: Primary.render,
};
