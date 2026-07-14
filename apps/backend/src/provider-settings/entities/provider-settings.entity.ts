import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
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

  @Column({ name: 'cancellation_window_minutes', type: 'integer' })
  cancellationWindowMinutes: number;

  @Column({ name: 'allowed_durations_minutes', type: 'integer', array: true })
  allowedDurationsMinutes: number[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
