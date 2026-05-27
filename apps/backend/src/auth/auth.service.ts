import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@app/shared/types';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { IsNull, Repository } from 'typeorm';
import { ENV_KEYS, EnvironmentVariables } from '../config/env.constants';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';
import {
  AuthenticatedUserPayload,
  AuthUserResponse,
  JwtPayload,
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
} from './interfaces';

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

  async createUser(
    createUserDto: CreateUserDto,
    actor: AuthenticatedUserPayload,
  ): Promise<AuthUserResponse> {
    this.assertCanCreateRole(actor.role, createUserDto.role);

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

    const providerId = await this.resolveProviderIdForCreateUser(
      createUserDto,
      actor,
    );

    const user = await this.usersRepository.save(
      this.usersRepository.create({
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        passwordHash,
        role: createUserDto.role,
        providerId,
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

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const { user } = await this.validateRefreshToken(refreshToken);
    const accessToken = await this.generateAccessToken(user);

    return { accessToken };
  }

  async logout(refreshToken: string): Promise<LogoutResponse> {
    const { token } = await this.validateRefreshToken(refreshToken);

    token.revokedAt = new Date();
    await this.refreshTokensRepository.save(token);

    return { message: 'Logged out successfully' };
  }

  async getProfile(actor: AuthenticatedUserPayload): Promise<AuthUserResponse> {
    const user = await this.usersRepository.findOne({
      where: { id: actor.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toAuthUserResponse(user);
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    actor: AuthenticatedUserPayload,
  ): Promise<AuthUserResponse> {
    const hasUpdates =
      updateUserDto.firstName !== undefined ||
      updateUserDto.lastName !== undefined ||
      updateUserDto.email !== undefined ||
      updateUserDto.password !== undefined;

    if (!hasUpdates) {
      throw new BadRequestException('At least one field must be provided');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertCanEditUser(actor, user);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      user.email = updateUserDto.email;
    }

    if (updateUserDto.firstName !== undefined) {
      user.firstName = updateUserDto.firstName;
    }

    if (updateUserDto.lastName !== undefined) {
      user.lastName = updateUserDto.lastName;
    }

    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(
        updateUserDto.password,
        this.configService.getOrThrow<number>(ENV_KEYS.BCRYPT_SALT_ROUNDS),
      );
    }

    const savedUser = await this.usersRepository.save(user);

    return this.toAuthUserResponse(savedUser);
  }

  async deleteUser(
    userId: string,
    actor: AuthenticatedUserPayload,
  ): Promise<void> {
    if (actor.userId === userId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertCanDeleteUser(actor, user);

    await this.usersRepository.remove(user);
  }

  private assertCanEditUser(
    actor: AuthenticatedUserPayload,
    targetUser: User,
  ): void {
    if (actor.role === Role.ADMIN) {
      return;
    }

    if (actor.role === Role.CLIENT) {
      if (actor.userId !== targetUser.id) {
        throw new ForbiddenException('You can only edit your own profile');
      }
      return;
    }

    // if actor is a provider, they can only edit their own profile or their clients
    if (actor.role === Role.PROVIDER) {
      if (actor.userId === targetUser.id) {
        return;
      }

      if (
        targetUser.role === Role.CLIENT &&
        targetUser.providerId === actor.userId
      ) {
        return;
      }

      throw new ForbiddenException(
        'You can only edit your own profile or your clients',
      );
    }

    throw new ForbiddenException('No permission to edit this user');
  }

  private assertCanDeleteUser(
    actor: AuthenticatedUserPayload,
    targetUser: User,
  ): void {
    if (actor.role === Role.ADMIN) {
      return;
    }

    if (actor.role === Role.PROVIDER) {
      if (
        targetUser.role === Role.CLIENT &&
        targetUser.providerId === actor.userId
      ) {
        return;
      }

      throw new ForbiddenException(
        'You can only delete clients assigned to you',
      );
    }

    throw new ForbiddenException('No permission to delete this user');
  }

  private async resolveProviderIdForCreateUser(
    dto: CreateUserDto,
    actor: AuthenticatedUserPayload,
  ): Promise<string | null> {

    // if creating an admin or provider, we don't need to pass a providerId
    if (dto.role === Role.ADMIN || dto.role === Role.PROVIDER) {
      if (dto.providerId !== undefined && dto.providerId !== null) {
        throw new BadRequestException(
          'providerId must not be set for admin or provider accounts',
        );
      }
      return null;
    }

    if (dto.role !== Role.CLIENT) {
      return null;
    }

    // if creating a client as a provider, we need to pass a providerId, otherwise it will be set from the provider's account
    if (actor.role === Role.PROVIDER) {
      if (dto.providerId !== undefined && dto.providerId !== null) {
        throw new BadRequestException(
          'Do not send providerId when creating a client as a provider; it is set from your account',
        );
      }
      return actor.userId;
    }

    // if creating a client as an admin, we must pass a providerId, otherwise it will be set from the admin's account
    if (actor.role === Role.ADMIN) {
      if (
        dto.providerId === undefined ||
        dto.providerId === null ||
        dto.providerId.trim() === ''
      ) {
        throw new BadRequestException(
          'providerId is required when an admin creates a client',
        );
      }

      const providerUser = await this.usersRepository.findOne({
        where: { id: dto.providerId },
      });

      if (!providerUser) {
        throw new BadRequestException('providerId does not refer to an existing user');
      }

      // if the providerId does not refer to a user with role PROVIDER, we throw an error
      if (providerUser.role !== Role.PROVIDER) {
        throw new BadRequestException(
          'providerId must refer to a user with role PROVIDER',
        );
      }

      return dto.providerId;
    }

    return null;
  }

  private assertCanCreateRole(actorRole: Role, targetRole: Role): void {
    if (actorRole === Role.ADMIN) {
      return;
    }

    if (actorRole === Role.PROVIDER && targetRole === Role.CLIENT) {
      return;
    }

    throw new ForbiddenException('You cannot create a user with this role');
  }

  private toAuthUserResponse(user: User): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      providerId: user.providerId ?? null,
    };
  }

  private async validateRefreshToken(
    refreshToken: string,
  ): Promise<{ user: User; token: RefreshToken }> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>(
          ENV_KEYS.JWT_REFRESH_SECRET,
        ),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const now = new Date();
    const activeTokens = await this.refreshTokensRepository.find({
      where: {
        user: { id: user.id },
        revokedAt: IsNull(),
      },
    });

    for (const storedToken of activeTokens) {
      if (storedToken.expiresAt <= now) {
        continue;
      }

      const isMatch = await bcrypt.compare(refreshToken, storedToken.tokenHash);

      if (isMatch) {
        return { user, token: storedToken };
      }
    }

    throw new UnauthorizedException('Invalid refresh token');
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
