import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

/** A kind of meeting a Provider offers (ADR-0009). Archived, never deleted, once it has appointments. */
@Entity({ name: 'meeting_types' })
export class MeetingTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_meeting_types_provider_id')
  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: User;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  /** A multiple of the Provider's time unit. */
  @Column({ name: 'length_minutes', type: 'integer' })
  lengthMinutes: number;

  @Column({ name: 'default_for_clients', type: 'boolean' })
  defaultForClients: boolean;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
