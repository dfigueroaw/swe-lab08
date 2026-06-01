import { randomUUID } from 'node:crypto';
import { CustomerCardNumber } from './customer-card-number';
import { Money } from './money';
import { RestaurantCode } from './restaurant-code';

export class RestaurantTransaction {
  private constructor(
    readonly id: string,
    readonly amount: Money,
    readonly cardNumber: CustomerCardNumber,
    readonly restaurantCode: RestaurantCode,
    readonly transactionDate: Date,
    readonly createdAt: Date,
  ) {}

  static create(input: {
    amount: number;
    cardNumber: string;
    restaurantCode: string;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    return new RestaurantTransaction(
      randomUUID(),
      new Money(input.amount),
      new CustomerCardNumber(input.cardNumber),
      new RestaurantCode(input.restaurantCode),
      now,
      now,
    );
  }
}
