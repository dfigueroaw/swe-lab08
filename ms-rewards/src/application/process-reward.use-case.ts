import { Inject, Injectable } from '@nestjs/common';
import { RewardCalculator } from '../domain/reward-calculator';
import { PROCESS_REWARD_GATEWAY } from './ports/out/process-reward.gateway';
import type {
  ProcessRewardGateway,
  TransactionCreatedEvent,
} from './ports/out/process-reward.gateway';

@Injectable()
export class ProcessRewardUseCase {
  constructor(
    private readonly calculator: RewardCalculator,
    @Inject(PROCESS_REWARD_GATEWAY)
    private readonly gateway: ProcessRewardGateway,
  ) {}

  execute(event: TransactionCreatedEvent) {
    return this.gateway.persist(
      event,
      this.calculator.calculate(event.payload.amount),
    );
  }
}
