import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardEntity } from './adapters/out/persistence/reward.entity';
import { RewardAccountEntity } from './adapters/out/persistence/reward-account.entity';
import { InboxMessageEntity } from './adapters/out/persistence/inbox-message.entity';
import { OutboxMessageEntity } from './adapters/out/persistence/outbox-message.entity';
import { TypeOrmProcessRewardGateway } from './adapters/out/persistence/typeorm-process-reward.gateway';
import { PROCESS_REWARD_GATEWAY } from './application/ports/out/process-reward.gateway';
import { ProcessRewardUseCase } from './application/process-reward.use-case';
import { RewardCalculator } from './domain/reward-calculator';
import { RabbitMqTransactionConsumer } from './adapters/in/messaging/rabbitmq-transaction.consumer';
import { RabbitMqOutboxPublisher } from './adapters/out/messaging/rabbitmq-outbox.publisher';
import { validateEnvironment } from './infrastructure/config/environment';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('REWARDS_DATABASE_URL'),
        entities: [
          RewardEntity,
          RewardAccountEntity,
          InboxMessageEntity,
          OutboxMessageEntity,
        ],
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([
      RewardEntity,
      RewardAccountEntity,
      InboxMessageEntity,
      OutboxMessageEntity,
    ]),
  ],
  providers: [
    RewardCalculator,
    ProcessRewardUseCase,
    TypeOrmProcessRewardGateway,
    {
      provide: PROCESS_REWARD_GATEWAY,
      useExisting: TypeOrmProcessRewardGateway,
    },
    RabbitMqTransactionConsumer,
    RabbitMqOutboxPublisher,
  ],
})
export class AppModule {}
