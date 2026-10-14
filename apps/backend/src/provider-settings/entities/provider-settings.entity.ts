import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  CANCELLATION_WINDOW_DEFAULT_MINUTES,
  MAX_OPEN_WEEKS_DEFAULT,
  type TimeUnitMinutes,
} from '@app/shared/types';
import { User } from '../../auth/entities/user.entity';

@Entity({ name: 'provider_settings' })
@Check('CHK_provider_settings_time_unit', '"time_unit_minutes" IN (30, 60)')
@Check('CHK_provider_settings_max_open_weeks', '"max_open_weeks" BETWEEN 1 AND 52')
export class ProviderSettings {
  @PrimaryColumn({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id', foreignKeyConstraintName: 'FK_provider_settings_provider_id' })
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

  /** Last open date (`YYYY-MM-DD`): Clients can book up to it. Null until a period was opened. */
  @Column({ name: 'open_until', type: 'date', nullable: true })
  openUntil: string | null;

  /** The opening limit: how many weeks ahead the calendar may be opened. */
  @Column({ name: 'max_open_weeks', type: 'integer', default: MAX_OPEN_WEEKS_DEFAULT })
  maxOpenWeeks: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
