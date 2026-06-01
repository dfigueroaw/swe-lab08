import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import amqp, { ChannelModel, ConfirmChannel } from 'amqplib';
import { IsNull, Repository } from 'typeorm';
import { OutboxMessageEntity } from '../persistence/outbox-message.entity';

@Injectable()
export class RabbitMqOutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqOutboxPublisher.name);
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(OutboxMessageEntity)
    private readonly outbox: Repository<OutboxMessageEntity>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.publishPending(), 1000);
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.channel?.close();
    await this.connection?.close();
  }

  async publishPending() {
    try {
      const channel = await this.getChannel();
      const messages = await this.outbox.find({
        where: { publishedAt: IsNull() },
        order: { createdAt: 'ASC' },
        take: 50,
      });
      for (const message of messages) {
        channel.publish(
          this.config.get('RABBITMQ_EXCHANGE', 'rewards.exchange'),
          message.eventType,
          Buffer.from(JSON.stringify(message.payload)),
          {
            contentType: 'application/json',
            persistent: true,
            messageId: message.id,
          },
        );
        await channel.waitForConfirms();
        message.publishedAt = new Date();
        await this.outbox.save(message);
      }
    } catch (error) {
      this.logger.warn(
        `Outbox publication deferred: ${(error as Error).message}`,
      );
      this.channel = undefined;
      this.connection = undefined;
    }
  }

  private async getChannel() {
    if (this.channel) return this.channel;
    this.connection = await amqp.connect(
      this.config.getOrThrow<string>('RABBITMQ_URL'),
    );
    this.channel = await this.connection.createConfirmChannel();
    await this.channel.assertExchange(
      this.config.get('RABBITMQ_EXCHANGE', 'rewards.exchange'),
      'topic',
      {
        durable: true,
      },
    );
    return this.channel;
  }
}
