import { Role } from '@app/shared/types';

export interface NavItem {
  readonly label: string;
  readonly path: string;
}

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  [Role.ADMIN]: 'מנהל מערכת',
  [Role.PROVIDER]: 'נותן שירות',
  [Role.CLIENT]: 'לקוח',
};

export const NAV_ITEMS_BY_ROLE: Readonly<Record<Role, readonly NavItem[]>> = {
  [Role.ADMIN]: [{ label: 'סקירה כללית', path: '/admin' }],
  [Role.PROVIDER]: [{ label: 'סקירה כללית', path: '/customer' }],
  [Role.CLIENT]: [{ label: 'סקירה כללית', path: '/client-portal' }],
};
