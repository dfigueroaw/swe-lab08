import { ProcessRewardUseCase } from './process-reward.use-case';
import { RewardCalculator } from '../domain/reward-calculator';
import type {
  ProcessRewardGateway,
  TransactionCreatedEvent,
} from './ports/out/process-reward.gateway';

describe('ProcessRewardUseCase', () => {
  it('calculates and persists a reward', async () => {
    const persist = jest.fn().mockResolvedValue('processed');
    const gateway: ProcessRewardGateway = { persist };
    const event = {
      eventId: 'event',
      correlationId: 'correlation',
      payload: {
        transactionId: 'tx',
        amount: 100,
        cardNumber: '123456789',
        restaurantCode: 'REST001',
        transactionDate: '',
      },
    } satisfies TransactionCreatedEvent;
    await expect(
      new ProcessRewardUseCase(new RewardCalculator(), gateway).execute(event),
    ).resolves.toBe('processed');
    expect(persist).toHaveBeenCalledWith(event, {
      points: 10,
      cashback: '2.00',
    });
  });
});
