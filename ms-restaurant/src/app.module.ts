import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from './adapters/out/persistence/transaction.entity';
import { OutboxMessageEntity } from './adapters/out/persistence/outbox-message.entity';
import { TypeOrmCreateTransactionGateway } from './adapters/out/persistence/typeorm-create-transaction.gateway';
import { TransactionsController } from './adapters/in/http/transactions.controller';
import { CreateTransactionUseCase } from './application/create-transaction.use-case';
import { CREATE_TRANSACTION_GATEWAY } from './application/ports/out/create-transaction.gateway';
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
        url: config.getOrThrow<string>('TRANSACTIONS_DATABASE_URL'),
        entities: [TransactionEntity, OutboxMessageEntity],
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([TransactionEntity, OutboxMessageEntity]),
  ],
  controllers: [TransactionsController],
  providers: [
    CreateTransactionUseCase,
    TypeOrmCreateTransactionGateway,
    {
      provide: CREATE_TRANSACTION_GATEWAY,
      useExisting: TypeOrmCreateTransactionGateway,
    },
    RabbitMqOutboxPublisher,
  ],
})
export class AppModule {}
