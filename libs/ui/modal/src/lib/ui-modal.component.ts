import { CdkTrapFocus } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [CdkTrapFocus],
  templateUrl: './ui-modal.component.html',
  styleUrl: './ui-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiModalComponent {
  readonly close = output<void>();
  readonly open = input(false);
  readonly title = input('חלון');

  handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
