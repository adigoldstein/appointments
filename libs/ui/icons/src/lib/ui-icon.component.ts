import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UI_ICONS } from './icons';
import type { UiIconName } from './ui-icon.types';

/**
 * One icon from the shared set (Phosphor "regular", copied into icons.ts). Takes the current text
 * color and scales with the font by default. Decorative unless `label` is set, in which case it is
 * announced as an image with that name.
 *
 * Directional icons (carets) are not mirrored automatically: in this RTL app, "next" points left,
 * so the consumer picks the caret that matches the reading direction.
 */
@Component({
  selector: 'ui-icon',
  standalone: true,
  templateUrl: './ui-icon.component.html',
  styleUrl: './ui-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiIconComponent {
  readonly name = input.required<UiIconName>();
  /** Any CSS length; defaults to the surrounding font size. */
  readonly size = input('1em');
  /** Accessible name. Leave empty for icons next to visible text (they are hidden from screen readers). */
  readonly label = input<string | null>(null);

  protected readonly path = computed(() => UI_ICONS[this.name()]);
}
