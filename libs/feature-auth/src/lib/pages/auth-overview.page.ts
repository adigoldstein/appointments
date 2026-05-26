import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiButtonComponent } from '@app/ui/button';
import { UiCardComponent } from '@app/ui/card';
import { UiDatePickerComponent } from '@app/ui/date-picker';
import { UiInputComponent } from '@app/ui/input';
import { UiModalComponent } from '@app/ui/modal';
import { AppointmentSummary } from '@app/shared/types';
import { formatDisplayDate } from '@app/shared/utils';

@Component({
  selector: 'feature-auth-overview-page',
  standalone: true,
  imports: [
    UiButtonComponent,
    UiCardComponent,
    UiDatePickerComponent,
    UiInputComponent,
    UiModalComponent,
  ],
  template: `
    <section class="auth-page">
      <div class="auth-page-hero">
        <p class="auth-page-eyebrow">Frontend foundation</p>
        <h1 class="auth-page-title">Appointments frontend architecture</h1>
        <p class="auth-page-copy">
          Thin app shell, feature-owned routes, shared date utilities, and reusable UI primitives.
        </p>
        <ui-button (click)="isModalOpen.set(true)">Preview modal</ui-button>
      </div>

      <div class="auth-page-grid">
        <ui-card title="Book appointment" subtitle="Feature code composes UI primitives.">
          <div class="auth-page-form">
            <ui-input label="Customer name" placeholder="Jane Doe"></ui-input>
            <ui-date-picker label="Appointment date"></ui-date-picker>
            <ui-button variant="secondary">Create draft</ui-button>
          </div>
        </ui-card>

        <ui-card title="Shared date utility" [subtitle]="displayDate">
          <p class="auth-page-card-copy">
            Date formatting is centralized in shared utilities and powered by date-fns.
          </p>
        </ui-card>
      </div>
    </section>

    <ui-modal title="UI modal wrapper" [open]="isModalOpen()" (close)="isModalOpen.set(false)">
      <p>
        Features use <code>ui-modal</code>, not Angular CDK or Material directly.
      </p>
    </ui-modal>
  `,
  styles: [
    `
      .auth-page {
        display: grid;
        gap: var(--space-8);
      }

      .auth-page-hero {
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-md);
        color: var(--color-text-inverse);
        padding: var(--space-8);
      }

      .auth-page-eyebrow {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .auth-page-title {
        font-size: var(--font-size-2xl);
        line-height: var(--line-height-tight);
        margin-top: var(--space-3);
      }

      .auth-page-copy {
        margin: var(--space-4) 0 var(--space-6);
        max-width: 680px;
      }

      .auth-page-grid {
        display: grid;
        gap: var(--space-5);
      }

      .auth-page-form {
        display: grid;
        gap: var(--space-4);
      }

      .auth-page-card-copy {
        color: var(--color-text-muted);
      }

      @media (min-width: 900px) {
        .auth-page-grid {
          grid-template-columns: 2fr 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthOverviewPageComponent {
  protected readonly isModalOpen = signal(false);
  protected readonly appointment: AppointmentSummary = {
    id: 'apt_1001',
    customerName: 'Jane Doe',
    startsAt: '2026-05-26T10:30:00.000Z',
    status: 'scheduled',
  };
  protected readonly displayDate = formatDisplayDate(this.appointment.startsAt, 'EEEE, MMM d');
}
