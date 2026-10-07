import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { UiPaginationComponent } from './ui-pagination.component';

const meta: Meta<UiPaginationComponent> = {
  title: 'UI/Pagination',
  component: UiPaginationComponent,
};

export default meta;

type Story = StoryObj<UiPaginationComponent>;

/** Live: buttons move the page; disabled at both ends. */
export const Interactive: Story = {
  render: () => {
    const page = signal(1);
    return {
      props: { page },
      template: `
        <ui-pagination [(page)]="page" [totalPages]="4" label="דפי רשימת הלקוחות" />
        <p data-testid="current" style="text-align: center">נבחר: {{ page() }}</p>
      `,
    };
  },
};

export const FirstPage: Story = { args: { page: 1, totalPages: 3 } };
export const MiddlePage: Story = { args: { page: 2, totalPages: 3 } };
export const LastPage: Story = { args: { page: 3, totalPages: 3 } };

/** With a single page there is nothing to page through, so nothing renders. */
export const SinglePage: Story = { args: { page: 1, totalPages: 1 } };
