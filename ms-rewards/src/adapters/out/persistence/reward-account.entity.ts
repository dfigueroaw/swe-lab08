import { Column, Entity, PrimaryColumn, VersionColumn } from 'typeorm';

@Entity('reward_accounts')
export class RewardAccountEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'customer_card_number', unique: true, length: 32 })
  customerCardNumber!: string;

  @Column({ name: 'total_points', default: 0 })
  totalPoints!: number;

  @Column('numeric', {
    name: 'total_cashback',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalCashback!: string;

  @VersionColumn()
  version!: number;
}
