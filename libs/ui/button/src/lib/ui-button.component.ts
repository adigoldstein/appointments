import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import type { UiButtonVariant, UiButtonSize } from './ui-button.types';

@Component({
  selector: 'ui-button',
  standalone: true,
  templateUrl: './ui-button.component.html',
  styleUrl: './ui-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiButtonComponent {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly size = input<UiButtonSize>('md');
  readonly type = input<'button' | 'reset' | 'submit'>('button');
  readonly variant = input<UiButtonVariant>('primary');
}
