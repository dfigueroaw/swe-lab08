/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { RabbitMqTransactionConsumer } from './rabbitmq-transaction.consumer';
import amqp from 'amqplib';

const validEvent = {
  eventId: 'event',
  eventType: 'transaction.created',
  eventVersion: 1,
  correlationId: 'correlation',
  payload: {
    transactionId: 'transaction',
    amount: 100,
    cardNumber: '123456789',
    restaurantCode: 'REST001',
    transactionDate: '2026-05-01T10:00:00Z',
  },
};

describe('RabbitMqTransactionConsumer', () => {
  afterEach(() => jest.restoreAllMocks());

  it('acknowledges a processed valid event', async () => {
    const useCase = { execute: jest.fn() };
    const consumer = new RabbitMqTransactionConsumer(
      useCase as never,
      {} as never,
    );
    const channel = { ack: jest.fn(), nack: jest.fn() };
    (consumer as any).channel = channel;
    await (consumer as any).handle({
      content: Buffer.from(JSON.stringify(validEvent)),
    });
    expect(useCase.execute).toHaveBeenCalledWith(validEvent);
    expect(channel.ack).toHaveBeenCalled();
  });

  it('dead-letters an invalid event', async () => {
    const consumer = new RabbitMqTransactionConsumer({} as never, {} as never);
    const channel = { ack: jest.fn(), nack: jest.fn() };
    (consumer as any).channel = channel;
    await (consumer as any).handle({ content: Buffer.from('{}') });
    expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
  });

  it('declares topology and begins consuming', async () => {
    const channel = {
      assertExchange: jest.fn(),
      assertQueue: jest.fn(),
      bindQueue: jest.fn(),
      prefetch: jest.fn(),
      consume: jest.fn(),
      close: jest.fn(),
    };
    const connection = {
      createChannel: jest.fn().mockResolvedValue(channel),
      close: jest.fn(),
    };
    jest.spyOn(amqp, 'connect').mockResolvedValue(connection as never);
    const consumer = new RabbitMqTransactionConsumer(
      {} as never,
      {
        get: (_: string, fallback: string) => fallback,
        getOrThrow: () => 'amqp://localhost:5672',
      } as never,
    );
    await (consumer as any).connect();
    await consumer.onModuleDestroy();
    expect(channel.assertQueue).toHaveBeenCalledWith(
      'transaction.created.queue.dlq',
      { durable: true },
    );
    expect(channel.consume).toHaveBeenCalled();
    expect(channel.close).toHaveBeenCalled();
  });

  it('schedules reconnect when RabbitMQ is offline', async () => {
    jest.useFakeTimers();
    jest.spyOn(amqp, 'connect').mockRejectedValue(new Error('offline'));
    const consumer = new RabbitMqTransactionConsumer(
      {} as never,
      {
        get: (_: string, fallback: string) => fallback,
        getOrThrow: () => 'amqp://localhost:5672',
      } as never,
    );
    await (consumer as any).connect();
    await consumer.onModuleDestroy();
    expect(amqp.connect).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('ignores empty deliveries', async () => {
    const consumer = new RabbitMqTransactionConsumer({} as never, {} as never);
    await expect((consumer as any).handle(null)).resolves.toBeUndefined();
  });
});
