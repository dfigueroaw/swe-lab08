import { RewardCalculator } from './reward-calculator';

describe('RewardCalculator', () => {
  const calculator = new RewardCalculator();

  it.each([
    [9.99, { points: 0, cashback: '0.20' }],
    [100, { points: 10, cashback: '2.00' }],
    [125.75, { points: 12, cashback: '2.52' }],
  ])('calculates rewards for %p', (amount, expected) =>
    expect(calculator.calculate(amount)).toEqual(expected),
  );

  it.each([0, -1, 1.001, Number.NaN])('rejects invalid amount %p', (amount) => {
    expect(() => calculator.calculate(amount)).toThrow();
  });
});
