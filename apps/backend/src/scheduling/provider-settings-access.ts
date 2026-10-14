import { NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ProviderSettings } from '../provider-settings/entities/provider-settings.entity';

/**
 * The Provider's settings row; it exists once onboarding is done, and scheduling needs it (time
 * unit, "open until"). With `lock`, the row is locked until the transaction ends: every schedule
 * write takes this lock first, so two writes for one Provider run one after the other.
 */
export async function requireSettings(
  manager: EntityManager,
  providerId: string,
  lock = false,
): Promise<ProviderSettings> {
  const settings = await manager.findOne(ProviderSettings, {
    where: { providerId },
    ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
  });

  if (!settings) {
    throw new NotFoundException('Provider settings not found; complete onboarding first');
  }

  return settings;
}
