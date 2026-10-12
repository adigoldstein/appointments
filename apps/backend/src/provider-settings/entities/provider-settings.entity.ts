import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CANCELLATION_WINDOW_DEFAULT_MINUTES, type TimeUnitMinutes } from '@app/shared/types';
import { User } from '../../auth/entities/user.entity';

@Entity({ name: 'provider_settings' })
export class ProviderSettings {
  @PrimaryColumn({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: User;

  @Column({ name: 'business_name', type: 'varchar', length: 150 })
  businessName: string;

  @Column({ name: 'client_label', type: 'varchar', length: 50 })
  clientLabel: string;

  /** Edited through `/schedule/settings`; a new Provider starts with 24 hours. */
  @Column({
    name: 'cancellation_window_minutes',
    type: 'integer',
    default: CANCELLATION_WINDOW_DEFAULT_MINUTES,
  })
  cancellationWindowMinutes: number;

  /** The scheduling grid (ADR-0009): 30 or 60. */
  @Column({ name: 'time_unit_minutes', type: 'integer', default: 60 })
  timeUnitMinutes: TimeUnitMinutes;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
