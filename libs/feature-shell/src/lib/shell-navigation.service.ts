import { Injectable, computed, inject } from '@angular/core';
import { ActingContextStore } from '@app/shared/acting-context';
import { SessionStore } from '@app/shared/auth';
import { NAV_ITEMS_BY_AREA, ROLE_LABELS, resolveNavPath } from '@app/shared/navigation';
import { Role } from '@app/shared/types';

export interface NavLink {
  readonly label: string;
  readonly path: string;
}

export interface NavSection {
  /** null for the actor's own section; otherwise the selected target's name. */
  readonly title: string | null;
  readonly items: readonly NavLink[];
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

/** What the shell's side nav shows. Only the shell uses it, so it lives next to it (ADR-0007). */
@Injectable({ providedIn: 'root' })
export class ShellNavigationService {
  private readonly session = inject(SessionStore);
  private readonly actingContext = inject(ActingContextStore);

  readonly userDisplayName = this.session.displayName;

  readonly roleLabel = computed(() => {
    const role = this.session.user()?.role;
    return role ? ROLE_LABELS[role] : '';
  });

  /**
   * The actor's own links, then one section per selected target (ADR-0005): an Admin with a
   * Provider selected also gets that Provider's pages, and so on one level down.
   */
  readonly sections = computed<NavSection[]>(() => {
    const role = this.session.user()?.role;
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
}
