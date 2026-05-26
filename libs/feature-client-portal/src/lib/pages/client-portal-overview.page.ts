import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiCardComponent } from '@app/ui/card';

@Component({
  selector: 'feature-client-portal-overview-page',
  standalone: true,
  imports: [UiCardComponent],
  template: `
    <ui-card title="Client portal feature" subtitle="Portal workflows are isolated for future splitting.">
      <p class="feature-copy">
        This feature can become its own deployed app without moving shared UI or design tokens.
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
export class ClientPortalOverviewPageComponent {}
