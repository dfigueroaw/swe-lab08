import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import { DataSource } from 'typeorm';
import {
  ProcessRewardGateway,
  TransactionCreatedEvent,
} from '../../../application/ports/out/process-reward.gateway';
import { CalculatedReward } from '../../../domain/reward-calculator';
import { RewardAccount } from '../../../domain/reward-account';
import { InboxMessageEntity } from './inbox-message.entity';
import { OutboxMessageEntity } from './outbox-message.entity';
import { RewardAccountEntity } from './reward-account.entity';
import { RewardEntity } from './reward.entity';

@Injectable()
export class TypeOrmProcessRewardGateway implements ProcessRewardGateway {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async persist(event: TransactionCreatedEvent, reward: CalculatedReward) {
    return this.dataSource.transaction(
      async (manager): Promise<'processed' | 'duplicate'> => {
        if (
          await manager.existsBy(InboxMessageEntity, { eventId: event.eventId })
        )
          return 'duplicate';

        const stored = await manager.findOne(RewardAccountEntity, {
          where: { customerCardNumber: event.payload.cardNumber },
          lock: { mode: 'pessimistic_write' },
        });
        const account = stored
          ? new RewardAccount(
              stored.id,
              stored.customerCardNumber,
              stored.totalPoints,
              new Decimal(stored.totalCashback),
            )
          : new RewardAccount(
              randomUUID(),
              event.payload.cardNumber,
              0,
              new Decimal(0),
            );
        account.credit(reward);

        await manager.save(RewardAccountEntity, {
          id: account.id,
          customerCardNumber: account.customerCardNumber,
          totalPoints: account.totalPoints,
          totalCashback: account.totalCashback,
        });
        const rewardId = randomUUID();
        const processedAt = new Date();
        await manager.save(RewardEntity, {
          id: rewardId,
          transactionId: event.payload.transactionId,
          customerCardNumber: account.customerCardNumber,
          points: reward.points,
          cashback: reward.cashback,
          rewardDate: processedAt,
        });
        await manager.save(InboxMessageEntity, { eventId: event.eventId });
        await manager.save(OutboxMessageEntity, {
          id: randomUUID(),
          eventType: 'reward.processed',
          payload: {
            eventId: randomUUID(),
            eventType: 'reward.processed',
            eventVersion: 1,
            occurredAt: processedAt.toISOString(),
            correlationId: event.correlationId,
            payload: {
              rewardId,
              cardNumber: account.customerCardNumber,
              points: reward.points,
              cashback: Number(reward.cashback),
              processedAt: processedAt.toISOString(),
            },
          },
        });
        return 'processed';
      },
    );
  }
}
