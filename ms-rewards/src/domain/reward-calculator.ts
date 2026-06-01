import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

export interface CalculatedReward {
  points: number;
  cashback: string;
}

@Injectable()
export class RewardCalculator {
  calculate(amount: number): CalculatedReward {
    const consumed = new Decimal(amount);
    if (
      !consumed.isFinite() ||
      consumed.lte(0) ||
      consumed.decimalPlaces() > 2
    ) {
      throw new Error(
        'Amount must be a positive value with at most two decimal places',
      );
    }
    return {
      points: consumed.div(10).floor().toNumber(),
      cashback: consumed
        .mul(0.02)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toFixed(2),
    };
  }
}
