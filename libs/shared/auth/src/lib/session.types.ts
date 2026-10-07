import type { AuthSession } from '@app/shared/types';

export interface SessionState {
  session: AuthSession | null;
}
