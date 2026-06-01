import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { InboxMessageEntity } from './inbox-message.entity';
import { OutboxMessageEntity } from './outbox-message.entity';
import { RewardAccountEntity } from './reward-account.entity';
import { RewardEntity } from './reward.entity';
import { TypeOrmProcessRewardGateway } from './typeorm-process-reward.gateway';

const describeWithStack =
  process.env.RUN_STACK_INTEGRATION === 'true' ? describe : describe.skip;

describeWithStack('TypeOrmProcessRewardGateway integration', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url:
        process.env.REWARDS_DATABASE_URL ??
        'postgres://rewards:rewards@localhost:5433/rewards',
      entities: [
        RewardEntity,
        RewardAccountEntity,
        InboxMessageEntity,
        OutboxMessageEntity,
      ],
      synchronize: true,
      dropSchema: true,
    });
    await dataSource.initialize();
  });

  afterAll(() => dataSource.destroy());

  it('credits an event once under duplicate delivery', async () => {
    const gateway = new TypeOrmProcessRewardGateway(dataSource);
    const event = {
      eventId: randomUUID(),
      correlationId: randomUUID(),
      payload: {
        transactionId: randomUUID(),
        amount: 100,
        cardNumber: '123456789',
        restaurantCode: 'REST001',
        transactionDate: new Date().toISOString(),
      },
    };
    await expect(
      gateway.persist(event, { points: 10, cashback: '2.00' }),
    ).resolves.toBe('processed');
    await expect(
      gateway.persist(event, { points: 10, cashback: '2.00' }),
    ).resolves.toBe('duplicate');
    await expect(dataSource.getRepository(RewardEntity).count()).resolves.toBe(
      1,
    );
  });
});
