import { Inject, Injectable } from '@nestjs/common';
import { RestaurantTransaction } from '../domain/restaurant-transaction';
import { CREATE_TRANSACTION_GATEWAY } from './ports/out/create-transaction.gateway';
import type { CreateTransactionGateway } from './ports/out/create-transaction.gateway';

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(CREATE_TRANSACTION_GATEWAY)
    private readonly gateway: CreateTransactionGateway,
  ) {}

  async execute(input: {
    amount: number;
    cardNumber: string;
    restaurantCode: string;
  }) {
    const transaction = RestaurantTransaction.create(input);
    await this.gateway.saveWithCreatedEvent(transaction);
    return { transactionId: transaction.id };
  }
}
