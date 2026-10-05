import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@app/shared/types';
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
  ): Promise<ProviderSettings> {
    const existing = await this.providerSettingsRepository.findOne({
      where: { providerId },
    });

    if (existing) {
      throw new ConflictException('Provider settings already exist');
    }

    return this.providerSettingsRepository.save(
      this.providerSettingsRepository.create({ providerId, ...dto }),
    );
  }

  async update(
    providerId: string,
    dto: CreateProviderSettingsDto,
  ): Promise<ProviderSettings> {
    const existing = await this.providerSettingsRepository.findOne({
      where: { providerId },
    });

    if (!existing) {
      throw new NotFoundException('Provider settings not found');
    }

    return this.providerSettingsRepository.save({ ...existing, ...dto });
  }

  async getByProviderId(providerId: string): Promise<ProviderSettings> {
    const settings = await this.providerSettingsRepository.findOne({
      where: { providerId },
    });

    if (!settings) {
      throw new NotFoundException('Provider settings not found');
    }

    return settings;
  }

  existsForProvider(providerId: string): Promise<boolean> {
    return this.providerSettingsRepository.exists({ where: { providerId } });
  }
}
