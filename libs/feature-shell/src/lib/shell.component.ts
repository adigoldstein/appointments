import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { ActingContextStore } from '@app/shared/acting-context';
import { AuthApiService } from '@app/shared/auth';
import { UiButtonComponent } from '@app/ui/button';
import { UiHeaderComponent } from '@app/ui/header';
import { ContextBarComponent } from './context-bar/context-bar.component';
import { ShellNavigationService } from './shell-navigation.service';

const DESKTOP_BREAKPOINT = '(min-width: 900px)';

/** App layout: side nav, header, context bar and the routed page. Layout state only; logic lives in services. */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatSidenavModule,
    ContextBarComponent,
    UiButtonComponent,
    UiHeaderComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly authApi = inject(AuthApiService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly navigation = inject(ShellNavigationService);

  /** Re-creates the routed page when the target it depends on changes (ADR-0005). */
  protected readonly pageKey = inject(ActingContextStore).pageKey;

  protected readonly sidenavOpen = signal(false);

  protected readonly isDesktop = toSignal(
    this.breakpointObserver.observe(DESKTOP_BREAKPOINT).pipe(map((state) => state.matches)),
    { initialValue: this.breakpointObserver.isMatched(DESKTOP_BREAKPOINT) },
  );

  protected toggleNav(): void {
    this.sidenavOpen.update((open) => !open);
  }

  protected onNavLinkClick(): void {
    if (!this.isDesktop()) {
      this.sidenavOpen.set(false);
    }
  }

  protected onLogout(): void {
    this.authApi
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.router.navigateByUrl('/auth'));
  }
}
