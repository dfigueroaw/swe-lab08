import Decimal from 'decimal.js';

export class Money {
  private readonly value: Decimal;

  constructor(value: Decimal.Value) {
    this.value = new Decimal(value);
    if (
      !this.value.isFinite() ||
      this.value.lte(0) ||
      this.value.decimalPlaces() > 2
    ) {
      throw new Error(
        'Amount must be a positive value with at most two decimal places',
      );
    }
  }

  toFixed(): string {
    return this.value.toFixed(2);
  }

  toNumber(): number {
    return this.value.toNumber();
  }
}
