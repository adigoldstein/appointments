import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Exclusion,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { AppointmentStatus } from '@app/shared/types';
import { User } from '../../auth/entities/user.entity';
import { MeetingTypeEntity } from './meeting-type.entity';

/**
 * One booked meeting (ADR-0009): a row exists only once something is booked. Cancelling marks it
 * `CANCELLED`, which frees the time. Postgres rejects two `BOOKED` rows of one Provider whose
 * times overlap (exclusion constraint `EXC_appointments_no_overlap`, see the migration).
 */
@Entity({ name: 'appointments' })
@Index('IDX_appointments_provider_starts_at', ['providerId', 'startsAt'])
@Check('CHK_appointments_order', '"starts_at" < "ends_at"')
@Check('CHK_appointments_status', `"status" IN ('BOOKED', 'CANCELLED')`)
@Exclusion(
  'EXC_appointments_no_overlap',
  `USING gist ("provider_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&) WHERE ("status" = 'BOOKED')`,
)
export class AppointmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id', foreignKeyConstraintName: 'FK_appointments_provider_id' })
  provider: User;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id', foreignKeyConstraintName: 'FK_appointments_client_id' })
  client: User;

  @Column({ name: 'meeting_type_id', type: 'uuid' })
  meetingTypeId: string;

  /** NO ACTION: a meeting type that has appointments can't be deleted (it's archived instead). */
  @ManyToOne(() => MeetingTypeEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'meeting_type_id', foreignKeyConstraintName: 'FK_appointments_meeting_type_id' })
  meetingType: MeetingTypeEntity;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'varchar', length: 16, default: 'BOOKED' })
  status: AppointmentStatus;

  /** Who booked it (the real actor: the Client, the Provider or an Admin, ADR-0004). */
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
