/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-unsafe-return */
import { TypeOrmCreateTransactionGateway } from './typeorm-create-transaction.gateway';
import { RestaurantTransaction } from '../../../domain/restaurant-transaction';
import { OutboxMessageEntity } from './outbox-message.entity';
import { TransactionEntity } from './transaction.entity';

describe('TypeOrmCreateTransactionGateway', () => {
  it('saves the transaction and outbox event atomically', async () => {
    const save = jest.fn();
    const dataSource = { transaction: (work: Function) => work({ save }) };
    const gateway = new TypeOrmCreateTransactionGateway(dataSource as never);
    await gateway.saveWithCreatedEvent(
      RestaurantTransaction.create({
        amount: 100,
        cardNumber: '123456789',
        restaurantCode: 'REST001',
      }),
    );
    expect(save).toHaveBeenNthCalledWith(
      1,
      TransactionEntity,
      expect.objectContaining({ amount: '100.00' }),
    );
    expect(save).toHaveBeenNthCalledWith(
      2,
      OutboxMessageEntity,
      expect.objectContaining({ eventType: 'transaction.created' }),
    );
  });
});
