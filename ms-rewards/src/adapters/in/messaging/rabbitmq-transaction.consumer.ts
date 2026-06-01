import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { ProcessRewardUseCase } from '../../../application/process-reward.use-case';
import { TransactionCreatedEvent } from '../../../application/ports/out/process-reward.gateway';

@Injectable()
export class RabbitMqTransactionConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMqTransactionConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(
    private readonly useCase: ProcessRewardUseCase,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    void this.connect();
  }

  async onModuleDestroy() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.channel?.close();
    await this.connection?.close();
  }

  private async connect() {
    try {
      this.connection = await amqp.connect(
        this.config.getOrThrow<string>('RABBITMQ_URL'),
      );
      this.channel = await this.connection.createChannel();
      const exchange = this.config.get<string>(
        'RABBITMQ_EXCHANGE',
        'rewards.exchange',
      );
      const queue = this.config.get<string>(
        'TRANSACTION_QUEUE',
        'transaction.created.queue',
      );
      const deadLetterExchange = `${exchange}.dlx`;
      const deadLetterQueue = `${queue}.dlq`;
      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      await this.channel.assertExchange(deadLetterExchange, 'topic', {
        durable: true,
      });
      await this.channel.assertQueue(deadLetterQueue, { durable: true });
      await this.channel.bindQueue(
        deadLetterQueue,
        deadLetterExchange,
        'transaction.created',
      );
      await this.channel.assertQueue(queue, {
        durable: true,
        deadLetterExchange,
        deadLetterRoutingKey: 'transaction.created',
      });
      await this.channel.bindQueue(queue, exchange, 'transaction.created');
      await this.channel.prefetch(20);
      await this.channel.consume(
        queue,
        (message) => void this.handle(message),
        { noAck: false },
      );
    } catch (error) {
      this.logger.warn(
        `RabbitMQ consumer connection deferred: ${(error as Error).message}`,
      );
      this.reconnectTimer = setTimeout(() => void this.connect(), 5000);
    }
  }

  private async handle(message: ConsumeMessage | null) {
    if (!message || !this.channel) return;
    try {
      const event = this.parse(message.content);
      await this.useCase.execute(event);
      this.channel.ack(message);
    } catch (error) {
      this.logger.error(
        `Message processing failed: ${(error as Error).message}`,
      );
      this.channel.nack(message, false, false);
    }
  }

  private parse(content: Buffer): TransactionCreatedEvent {
    const event = JSON.parse(content.toString()) as TransactionCreatedEvent & {
      eventType?: string;
      eventVersion?: number;
    };
    if (
      event.eventType !== 'transaction.created' ||
      event.eventVersion !== 1 ||
      !event.eventId ||
      !event.correlationId ||
      !event.payload?.transactionId ||
      typeof event.payload.amount !== 'number' ||
      !/^\d{9,32}$/.test(event.payload.cardNumber)
    ) {
      throw new Error('Invalid transaction.created event');
    }
    return event;
  }
}
