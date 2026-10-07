import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { UiIconComponent } from '@app/ui/icons';

/**
 * Previous / next paging with "עמוד X מתוך Y". Two-way `[(page)]` (1-based). Renders nothing when
 * everything fits on one page. RTL: "הקודם" sits at the start (right) with a right-pointing caret.
 */
@Component({
  selector: 'ui-pagination',
  standalone: true,
  imports: [UiIconComponent],
  templateUrl: './ui-pagination.component.html',
  styleUrl: './ui-pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiPaginationComponent {
  readonly page = model(1);
  readonly totalPages = input.required<number>();
  /** Accessible name of the nav landmark, e.g. "דפי רשימת הלקוחות". */
  readonly label = input('דפדוף');

  protected readonly visible = computed(() => this.totalPages() > 1);
  protected readonly isFirst = computed(() => this.page() <= 1);
  protected readonly isLast = computed(() => this.page() >= this.totalPages());

  protected previous(): void {
    if (!this.isFirst()) {
      this.page.update((page) => page - 1);
    }
  }

  protected next(): void {
    if (!this.isLast()) {
      this.page.update((page) => page + 1);
    }
  }
}
