import { DataSource } from 'typeorm';
import { RestaurantTransaction } from '../../../domain/restaurant-transaction';
import { OutboxMessageEntity } from './outbox-message.entity';
import { TransactionEntity } from './transaction.entity';
import { TypeOrmCreateTransactionGateway } from './typeorm-create-transaction.gateway';

const describeWithStack =
  process.env.RUN_STACK_INTEGRATION === 'true' ? describe : describe.skip;

describeWithStack('TypeOrmCreateTransactionGateway integration', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url:
        process.env.TRANSACTIONS_DATABASE_URL ??
        'postgres://transactions:transactions@localhost:5432/transactions',
      entities: [TransactionEntity, OutboxMessageEntity],
      synchronize: true,
      dropSchema: true,
    });
    await dataSource.initialize();
  });

  afterAll(() => dataSource.destroy());

  it('commits the transaction and its event together', async () => {
    await new TypeOrmCreateTransactionGateway(dataSource).saveWithCreatedEvent(
      RestaurantTransaction.create({
        amount: 100,
        cardNumber: '123456789',
        restaurantCode: 'REST001',
      }),
    );
    await expect(
      dataSource.getRepository(TransactionEntity).count(),
    ).resolves.toBe(1);
    await expect(
      dataSource.getRepository(OutboxMessageEntity).count(),
    ).resolves.toBe(1);
  });
});
