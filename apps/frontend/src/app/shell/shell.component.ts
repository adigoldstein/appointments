import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { ActingContextService } from '@app/shared/acting-context';
import { AuthApiService, AuthStorageService } from '@app/shared/auth';
import { NAV_ITEMS_BY_AREA, ROLE_LABELS, resolveNavPath } from '@app/shared/navigation';
import { UiButtonComponent } from '@app/ui/button';
import { Role } from '@app/shared/types';
import { UiHeaderComponent } from '@app/ui/header';
import { ContextBarComponent } from './context-bar/context-bar.component';

const DESKTOP_BREAKPOINT = '(min-width: 900px)';

interface NavSection {
  /** null for the actor's own section; otherwise the selected target's name. */
  readonly title: string | null;
  readonly items: readonly { readonly label: string; readonly path: string }[];
}

function section(title: string | null, area: Role, baseUrl: string | null): NavSection {
  return {
    title,
    items: baseUrl
      ? NAV_ITEMS_BY_AREA[area].map((item) => ({
          label: item.label,
          path: resolveNavPath(baseUrl, item),
        }))
      : [],
  };
}

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
  private readonly authStorage = inject(AuthStorageService);
  private readonly authApi = inject(AuthApiService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly actingContext = inject(ActingContextService);

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

  /** Re-creates the routed page when the target it depends on changes (ADR-0005). */
  protected readonly pageKey = this.actingContext.pageKey;

  /**
   * The actor's own links, then one section per selected target (ADR-0005): an Admin with a
   * Provider selected also gets that Provider's pages, and so on one level down.
   */
  protected readonly navSections = computed<NavSection[]>(() => {
    const role = this.user()?.role;
    const providerBaseUrl = this.actingContext.providerBaseUrl();
    const clientBaseUrl = this.actingContext.clientBaseUrl();
    const provider = this.actingContext.selectedProvider();
    const client = this.actingContext.selectedClient();

    if (!role) {
      return [];
    }

    if (role === Role.CLIENT) {
      return [section(null, Role.CLIENT, clientBaseUrl)];
    }

    const sections =
      role === Role.ADMIN
        ? [section(null, Role.ADMIN, '/admin')]
        : [section(null, Role.PROVIDER, providerBaseUrl)];

    if (role === Role.ADMIN && provider) {
      sections.push(section(provider.name, Role.PROVIDER, providerBaseUrl));
    }

    if (client && (role === Role.PROVIDER || provider)) {
      sections.push(section(client.name, Role.CLIENT, clientBaseUrl));
    }

    return sections;
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
