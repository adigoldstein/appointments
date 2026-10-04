import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { ENV_KEYS, EnvironmentVariables } from '../../config/env.constants';
import { User } from '../entities/user.entity';
import { AuthenticatedUserPayload, JwtPayload } from '../interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService<EnvironmentVariables, true>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>(ENV_KEYS.JWT_ACCESS_SECRET),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUserPayload> {
    const user = await this.usersRepository.findOne({ where: { id: payload.sub } });

    if (!user || user.deactivatedAt) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return {
      userId: payload.sub,
      role: payload.role,
    };
  }
}
