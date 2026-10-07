import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProviderSettingsResponse, Role } from '@app/shared/types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { AuthenticatedUserPayload } from '../auth/interfaces';
import { CreateProviderSettingsDto } from './dto/create-provider-settings.dto';
import { ProviderSettings } from './entities/provider-settings.entity';

@Injectable()
export class ProviderSettingsService {
  constructor(
    @InjectRepository(ProviderSettings)
    private readonly providerSettingsRepository: Repository<ProviderSettings>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Acting on behalf (ADR-0004): a Provider always works on their own settings;
   * an Admin must name the Provider they are acting for.
   */
  async resolveTargetProviderId(
    actor: AuthenticatedUserPayload,
    providerId: string | undefined,
  ): Promise<string> {
    if (actor.role === Role.PROVIDER) {
      if (providerId !== undefined && providerId !== actor.userId) {
        throw new ForbiddenException('You can only manage your own settings');
      }

      return actor.userId;
    }

    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('No permission to manage provider settings');
    }

    if (providerId === undefined) {
      throw new BadRequestException(
        'providerId is required when an admin manages provider settings',
      );
    }

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

    return providerId;
  }

  async create(
    providerId: string,
    dto: CreateProviderSettingsDto,
  ): Promise<ProviderSettingsResponse> {
    const existing = await this.providerSettingsRepository.findOne({
      where: { providerId },
    });

    if (existing) {
      throw new ConflictException('Provider settings already exist');
    }

    const saved = await this.providerSettingsRepository.save(
      this.providerSettingsRepository.create({ providerId, ...dto }),
    );

    return this.toResponse(saved);
  }

  async update(
    providerId: string,
    dto: CreateProviderSettingsDto,
  ): Promise<ProviderSettingsResponse> {
    const existing = await this.providerSettingsRepository.findOne({
      where: { providerId },
    });

    if (!existing) {
      throw new NotFoundException('Provider settings not found');
    }

    return this.toResponse(await this.providerSettingsRepository.save({ ...existing, ...dto }));
  }

  async getByProviderId(providerId: string): Promise<ProviderSettingsResponse> {
    const settings = await this.providerSettingsRepository.findOne({
      where: { providerId },
    });

    if (!settings) {
      throw new NotFoundException('Provider settings not found');
    }

    return this.toResponse(settings);
  }

  /** The shared API shape (ADR-0008): the entity minus its relation, dates as ISO strings. */
  private toResponse(settings: ProviderSettings): ProviderSettingsResponse {
    return {
      providerId: settings.providerId,
      businessName: settings.businessName,
      clientLabel: settings.clientLabel,
      cancellationWindowMinutes: settings.cancellationWindowMinutes,
      allowedDurationsMinutes: settings.allowedDurationsMinutes,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  existsForProvider(providerId: string): Promise<boolean> {
    return this.providerSettingsRepository.exists({ where: { providerId } });
  }
}
