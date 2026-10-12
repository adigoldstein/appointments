import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

/** One stretch of a weekly working day (ADR-0009). Several per day; a break is the gap between two. */
@Entity({ name: 'weekly_windows' })
export class WeeklyWindowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_weekly_windows_provider_id')
  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: User;

  /** 0 = Sunday … 6 = Saturday. */
  @Column({ type: 'smallint' })
  weekday: number;

  /** Postgres `time`, read back as `HH:MM:SS`. */
  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;
}
