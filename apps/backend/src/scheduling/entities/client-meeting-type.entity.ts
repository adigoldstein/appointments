import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { MeetingTypeEntity } from './meeting-type.entity';

/** A meeting type a Client may book themselves (ADR-0009). The Provider can always book any type. */
@Entity({ name: 'client_meeting_types' })
export class ClientMeetingTypeEntity {
  @PrimaryColumn({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Index('IDX_client_meeting_types_meeting_type_id')
  @PrimaryColumn({ name: 'meeting_type_id', type: 'uuid' })
  meetingTypeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: User;

  @ManyToOne(() => MeetingTypeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_type_id' })
  meetingType: MeetingTypeEntity;
}
