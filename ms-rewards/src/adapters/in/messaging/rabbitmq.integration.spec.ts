import { randomUUID } from 'node:crypto';
import amqp, { ChannelModel, ConfirmChannel } from 'amqplib';

const describeWithStack =
  process.env.RUN_STACK_INTEGRATION === 'true' ? describe : describe.skip;

describeWithStack('RabbitMQ integration', () => {
  let connection: ChannelModel;
  let channel: ConfirmChannel;
  const exchange = `rewards.integration.${randomUUID()}`;
  let queue: string;

  beforeAll(async () => {
    connection = await amqp.connect(
      process.env.RABBITMQ_URL ?? 'amqp://rewards:rewards@localhost:5672',
      { timeout: 5000 },
    );
    channel = await connection.createConfirmChannel();
    await channel.assertExchange(exchange, 'topic', { durable: false });
    ({ queue } = await channel.assertQueue('', {
      durable: false,
      exclusive: true,
      autoDelete: true,
    }));
    await channel.bindQueue(queue, exchange, 'transaction.created');
  }, 15_000);

  afterAll(async () => {
    if (channel) {
      try {
        await channel.deleteExchange(exchange);
        await channel.close();
      } catch {
        // The broker may have already closed the channel after a setup failure.
      }
    }
    if (connection) {
      try {
        await connection.close();
      } catch {
        // The broker may have already closed the connection after a setup failure.
      }
    }
  });

  it('routes transaction.created messages', async () => {
    channel.publish(
      exchange,
      'transaction.created',
      Buffer.from('{"ok":true}'),
    );
    await channel.waitForConfirms();
    const message = await channel.get(queue);
    expect(message && message.content.toString()).toBe('{"ok":true}');
    if (message) channel.ack(message);
  });
});
