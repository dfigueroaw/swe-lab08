import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { CreateTransactionGateway } from '../../../application/ports/out/create-transaction.gateway';
import { RestaurantTransaction } from '../../../domain/restaurant-transaction';
import { OutboxMessageEntity } from './outbox-message.entity';
import { TransactionEntity } from './transaction.entity';

@Injectable()
export class TypeOrmCreateTransactionGateway implements CreateTransactionGateway {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async saveWithCreatedEvent(
    transaction: RestaurantTransaction,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.save(TransactionEntity, {
        id: transaction.id,
        amount: transaction.amount.toFixed(),
        cardNumber: transaction.cardNumber.value,
        restaurantCode: transaction.restaurantCode.value,
        transactionDate: transaction.transactionDate,
        createdAt: transaction.createdAt,
      });
      await manager.save(OutboxMessageEntity, {
        id: randomUUID(),
        eventType: 'transaction.created',
        payload: {
          eventId: randomUUID(),
          eventType: 'transaction.created',
          eventVersion: 1,
          occurredAt: transaction.createdAt.toISOString(),
          correlationId: transaction.id,
          payload: {
            transactionId: transaction.id,
            amount: transaction.amount.toNumber(),
            cardNumber: transaction.cardNumber.value,
            restaurantCode: transaction.restaurantCode.value,
            transactionDate: transaction.transactionDate.toISOString(),
          },
        },
      });
    });
  }
}
