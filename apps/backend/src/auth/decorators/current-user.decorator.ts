import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUserPayload } from '../interfaces';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUserPayload => {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUserPayload }>();
    return request.user;
  },
);
