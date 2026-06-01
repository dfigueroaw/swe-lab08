import { RestaurantTransaction } from './restaurant-transaction';

describe('RestaurantTransaction', () => {
  it('creates a valid transaction', () => {
    const now = new Date('2026-05-01T10:00:00Z');
    const transaction = RestaurantTransaction.create({
      amount: 100,
      cardNumber: '123456789',
      restaurantCode: 'REST001',
      now,
    });
    expect(transaction.amount.toFixed()).toBe('100.00');
    expect(transaction.cardNumber.value).toBe('123456789');
    expect(transaction.transactionDate).toBe(now);
  });

  it.each([
    { amount: 10, cardNumber: 'bad', restaurantCode: 'REST001' },
    { amount: 10, cardNumber: '123456789', restaurantCode: 'lowercase' },
  ])('rejects invalid input', (input) =>
    expect(() => RestaurantTransaction.create(input)).toThrow(),
  );
});
