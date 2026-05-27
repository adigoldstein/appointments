import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Role } from '@app/shared/types';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ENV_KEYS, EnvironmentVariables } from '../../config/env.constants';

export interface JwtPayload {
  sub: string;
  role: Role;
}

export interface AuthenticatedUserPayload {
  userId: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>(ENV_KEYS.JWT_ACCESS_SECRET),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUserPayload {
    return {
      userId: payload.sub,
      role: payload.role,
    };
  }
}
