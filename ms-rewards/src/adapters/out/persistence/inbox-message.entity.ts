import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('inbox_messages')
export class InboxMessageEntity {
  @PrimaryColumn('uuid', { name: 'event_id' })
  eventId!: string;

  @CreateDateColumn({ name: 'processed_at', type: 'timestamptz' })
  processedAt!: Date;
}
