import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-card',
  standalone: true,
  template: `
    <article class="ui-card">
      @if (title() || subtitle()) {
        <header class="ui-card-header">
          @if (title()) {
            <h2 class="ui-card-title">{{ title() }}</h2>
          }
          @if (subtitle()) {
            <p class="ui-card-subtitle">{{ subtitle() }}</p>
          }
        </header>
      }

      <div class="ui-card-body">
        <ng-content />
      </div>
    </article>
  `,
  styles: [
    `
      .ui-card {
        background: var(--color-surface-raised);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        overflow: hidden;
      }

      .ui-card-header {
        border-bottom: 1px solid var(--color-border);
        padding: var(--space-5);
      }

      .ui-card-title {
        color: var(--color-text);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        line-height: var(--line-height-tight);
      }

      .ui-card-subtitle {
        color: var(--color-text-muted);
        font-size: var(--font-size-sm);
        margin-top: var(--space-2);
      }

      .ui-card-body {
        padding: var(--space-5);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiCardComponent {
  readonly subtitle = input<string | null>(null);
  readonly title = input<string | null>(null);
}
