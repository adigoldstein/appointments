import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

export type UiButtonVariant = 'primary' | 'secondary' | 'ghost';
export type UiButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-button',
  standalone: true,
  template: `
    <button
      class="ui-button"
      [class.ui-button--primary]="variant() === 'primary'"
      [class.ui-button--secondary]="variant() === 'secondary'"
      [class.ui-button--ghost]="variant() === 'ghost'"
      [class.ui-button--sm]="size() === 'sm'"
      [class.ui-button--md]="size() === 'md'"
      [class.ui-button--lg]="size() === 'lg'"
      [type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading() ? 'true' : null"
    >
      <span class="ui-button__content">
        <ng-content />
      </span>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .ui-button {
        align-items: center;
        border: 1px solid transparent;
        border-radius: var(--radius-md);
        cursor: pointer;
        display: inline-flex;
        font-weight: var(--font-weight-semibold);
        justify-content: center;
        transition:
          background-color 160ms ease,
          border-color 160ms ease,
          box-shadow 160ms ease,
          color 160ms ease;
      }

      .ui-button:focus-visible {
        box-shadow: 0 0 0 4px var(--color-focus-ring);
        outline: 2px solid transparent;
        outline-offset: 2px;
      }

      .ui-button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .ui-button--primary {
        background: var(--color-primary);
        color: var(--color-primary-contrast);
      }

      .ui-button--primary:hover:not(:disabled) {
        background: var(--color-primary-hover);
      }

      .ui-button--secondary {
        background: var(--color-secondary);
        color: var(--color-text-inverse);
      }

      .ui-button--secondary:hover:not(:disabled) {
        background: var(--color-secondary-hover);
      }

      .ui-button--ghost {
        background: transparent;
        border-color: var(--color-border);
        color: var(--color-text);
      }

      .ui-button--ghost:hover:not(:disabled) {
        background: var(--color-surface-muted);
      }

      .ui-button--sm {
        min-height: 32px;
        padding: 0 var(--space-3);
      }

      .ui-button--md {
        min-height: 40px;
        padding: 0 var(--space-4);
      }

      .ui-button--lg {
        min-height: 48px;
        padding: 0 var(--space-5);
      }

      .ui-button__content {
        align-items: center;
        display: inline-flex;
        gap: var(--space-2);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiButtonComponent {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly size = input<UiButtonSize>('md');
  readonly type = input<'button' | 'reset' | 'submit'>('button');
  readonly variant = input<UiButtonVariant>('primary');
}
