import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@app/shared/types';
import type { AuthUser, PaginatedUsersResponse, UserListItem } from '@app/shared/types';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { Brackets, IsNull, Repository } from 'typeorm';
import { ENV_KEYS, EnvironmentVariables } from '../config/env.constants';
import { ProviderSettingsService } from '../provider-settings/provider-settings.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';
import {
  getIsraelLocalitiesMap,
  getIsraelLocalityById,
} from './reference/israel-localities.loader';
import { isAccountActive } from './utils/account-status.util';
import { parseIsraeliMobile } from './utils/israeli-mobile.util';
import {
  AuthenticatedUserPayload,
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
    private readonly providerSettingsService: ProviderSettingsService,
  ) {}

  async createUser(
    createUserDto: CreateUserDto,
    actor: AuthenticatedUserPayload,
  ): Promise<AuthUser> {
    this.assertCanCreateRole(actor.role, createUserDto.role);

    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      // Only reveal the deactivated account (and its id) to someone who may reactivate it —
      // otherwise a Provider would learn about another Provider's Client (ADR-0002).
      if (
        existingUser.deactivatedAt &&
        this.canToggleDeactivation(actor, existingUser)
      ) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message: 'A deactivated account with this email already exists',
          reactivatable: true,
          existingUserId: existingUser.id,
        });
      }

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
        phone: parseIsraeliMobile(createUserDto.phone),
        cityId:
          createUserDto.cityId === undefined ? null : createUserDto.cityId,
      }),
    );

    return await this.toAuthUser(user);
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
      relations: { provider: true },
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

    if (!isAccountActive(user)) {
      throw new UnauthorizedException('Account is deactivated');
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
      user: await this.toAuthUser(user),
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const { user } = await this.validateRefreshToken(refreshToken);
    const accessToken = await this.generateAccessToken(user);

    return { accessToken, user: await this.toAuthUser(user) };
  }

  async logout(refreshToken: string): Promise<LogoutResponse> {
    const { token } = await this.validateRefreshToken(refreshToken);

    token.revokedAt = new Date();
    await this.refreshTokensRepository.save(token);

    return { message: 'Logged out successfully' };
  }

  async getProfile(actor: AuthenticatedUserPayload): Promise<AuthUser> {
    const user = await this.usersRepository.findOne({
      where: { id: actor.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return await this.toAuthUser(user);
  }

  async listUsers(
    query: ListUsersQueryDto,
    actor: AuthenticatedUserPayload,
  ): Promise<PaginatedUsersResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { role, providerId } = await this.resolveListUsersScope(query, actor);

    const usersQuery = this.usersRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role });

    if (providerId) {
      usersQuery.andWhere('user.providerId = :providerId', { providerId });
    }

    if (query.search) {
      // Escape LIKE wildcards so the search text is matched literally.
      const pattern = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;

      usersQuery.andWhere(
        new Brackets((searchQuery) => {
          searchQuery
            .where('user.firstName ILIKE :pattern', { pattern })
            .orWhere('user.lastName ILIKE :pattern')
            .orWhere("CONCAT(user.firstName, ' ', user.lastName) ILIKE :pattern")
            .orWhere('user.email ILIKE :pattern');
        }),
      );
    }

    const [users, total] = await usersQuery
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: users.map((user) => this.toUserListItem(user)),
      page,
      limit,
      total,
    };
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    actor: AuthenticatedUserPayload,
  ): Promise<AuthUser> {
    const hasUpdates =
      updateUserDto.firstName !== undefined ||
      updateUserDto.lastName !== undefined ||
      updateUserDto.email !== undefined ||
      updateUserDto.password !== undefined ||
      updateUserDto.phone !== undefined ||
      updateUserDto.cityId !== undefined ||
      updateUserDto.deactivate !== undefined;

    if (!hasUpdates) {
      throw new BadRequestException('At least one field must be provided');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertCanEditUser(actor, user);

    if (updateUserDto.deactivate !== undefined) {
      this.assertCanToggleDeactivation(actor, user);
      user.deactivatedAt = updateUserDto.deactivate ? new Date() : null;
    }

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

    if (updateUserDto.phone !== undefined) {
      user.phone = parseIsraeliMobile(updateUserDto.phone);
    }

    if (updateUserDto.cityId !== undefined) {
      user.cityId = updateUserDto.cityId;
    }

    const savedUser = await this.usersRepository.save(user);

    return await this.toAuthUser(savedUser);
  }

  /** Providers always list their own Clients; only an Admin may choose the role or Provider. */
  private async resolveListUsersScope(
    query: ListUsersQueryDto,
    actor: AuthenticatedUserPayload,
  ): Promise<{ role: Role; providerId: string | null }> {
    if (actor.role === Role.PROVIDER) {
      if (query.role !== undefined || query.providerId !== undefined) {
        throw new ForbiddenException(
          'Only an admin can filter users by role or provider',
        );
      }

      return { role: Role.CLIENT, providerId: actor.userId };
    }

    const role = query.role ?? Role.CLIENT;

    if (query.providerId === undefined) {
      return { role, providerId: null };
    }

    if (role !== Role.CLIENT) {
      throw new BadRequestException(
        'providerId can only be used when listing clients',
      );
    }

    await this.findProviderOrThrow(query.providerId);

    return { role, providerId: query.providerId };
  }

  private async findProviderOrThrow(providerId: string): Promise<User> {
    const providerUser = await this.usersRepository.findOne({
      where: { id: providerId },
    });

    if (!providerUser) {
      throw new BadRequestException('providerId does not refer to an existing user');
    }

    if (providerUser.role !== Role.PROVIDER) {
      throw new BadRequestException(
        'providerId must refer to a user with role PROVIDER',
      );
    }

    return providerUser;
  }

  private assertCanToggleDeactivation(
    actor: AuthenticatedUserPayload,
    targetUser: User,
  ): void {
    if (actor.userId === targetUser.id) {
      throw new ForbiddenException(
        'You cannot deactivate or reactivate your own account',
      );
    }

    if (!this.canToggleDeactivation(actor, targetUser)) {
      throw new ForbiddenException(
        "You cannot change this account's active status",
      );
    }
  }

  private canToggleDeactivation(
    actor: AuthenticatedUserPayload,
    targetUser: User,
  ): boolean {
    if (actor.userId === targetUser.id) {
      return false;
    }

    if (actor.role === Role.ADMIN) {
      return true;
    }

    return (
      actor.role === Role.PROVIDER &&
      targetUser.role === Role.CLIENT &&
      targetUser.providerId === actor.userId
    );
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

      await this.findProviderOrThrow(dto.providerId);

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

  private async toAuthUser(user: User): Promise<AuthUser> {
    const hasCompletedOnboarding =
      user.role === Role.PROVIDER
        ? await this.providerSettingsService.existsForProvider(user.id)
        : false;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      providerId: user.providerId ?? null,
      phone: parseIsraeliMobile(user.phone),
      city: getIsraelLocalityById(user.cityId),
      hasCompletedOnboarding,
    };
  }

  private toUserListItem(user: User): UserListItem {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: parseIsraeliMobile(user.phone),
      city: getIsraelLocalityById(user.cityId),
      deactivatedAt: user.deactivatedAt ? user.deactivatedAt.toISOString() : null,
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
      relations: { provider: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!isAccountActive(user)) {
      throw new UnauthorizedException('Account is deactivated');
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
