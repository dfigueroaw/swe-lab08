import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('outbox_messages')
export class OutboxMessageEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'event_type', length: 100 })
  eventType!: string;

  @Column('jsonb')
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ default: 0 })
  attempts!: number;
}
