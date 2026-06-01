import { CalculatedReward } from '../../../domain/reward-calculator';

export const PROCESS_REWARD_GATEWAY = Symbol('PROCESS_REWARD_GATEWAY');

export interface TransactionCreatedEvent {
  eventId: string;
  correlationId: string;
  payload: {
    transactionId: string;
    amount: number;
    cardNumber: string;
    restaurantCode: string;
    transactionDate: string;
  };
}

export interface ProcessRewardGateway {
  persist(
    event: TransactionCreatedEvent,
    reward: CalculatedReward,
  ): Promise<'processed' | 'duplicate'>;
}
