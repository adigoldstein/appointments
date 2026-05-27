import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ENV_KEYS, EnvironmentVariables } from '../../config/env.constants';
import { AuthenticatedUserPayload, JwtPayload } from '../interfaces';

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
