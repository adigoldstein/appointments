import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiCardComponent } from '@app/ui/card';

@Component({
  selector: 'feature-admin-overview-page',
  standalone: true,
  imports: [UiCardComponent],
  template: `
    <ui-card title="Admin feature" subtitle="Owns admin pages, services, state, and routing.">
      <p class="feature-copy">
        Keep admin workflows here so the frontend app remains a thin shell.
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
export class AdminOverviewPageComponent {}
