import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProviderSettingsDto } from './dto/create-provider-settings.dto';
import { ProviderSettings } from './entities/provider-settings.entity';

@Injectable()
export class ProviderSettingsService {
  constructor(
    @InjectRepository(ProviderSettings)
    private readonly providerSettingsRepository: Repository<ProviderSettings>,
  ) {}

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
