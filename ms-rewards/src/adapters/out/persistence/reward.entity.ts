import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('rewards')
export class RewardEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'transaction_id', type: 'uuid', unique: true })
  transactionId!: string;

  @Column({ name: 'customer_card_number', length: 32 })
  customerCardNumber!: string;

  @Column()
  points!: number;

  @Column('numeric', { precision: 12, scale: 2 })
  cashback!: string;

  @Column({ name: 'reward_date', type: 'timestamptz' })
  rewardDate!: Date;
}
