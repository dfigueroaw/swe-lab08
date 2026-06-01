/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { RabbitMqOutboxPublisher } from './rabbitmq-outbox.publisher';
import amqp from 'amqplib';

describe('RabbitMqOutboxPublisher', () => {
  afterEach(() => jest.restoreAllMocks());

  it('publishes pending outbox messages and marks them published', async () => {
    const message = {
      id: 'id',
      eventType: 'transaction.created',
      payload: { value: 1 },
      publishedAt: null,
    };
    const repository = {
      find: jest.fn().mockResolvedValue([message]),
      save: jest.fn(),
    };
    const channel = { publish: jest.fn(), waitForConfirms: jest.fn() };
    const publisher = new RabbitMqOutboxPublisher(
      repository as never,
      { get: (_: string, fallback: string) => fallback } as never,
    );
    jest.spyOn(publisher as never, 'getChannel').mockResolvedValue(channel);
    await publisher.publishPending();
    expect(channel.publish).toHaveBeenCalled();
    expect(message.publishedAt).toBeInstanceOf(Date);
    expect(repository.save).toHaveBeenCalledWith(message);
  });

  it('defers publication failures without throwing', async () => {
    const publisher = new RabbitMqOutboxPublisher({} as never, {} as never);
    jest
      .spyOn(publisher as never, 'getChannel')
      .mockRejectedValue(new Error('offline'));
    await expect(publisher.publishPending()).resolves.toBeUndefined();
  });

  it('creates, caches, and closes a confirm channel', async () => {
    const channel = { assertExchange: jest.fn(), close: jest.fn() };
    const connection = {
      createConfirmChannel: jest.fn().mockResolvedValue(channel),
      close: jest.fn(),
    };
    jest.spyOn(amqp, 'connect').mockResolvedValue(connection as never);
    const publisher = new RabbitMqOutboxPublisher(
      {} as never,
      {
        get: (_: string, fallback: string) => fallback,
        getOrThrow: () => 'amqp://localhost:5672',
      } as never,
    );
    await expect((publisher as any).getChannel()).resolves.toBe(channel);
    await expect((publisher as any).getChannel()).resolves.toBe(channel);
    publisher.onModuleInit();
    await publisher.onModuleDestroy();
    expect(connection.createConfirmChannel).toHaveBeenCalledTimes(1);
    expect(channel.assertExchange).toHaveBeenCalled();
    expect(channel.close).toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalled();
  });
});
