import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthApiService, AuthStorageService } from '@app/shared/auth';
import { NAV_ITEMS_BY_ROLE, ROLE_LABELS } from '@app/shared/navigation';
import { UiButtonComponent } from '@app/ui/button';
import { UiHeaderComponent } from '@app/ui/header';

const DESKTOP_BREAKPOINT = '(min-width: 900px)';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatSidenavModule,
    UiButtonComponent,
    UiHeaderComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly authStorage = inject(AuthStorageService);
  private readonly authApi = inject(AuthApiService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly sidenavOpen = signal(false);

  protected readonly isDesktop = toSignal(
    this.breakpointObserver.observe(DESKTOP_BREAKPOINT).pipe(map((state) => state.matches)),
    { initialValue: this.breakpointObserver.isMatched(DESKTOP_BREAKPOINT) },
  );

  private readonly user = computed(() => this.authStorage.session()?.user ?? null);

  protected readonly userDisplayName = computed(() => {
    const user = this.user();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  protected readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    return role ? ROLE_LABELS[role] : '';
  });

  protected readonly navItems = computed(() => {
    const role = this.user()?.role;
    return role ? NAV_ITEMS_BY_ROLE[role] : [];
  });

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
