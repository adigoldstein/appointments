import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-card',
  standalone: true,
  templateUrl: './ui-card.component.html',
  styleUrl: './ui-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiCardComponent {
  readonly subtitle = input<string | null>(null);
  readonly title = input<string | null>(null);
}
