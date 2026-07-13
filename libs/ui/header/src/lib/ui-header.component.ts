import { ChangeDetectionStrategy, Component, booleanAttribute, input, output } from '@angular/core';

@Component({
  selector: 'ui-header',
  standalone: true,
  templateUrl: './ui-header.component.html',
  styleUrl: './ui-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiHeaderComponent {
  readonly brand = input.required<string>();
  readonly showMenuToggle = input(false, { transform: booleanAttribute });
  readonly menuToggleLabel = input.required<string>();

  readonly menuToggle = output<void>();
}
