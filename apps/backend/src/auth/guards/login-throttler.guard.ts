import { ExecutionContext, Injectable } from '@nestjs/common';
import {
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(
    req: Record<string, unknown>,
  ): Promise<string> {
    const email =
      typeof req.body === 'object' && req.body !== null &&
      'email' in req.body && typeof (req.body as { email?: unknown }).email === 'string'
        ? (req.body as { email: string }).email.trim().toLowerCase()
        : 'anonymous';

    return `login-${email}`;
  }

  protected async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new ThrottlerException(
      'Too many login attempts. Try again in 1 minute.',
    );
  }
}
