import Decimal from 'decimal.js';

export class RewardAccount {
  constructor(
    readonly id: string,
    readonly customerCardNumber: string,
    private points: number,
    private cashback: Decimal,
  ) {}

  credit(reward: { points: number; cashback: string }) {
    if (reward.points < 0 || !Number.isInteger(reward.points))
      throw new Error('Points must be non-negative');
    const cashback = new Decimal(reward.cashback);
    if (cashback.lt(0)) throw new Error('Cashback must be non-negative');
    this.points += reward.points;
    this.cashback = this.cashback.plus(cashback);
  }

  get totalPoints() {
    return this.points;
  }

  get totalCashback() {
    return this.cashback.toFixed(2);
  }
}
