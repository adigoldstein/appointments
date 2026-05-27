import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { Repository } from 'typeorm';
import { ENV_KEYS, EnvironmentVariables } from '../config/env.constants';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';
import { AuthUserResponse, LoginResponse } from './interfaces';
import { JwtPayload } from './strategies/jwt.strategy';

const DURATION_UNIT_IN_MS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
  y: 365 * 24 * 60 * 60 * 1000,
} as const;

type DurationUnit = keyof typeof DURATION_UNIT_IN_MS;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<AuthUserResponse> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(
      createUserDto.password,
      this.configService.getOrThrow<number>(ENV_KEYS.BCRYPT_SALT_ROUNDS),
    );
    const user = await this.usersRepository.save(
      this.usersRepository.create({
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        passwordHash,
        role: createUserDto.role,
      }),
    );

    return this.toAuthUserResponse(user);
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    const tokenHash = await bcrypt.hash(
      refreshToken,
      this.configService.getOrThrow<number>(ENV_KEYS.BCRYPT_SALT_ROUNDS),
    );

    await this.refreshTokensRepository.save(
      this.refreshTokensRepository.create({
        tokenHash,
        expiresAt: this.getRefreshTokenExpiresAt(),
        revokedAt: null,
        user,
      }),
    );

    return {
      accessToken,
      refreshToken,
      user: this.toAuthUserResponse(user),
    };
  }

  private toAuthUserResponse(user: User): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  private generateAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }

  private generateRefreshToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>(
        ENV_KEYS.JWT_REFRESH_SECRET,
      ),
      expiresIn: this.configService.getOrThrow<StringValue>(
        ENV_KEYS.JWT_REFRESH_EXPIRES_IN,
      ),
    });
  }

  private getRefreshTokenExpiresAt(): Date {
    const expiresIn = this.configService.getOrThrow<StringValue>(
      ENV_KEYS.JWT_REFRESH_EXPIRES_IN,
    );
    const match = /^(?<amount>\d+)(?<unit>ms|s|m|h|d|w|y)$/.exec(expiresIn);

    if (!match?.groups) {
      throw new Error(
        `${ENV_KEYS.JWT_REFRESH_EXPIRES_IN} must use a value like 7d, 12h, 30m, or 60s`,
      );
    }

    const amount = Number(match.groups.amount);
    const unit = match.groups.unit as DurationUnit;

    return new Date(Date.now() + amount * DURATION_UNIT_IN_MS[unit]);
  }
}
