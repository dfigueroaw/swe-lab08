import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('transactions')
export class TransactionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('numeric', { precision: 12, scale: 2 })
  amount!: string;

  @Column({ name: 'card_number', length: 32 })
  cardNumber!: string;

  @Column({ name: 'restaurant_code', length: 32 })
  restaurantCode!: string;

  @Column({ name: 'transaction_date', type: 'timestamptz' })
  transactionDate!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
