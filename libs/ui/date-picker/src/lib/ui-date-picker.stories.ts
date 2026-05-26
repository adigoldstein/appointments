import type { Meta, StoryObj } from '@storybook/angular';
import { UiDatePickerComponent } from './ui-date-picker.component';

const meta: Meta<UiDatePickerComponent> = {
  title: 'UI/Date Picker',
  component: UiDatePickerComponent,
  args: {
    label: 'Appointment date',
    min: '2026-01-01',
  },
};

export default meta;

type Story = StoryObj<UiDatePickerComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `<ui-date-picker [label]="label" [min]="min" />`,
  }),
};
