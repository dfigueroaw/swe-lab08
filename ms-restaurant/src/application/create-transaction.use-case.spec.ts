import { CreateTransactionUseCase } from './create-transaction.use-case';
import type { CreateTransactionGateway } from './ports/out/create-transaction.gateway';

describe('CreateTransactionUseCase', () => {
  it('persists a valid transaction and returns its id', async () => {
    const saveWithCreatedEvent = jest.fn();
    const gateway: CreateTransactionGateway = { saveWithCreatedEvent };
    const result = await new CreateTransactionUseCase(gateway).execute({
      amount: 100,
      cardNumber: '123456789',
      restaurantCode: 'REST001',
    });
    expect(result.transactionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(saveWithCreatedEvent).toHaveBeenCalledTimes(1);
  });
});
