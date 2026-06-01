import { RestaurantTransaction } from '../../../domain/restaurant-transaction';

export const CREATE_TRANSACTION_GATEWAY = Symbol('CREATE_TRANSACTION_GATEWAY');

export interface CreateTransactionGateway {
  saveWithCreatedEvent(transaction: RestaurantTransaction): Promise<void>;
}
