import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

/** A one-off window on one date (ADR-0009); never overlaps or touches that date's weekly windows. */
@Entity({ name: 'extra_windows' })
@Index('IDX_extra_windows_provider_date', ['providerId', 'date'])
@Check('CHK_extra_windows_order', '"start_time" < "end_time"')
export class ExtraWindowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id', foreignKeyConstraintName: 'FK_extra_windows_provider_id' })
  provider: User;

  /** Postgres `date`, read back as `YYYY-MM-DD`. */
  @Column({ type: 'date' })
  date: string;

  /** Postgres `time`, read back as `HH:MM:SS`. */
  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;
}
