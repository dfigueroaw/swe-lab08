/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-unsafe-return */
import { TypeOrmProcessRewardGateway } from './typeorm-process-reward.gateway';
import { InboxMessageEntity } from './inbox-message.entity';
import { RewardAccountEntity } from './reward-account.entity';
import { RewardEntity } from './reward.entity';
import { OutboxMessageEntity } from './outbox-message.entity';

const event = {
  eventId: 'b6871eb9-600a-49ba-a9e2-12718d6a1f2d',
  correlationId: 'b9b121d4-aa6e-4890-9ea7-bd6351a00a4d',
  payload: {
    transactionId: '22dc8824-44bc-450b-901d-3beff228035e',
    amount: 100,
    cardNumber: '123456789',
    restaurantCode: 'REST001',
    transactionDate: '2026-05-01T10:00:00Z',
  },
};

describe('TypeOrmProcessRewardGateway', () => {
  it('does not process a duplicate inbox event', async () => {
    const manager = { existsBy: jest.fn().mockResolvedValue(true) };
    const gateway = new TypeOrmProcessRewardGateway({
      transaction: (work: Function) => work(manager),
    } as never);
    await expect(
      gateway.persist(event, { points: 10, cashback: '2.00' }),
    ).resolves.toBe('duplicate');
  });

  it('updates an existing account and writes reward, inbox, and outbox', async () => {
    const manager = {
      existsBy: jest.fn().mockResolvedValue(false),
      findOne: jest.fn().mockResolvedValue({
        id: '8c018a19-97d8-41e5-8205-4bc800e4d233',
        customerCardNumber: '123456789',
        totalPoints: 1,
        totalCashback: '0.50',
      }),
      save: jest.fn(),
    };
    const gateway = new TypeOrmProcessRewardGateway({
      transaction: (work: Function) => work(manager),
    } as never);
    await expect(
      gateway.persist(event, { points: 10, cashback: '2.00' }),
    ).resolves.toBe('processed');
    expect(manager.save).toHaveBeenCalledWith(
      RewardAccountEntity,
      expect.objectContaining({ totalPoints: 11, totalCashback: '2.50' }),
    );
    expect(manager.save).toHaveBeenCalledWith(RewardEntity, expect.anything());
    expect(manager.save).toHaveBeenCalledWith(InboxMessageEntity, {
      eventId: event.eventId,
    });
    expect(manager.save).toHaveBeenCalledWith(
      OutboxMessageEntity,
      expect.anything(),
    );
  });
});
