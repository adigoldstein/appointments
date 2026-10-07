import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { UiBadgeTone } from './ui-badge.types';

/**
 * Small status label (minimalist-ui: pastel pill, small text). The text itself carries the
 * meaning, so status never relies on color alone; no decorative dots (taste skill).
 */
@Component({
  selector: 'ui-badge',
  standalone: true,
  templateUrl: './ui-badge.component.html',
  styleUrl: './ui-badge.component.scss',
  host: { '[class]': '"ui-badge ui-badge--" + tone()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiBadgeComponent {
  readonly tone = input<UiBadgeTone>('neutral');
}
