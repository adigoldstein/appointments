import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiCardComponent } from '@app/ui/card';

@Component({
  selector: 'feature-customer-overview-page',
  standalone: true,
  imports: [UiCardComponent],
  template: `
    <ui-card title="Customer feature" subtitle="Customer-specific pages and logic live here.">
      <p class="feature-copy">
        This boundary is ready for customer appointment search, booking, and profile flows.
      </p>
    </ui-card>
  `,
  styles: [
    `
      .feature-copy {
        color: var(--color-text-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerOverviewPageComponent {}
