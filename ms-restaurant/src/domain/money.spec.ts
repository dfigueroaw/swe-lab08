import { Money } from './money';

describe('Money', () => {
  it('normalizes a valid amount', () =>
    expect(new Money(100).toFixed()).toBe('100.00'));
  it.each([0, -1, 1.001, Number.NaN])('rejects invalid amount %p', (amount) => {
    expect(() => new Money(amount)).toThrow();
  });
});
