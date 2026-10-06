import { Role } from '@app/shared/types';

export interface NavItem {
  readonly label: string;
  /** Relative to the area's base URL (ADR-0005); '' is the area's home. */
  readonly path: string;
}

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  [Role.ADMIN]: 'מנהל מערכת',
  [Role.PROVIDER]: 'נותן שירות',
  [Role.CLIENT]: 'לקוח',
};

/** Nav per area (the pages on screen), not per logged-in role — an Admin acting for a Provider sees the Provider nav. */
export const NAV_ITEMS_BY_AREA: Readonly<Record<Role, readonly NavItem[]>> = {
  [Role.ADMIN]: [
    { label: 'סקירה כללית', path: '' },
    { label: 'הוספת משתמש', path: 'users/new' },
  ],
  [Role.PROVIDER]: [
    { label: 'סקירה כללית', path: '' },
    { label: 'הוספת לקוח', path: 'clients/new' },
    { label: 'הגדרות', path: 'settings' },
  ],
  [Role.CLIENT]: [{ label: 'סקירה כללית', path: '' }],
};

export function resolveNavPath(areaBaseUrl: string, item: NavItem): string {
  return item.path ? `${areaBaseUrl}/${item.path}` : areaBaseUrl;
}
