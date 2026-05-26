import { CdkTrapFocus } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [CdkTrapFocus],
  template: `
    @if (open()) {
      <div class="ui-modal-backdrop" (click)="handleBackdropClick($event)">
        <section
          cdkTrapFocus
          class="ui-modal"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          tabindex="-1"
          (keydown.escape)="close.emit()"
        >
          <header class="ui-modal-header">
            <h2 class="ui-modal-title">{{ title() }}</h2>
            <button class="ui-modal-close" type="button" aria-label="Close dialog" (click)="close.emit()">
              ×
            </button>
          </header>

          <div class="ui-modal-body">
            <ng-content />
          </div>
        </section>
      </div>
    }
  `,
  styles: [
    `
      .ui-modal-backdrop {
        align-items: center;
        background: var(--color-backdrop);
        display: grid;
        inset: 0;
        padding: var(--space-4);
        position: fixed;
        z-index: 1000;
      }

      .ui-modal {
        background: var(--color-surface);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-lg);
        margin: 0 auto;
        max-width: 560px;
        width: min(100%, 560px);
      }

      .ui-modal-header {
        align-items: center;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
        padding: var(--space-5);
      }

      .ui-modal-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
      }

      .ui-modal-close {
        align-items: center;
        background: transparent;
        border: 0;
        border-radius: var(--radius-sm);
        color: var(--color-text-muted);
        cursor: pointer;
        display: inline-flex;
        font-size: var(--font-size-xl);
        height: 32px;
        justify-content: center;
        width: 32px;
      }

      .ui-modal-close:hover {
        background: var(--color-surface-muted);
        color: var(--color-text);
      }

      .ui-modal-body {
        padding: var(--space-5);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiModalComponent {
  readonly close = output<void>();
  readonly open = input(false);
  readonly title = input('Dialog');

  handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
