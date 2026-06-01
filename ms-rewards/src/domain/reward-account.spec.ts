import Decimal from 'decimal.js';
import { RewardAccount } from './reward-account';

describe('RewardAccount', () => {
  it('credits points and cashback', () => {
    const account = new RewardAccount(
      'id',
      '123456789',
      5,
      new Decimal('1.25'),
    );
    account.credit({ points: 10, cashback: '2.00' });
    expect(account.totalPoints).toBe(15);
    expect(account.totalCashback).toBe('3.25');
  });

  it.each([
    { points: -1, cashback: '0' },
    { points: 1, cashback: '-0.01' },
  ])('rejects invalid credit', (reward) =>
    expect(() =>
      new RewardAccount('id', '123456789', 0, new Decimal(0)).credit(reward),
    ).toThrow(),
  );
});
